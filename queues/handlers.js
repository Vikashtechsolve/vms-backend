import Campaign from '../models/Campaign.js'
import CampaignRecipient from '../models/CampaignRecipient.js'
import EmailLayout from '../models/EmailLayout.js'
import Trainer from '../models/Trainer.js'
import { getChannel } from '../services/messaging/channelRegistry.js'
import { enqueueBatchJob } from './producers.js'
import { finalizeCampaignIfDone } from '../services/messaging/campaignService.js'

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function handleStartCampaign(job) {
  const { campaignId } = job.data
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return
  if (campaign.status === 'cancelled') return

  campaign.status = 'processing'
  campaign.startedAt = new Date()
  await campaign.save()

  let anyBatches = false

  for (const channelId of campaign.channels || []) {
    const channel = getChannel(channelId)
    if (!channel.isConfigured) continue

    const pending = await CampaignRecipient.find({
      campaignId: campaign._id,
      channel: channelId,
      status: 'pending',
    }).select('_id').lean()

    const ids = pending.map((r) => r._id.toString())
    const batches = chunkArray(ids, channel.batchSize)
    const totalBatches = batches.length

    const stats = campaign.channelStats?.get?.(channelId) || {
      totalBatches: 0,
      completedBatches: 0,
      sentCount: 0,
      failedCount: 0,
    }
    stats.totalBatches = totalBatches
    stats.status = totalBatches > 0 ? 'processing' : 'completed'
    campaign.channelStats.set(channelId, stats)
    await campaign.save()

    if (totalBatches === 0) continue

    anyBatches = true
    for (let i = 0; i < batches.length; i++) {
      await enqueueBatchJob(channel, {
        channelId,
        campaignId,
        recipientIds: batches[i],
        batchIndex: i + 1,
        totalBatches,
      })
    }
  }

  if (!anyBatches) {
    await finalizeCampaignIfDone(campaignId)
  }
}

export async function handleSendBatch(job) {
  const { channelId, campaignId, recipientIds, batchIndex, totalBatches } = job.data

  const campaign = await Campaign.findById(campaignId)
  if (!campaign || campaign.status === 'cancelled') return

  const channel = getChannel(channelId)
  const layout =
    channelId === 'email' && campaign.layoutId
      ? await EmailLayout.findById(campaign.layoutId).lean()
      : null

  const recipients = await CampaignRecipient.find({
    _id: { $in: recipientIds },
    status: 'pending',
  }).lean()

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const freshCampaign = await Campaign.findById(campaignId).select('status').lean()
    if (!freshCampaign || freshCampaign.status === 'cancelled') return

    const trainer = await Trainer.findById(recipient.trainerId).lean()
    if (!trainer) {
      await CampaignRecipient.findByIdAndUpdate(recipient._id, {
        status: 'failed',
        errorMessage: 'Trainer not found',
        batchIndex,
      })
      failed += 1
      continue
    }

    try {
      const message = await channel.buildMessage(campaign, trainer, layout)
      const result = await channel.send({ address: recipient.address, message, campaign, recipient, trainer })

      if (result.error) {
        await CampaignRecipient.findByIdAndUpdate(recipient._id, {
          status: 'failed',
          errorMessage: result.error,
          batchIndex,
        })
        failed += 1
      } else {
        await CampaignRecipient.findByIdAndUpdate(recipient._id, {
          status: 'sent',
          providerMessageId: result.providerMessageId || '',
          sentAt: new Date(),
          batchIndex,
        })
        sent += 1
      }
    } catch (err) {
      await CampaignRecipient.findByIdAndUpdate(recipient._id, {
        status: 'failed',
        errorMessage: err.message || 'Send failed',
        batchIndex,
      })
      failed += 1
    }
  }

  const incPath = `channelStats.${channelId}`
  await Campaign.updateOne(
    { _id: campaignId },
    {
      $inc: {
        [`${incPath}.sentCount`]: sent,
        [`${incPath}.failedCount`]: failed,
        [`${incPath}.completedBatches`]: 1,
      },
    }
  )

  const updated = await Campaign.findById(campaignId)
  if (!updated) return

  const stats = updated.channelStats?.get?.(channelId) || updated.channelStats?.[channelId]
  if (stats && stats.completedBatches >= totalBatches) {
    const channelStatus = stats.failedCount > 0 ? 'failed' : 'completed'
    if (updated.channelStats instanceof Map) {
      const next = { ...stats, status: channelStatus }
      updated.channelStats.set(channelId, next)
    }
    await updated.save()
  }

  await finalizeCampaignIfDone(campaignId)
}
