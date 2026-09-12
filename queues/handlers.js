import Campaign from '../models/Campaign.js'
import CampaignRecipient from '../models/CampaignRecipient.js'
import EmailLayout from '../models/EmailLayout.js'
import Trainer from '../models/Trainer.js'
import { getChannel } from '../services/messaging/channelRegistry.js'
import { loadWhatsAppTemplate } from '../services/messaging/channels/whatsapp/whatsappChannel.js'
import { buildWhatsAppMessageFromTemplate } from '../services/messaging/channels/whatsapp/whatsappAssembler.js'
import { enqueueBatchJob } from './producers.js'
import {
  ensureRecipientsPrepared,
  finalizeCampaignIfDone,
} from '../services/messaging/campaignService.js'
import {
  emptyChannelStats,
  markBatchComplete,
} from '../services/messaging/campaignStats.js'

const ENQUEUE_CONCURRENCY = 25
const CANCEL_CHECK_INTERVAL = 10

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function enqueueBatchesParallel(channel, jobs) {
  for (let i = 0; i < jobs.length; i += ENQUEUE_CONCURRENCY) {
    const slice = jobs.slice(i, i + ENQUEUE_CONCURRENCY)
    await Promise.all(slice.map((payload) => enqueueBatchJob(channel, payload)))
  }
}

export async function handleStartCampaign(job) {
  const { campaignId } = job.data
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return
  if (campaign.status === 'cancelled') return

  campaign.status = 'processing'
  campaign.startedAt = new Date()
  await campaign.save()

  const preparedCount = await ensureRecipientsPrepared(campaign)
  if (preparedCount === 0) {
    campaign.status = 'failed'
    campaign.lastError = 'No eligible recipients when preparing send'
    campaign.completedAt = new Date()
    await campaign.save()
    return
  }

  const activeCampaign = await Campaign.findById(campaignId)
  if (!activeCampaign || activeCampaign.status === 'cancelled') return

  let anyBatches = false

  for (const channelId of activeCampaign.channels || []) {
    const channel = getChannel(channelId)
    if (!channel.isConfigured) continue

    const pending = await CampaignRecipient.find({
      campaignId: activeCampaign._id,
      channel: channelId,
      status: 'pending',
    })
      .select('_id')
      .lean()

    const ids = pending.map((r) => r._id.toString())
    const batches = chunkArray(ids, channel.batchSize)
    const totalBatches = batches.length

    const stats = activeCampaign.channelStats?.get?.(channelId) || emptyChannelStats()
    stats.totalBatches = totalBatches
    stats.completedBatches = 0
    stats.completedBatchIndices = []
    stats.status = totalBatches > 0 ? 'processing' : 'completed'
    activeCampaign.channelStats.set(channelId, stats)

    if (totalBatches === 0) continue

    anyBatches = true
    const jobs = batches.map((recipientIds, i) => ({
      channelId,
      campaignId,
      recipientIds,
      batchIndex: i + 1,
      totalBatches,
    }))
    await enqueueBatchesParallel(channel, jobs)
  }

  await activeCampaign.save()

  if (!anyBatches) {
    await finalizeCampaignIfDone(campaignId)
  }
}

export async function handleSendBatch(job) {
  const { channelId, campaignId, recipientIds, batchIndex, totalBatches } = job.data

  const campaign = await Campaign.findById(campaignId).lean()
  if (!campaign || campaign.status === 'cancelled') return

  const channel = getChannel(channelId)

  let layout = null
  let waTemplate = null
  if (channelId === 'email' && campaign.layoutId) {
    layout = await EmailLayout.findById(campaign.layoutId).lean()
  } else if (channelId === 'whatsapp' && campaign.whatsappTemplateId) {
    waTemplate = await loadWhatsAppTemplate(campaign)
  }

  const recipients = await CampaignRecipient.find({
    _id: { $in: recipientIds },
    status: 'pending',
  }).lean()

  if (!recipients.length) {
    await markBatchComplete(campaignId, channelId, batchIndex, totalBatches)
    await finalizeCampaignIfDone(campaignId)
    return
  }

  const trainerIds = recipients.map((r) => r.trainerId)
  const trainers = await Trainer.find({ _id: { $in: trainerIds } }).lean()
  const trainerMap = new Map(trainers.map((t) => [t._id.toString(), t]))

  const bulkOps = []
  let cancelled = false
  let processed = 0

  for (const recipient of recipients) {
    processed += 1
    if (processed % CANCEL_CHECK_INTERVAL === 1) {
      const fresh = await Campaign.findById(campaignId).select('status').lean()
      if (!fresh || fresh.status === 'cancelled') {
        cancelled = true
        break
      }
    }

    const trainer = trainerMap.get(recipient.trainerId.toString())
    if (!trainer) {
      bulkOps.push({
        updateOne: {
          filter: { _id: recipient._id, status: 'pending' },
          update: { $set: { status: 'failed', errorMessage: 'Trainer not found', batchIndex } },
        },
      })
      continue
    }

    try {
      const message =
        channelId === 'whatsapp' && waTemplate
          ? buildWhatsAppMessageFromTemplate(campaign, trainer, waTemplate)
          : await channel.buildMessage(campaign, trainer, layout, waTemplate)

      const result = await channel.send({ address: recipient.address, message })

      if (result.error) {
        bulkOps.push({
          updateOne: {
            filter: { _id: recipient._id, status: 'pending' },
            update: { $set: { status: 'failed', errorMessage: result.error, batchIndex } },
          },
        })
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: recipient._id, status: 'pending' },
            update: {
              $set: {
                status: 'sent',
                providerMessageId: result.providerMessageId || '',
                sentAt: new Date(),
                batchIndex,
              },
            },
          },
        })
      }
    } catch (err) {
      bulkOps.push({
        updateOne: {
          filter: { _id: recipient._id, status: 'pending' },
          update: {
            $set: { status: 'failed', errorMessage: err.message || 'Send failed', batchIndex },
          },
        },
      })
    }
  }

  if (bulkOps.length) {
    await CampaignRecipient.bulkWrite(bulkOps, { ordered: false })
  }

  // Mark any batch rows still pending (cancel mid-batch, or loop exited early).
  await CampaignRecipient.updateMany(
    { _id: { $in: recipientIds }, status: 'pending' },
    {
      $set: cancelled
        ? { status: 'skipped', errorMessage: 'Campaign cancelled', batchIndex }
        : { status: 'failed', errorMessage: 'Send did not complete', batchIndex },
    }
  )

  await markBatchComplete(campaignId, channelId, batchIndex, totalBatches)
  await finalizeCampaignIfDone(campaignId)
}
