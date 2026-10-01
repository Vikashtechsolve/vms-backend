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
  markBatchComplete,
  syncChannelStatsFromRecipients,
} from '../services/messaging/campaignStats.js'

const ENQUEUE_CONCURRENCY = 25
const CANCEL_CHECK_INTERVAL = 10
const STATS_FLUSH_EVERY = 10

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

function isRetryableSendError(err) {
  const text = `${err?.name || ''} ${err?.message || ''}`
  return /Throttl|TooManyRequests|LimitExceeded|ServiceUnavailable|Timeout|ECONN|ETIMEDOUT|EAI_AGAIN|NetworkingError|socket hang up|429/i.test(text)
}

export async function handleStartCampaign(job) {
  const { campaignId } = job.data
  const campaign = await Campaign.findById(campaignId)
  if (!campaign || campaign.status === 'cancelled' || campaign.status === 'draft') return
  if (campaign.status === 'completed' || campaign.status === 'failed') return

  if (campaign.status === 'queued') {
    const claimed = await Campaign.updateOne(
      { _id: campaign._id, status: 'queued' },
      { $set: { status: 'processing', startedAt: new Date() } }
    )
    if (claimed.matchedCount === 0) return
  }

  const preparedCount = await ensureRecipientsPrepared(campaign)
  if (preparedCount === 0) {
    await Campaign.updateOne(
      { _id: campaign._id, status: { $in: ['queued', 'processing'] } },
      {
        $set: {
          status: 'failed',
          lastError: 'No eligible recipients when preparing send',
          completedAt: new Date(),
        },
      }
    )
    return
  }

  const activeCampaign = await Campaign.findById(campaignId)
  if (!activeCampaign || activeCampaign.status === 'cancelled') {
    await CampaignRecipient.updateMany(
      { campaignId, status: 'pending' },
      { $set: { status: 'skipped', errorMessage: 'Campaign cancelled' } }
    )
    return
  }

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

    await Campaign.collection.updateOne(
      { _id: activeCampaign._id, status: { $ne: 'cancelled' } },
      {
        $set: {
          [`channelStats.${channelId}.totalBatches`]: totalBatches,
          [`channelStats.${channelId}.status`]: totalBatches > 0 ? 'processing' : 'completed',
        },
      }
    )

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

  let cancelled = false
  let processed = 0
  let retryableError = null

  async function recordRecipient(recipientId, fields) {
    await CampaignRecipient.updateOne(
      { _id: recipientId, status: 'pending' },
      { $set: { ...fields, batchIndex } }
    )
    if (processed % STATS_FLUSH_EVERY === 0) {
      await syncChannelStatsFromRecipients(campaignId, channelId)
    }
  }

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
      await recordRecipient(recipient._id, { status: 'failed', errorMessage: 'Trainer not found' })
      continue
    }

    try {
      const message =
        channelId === 'whatsapp' && waTemplate
          ? buildWhatsAppMessageFromTemplate(campaign, trainer, waTemplate)
          : await channel.buildMessage(campaign, trainer, layout, waTemplate)

      const result = await channel.send({ address: recipient.address, message })

      if (result.error) {
        await recordRecipient(recipient._id, { status: 'failed', errorMessage: result.error })
      } else {
        await recordRecipient(recipient._id, {
          status: 'sent',
          providerMessageId: result.providerMessageId || '',
          sentAt: new Date(),
        })
      }
    } catch (err) {
      if (isRetryableSendError(err)) {
        retryableError = err
        break
      }
      await recordRecipient(recipient._id, {
        status: 'failed',
        errorMessage: err.message || 'Send failed',
      })
    }
  }

  await syncChannelStatsFromRecipients(campaignId, channelId)

  if (cancelled) {
    await CampaignRecipient.updateMany(
      { _id: { $in: recipientIds }, status: 'pending' },
      { $set: { status: 'skipped', errorMessage: 'Campaign cancelled', batchIndex } }
    )
    await syncChannelStatsFromRecipients(campaignId, channelId)
    await markBatchComplete(campaignId, channelId, batchIndex, totalBatches)
    await finalizeCampaignIfDone(campaignId)
    return
  }

  if (retryableError) throw retryableError

  await markBatchComplete(campaignId, channelId, batchIndex, totalBatches)
  await finalizeCampaignIfDone(campaignId)
}
