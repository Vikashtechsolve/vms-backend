import mongoose from 'mongoose'
import Campaign from '../../models/Campaign.js'
import CampaignRecipient from '../../models/CampaignRecipient.js'

function toCampaignObjectId(campaignId) {
  if (campaignId instanceof mongoose.Types.ObjectId) return campaignId
  return new mongoose.Types.ObjectId(String(campaignId))
}

export function emptyChannelStats() {
  return {
    status: 'pending',
    totalRecipients: 0,
    totalBatches: 0,
    completedBatches: 0,
    completedBatchIndices: [],
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  }
}

/** Single aggregation query instead of 4 separate countDocuments — scales to 10k+ recipients. */
async function aggregateRecipientStats(campaignId, channelId) {
  const rows = await CampaignRecipient.aggregate([
    { $match: { campaignId: toCampaignObjectId(campaignId), channel: channelId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const counts = { sent: 0, failed: 0, skipped: 0, pending: 0, total: 0 }
  for (const row of rows) {
    counts.total += row.count
    if (row._id === 'sent') counts.sent = row.count
    else if (row._id === 'failed') counts.failed = row.count
    else if (row._id === 'skipped') counts.skipped = row.count
    else if (row._id === 'pending') counts.pending = row.count
  }
  return counts
}

/** Derive sent/failed/skipped counts from recipient rows — source of truth for the admin panel. */
export async function syncChannelStatsFromRecipients(campaignId, channelId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return null

  const { sent, failed, skipped, total } = await aggregateRecipientStats(campaignId, channelId)

  const existing = campaign.channelStats?.get?.(channelId) || emptyChannelStats()
  const stats = {
    ...existing,
    sentCount: sent,
    failedCount: failed,
    skippedCount: skipped,
    totalRecipients: total || existing.totalRecipients,
  }

  campaign.channelStats.set(channelId, stats)
  await campaign.save()
  return stats
}

export async function syncAllChannelStats(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return

  for (const channelId of campaign.channels || []) {
    await syncChannelStatsFromRecipients(campaignId, channelId)
  }
}

/** Idempotent batch completion — avoids double-counting when BullMQ retries a job. */
export async function markBatchComplete(campaignId, channelId, batchIndex, totalBatches) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) return null

  const { sent, failed, skipped, total } = await aggregateRecipientStats(campaignId, channelId)

  const stats = { ...(campaign.channelStats?.get?.(channelId) || emptyChannelStats()) }
  stats.sentCount = sent
  stats.failedCount = failed
  stats.skippedCount = skipped
  stats.totalRecipients = total || stats.totalRecipients

  const completed = new Set(stats.completedBatchIndices || [])
  if (!completed.has(batchIndex)) {
    completed.add(batchIndex)
    stats.completedBatchIndices = [...completed].sort((a, b) => a - b)
    stats.completedBatches = completed.size
  }

  if (stats.completedBatches >= totalBatches && totalBatches > 0) {
    stats.status = stats.failedCount > 0 ? 'failed' : 'completed'
  } else if (stats.completedBatches > 0) {
    stats.status = 'processing'
  }

  campaign.channelStats.set(channelId, stats)
  await campaign.save()
  return stats
}

/**
 * Reconcile campaign status from recipient records.
 * Also upgrades completed → failed when bounces arrive after send finished.
 */
export async function refreshCampaignStatusFromRecipients(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign || ['cancelled', 'draft'].includes(campaign.status)) return campaign

  await syncAllChannelStats(campaignId)

  const fresh = await Campaign.findById(campaignId)
  const pending = await CampaignRecipient.countDocuments({ campaignId, status: 'pending' })

  const statsObj =
    fresh.channelStats instanceof Map
      ? Object.fromEntries(fresh.channelStats)
      : fresh.channelStats || {}

  const hasFailures = Object.values(statsObj).some((s) => (s.failedCount || 0) > 0)
  const allBatchesDone = Object.values(statsObj).every(
    (s) => (s.totalBatches || 0) === 0 || (s.completedBatches || 0) >= (s.totalBatches || 0)
  )

  if (pending === 0 && allBatchesDone) {
    const nextStatus = hasFailures ? 'failed' : 'completed'
    if (fresh.status !== nextStatus) {
      fresh.status = nextStatus
      if (!fresh.completedAt) fresh.completedAt = new Date()
      await fresh.save()
    } else if (!fresh.completedAt && ['completed', 'failed'].includes(fresh.status)) {
      fresh.completedAt = new Date()
      await fresh.save()
    }
  }

  return await Campaign.findById(campaignId)
}

export async function markRecipientDeliveryFailed(providerMessageId, errorMessage) {
  if (!providerMessageId) return null

  const recipient = await CampaignRecipient.findOne({ providerMessageId })
  if (!recipient || recipient.status !== 'sent') return recipient

  recipient.status = 'failed'
  recipient.errorMessage = errorMessage
  await recipient.save()

  await syncChannelStatsFromRecipients(recipient.campaignId, recipient.channel)
  return recipient
}
