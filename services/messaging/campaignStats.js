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

/**
 * Mongoose Map values are subdocuments. Spreading one copies internal fields
 * (`_doc`) and drops the counts written on top, so sent/failed stay 0 forever.
 * Always copy through toObject() before writing channel stats back.
 */
export function cloneChannelStats(value) {
  const raw = value && typeof value.toObject === 'function' ? value.toObject() : (value || {})
  return {
    status: raw.status || 'pending',
    totalRecipients: Number(raw.totalRecipients) || 0,
    totalBatches: Number(raw.totalBatches) || 0,
    completedBatches: Number(raw.completedBatches) || 0,
    completedBatchIndices: Array.isArray(raw.completedBatchIndices)
      ? [...raw.completedBatchIndices]
      : [],
    sentCount: Number(raw.sentCount) || 0,
    failedCount: Number(raw.failedCount) || 0,
    skippedCount: Number(raw.skippedCount) || 0,
  }
}

function countUpdate(channelId, counts) {
  const prefix = `channelStats.${channelId}`
  const $set = {
    [`${prefix}.sentCount`]: counts.sent,
    [`${prefix}.failedCount`]: counts.failed,
    [`${prefix}.skippedCount`]: counts.skipped,
  }
  if (counts.total) $set[`${prefix}.totalRecipients`] = counts.total
  return $set
}

/** Update counters only. A full document save here can undo cancel or wipe the other channel. */
async function updateChannelFields(campaignId, $set, extra = {}) {
  await Campaign.collection.updateOne(
    { _id: toCampaignObjectId(campaignId) },
    { $set, ...extra }
  )
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
  const counts = await aggregateRecipientStats(campaignId, channelId)
  await updateChannelFields(campaignId, countUpdate(channelId, counts))
  return counts
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
  const counts = await aggregateRecipientStats(campaignId, channelId)
  const prefix = `channelStats.${channelId}`
  await updateChannelFields(
    campaignId,
    countUpdate(channelId, counts),
    { $addToSet: { [`${prefix}.completedBatchIndices`]: batchIndex } }
  )

  const campaign = await Campaign.findById(campaignId).select('channelStats')
  if (!campaign) return null

  const stats = cloneChannelStats(campaign.channelStats?.get?.(channelId))
  const completedBatches = stats.completedBatchIndices.length
  const channelStatus = completedBatches >= totalBatches && totalBatches > 0
    ? outcomeStatus(counts.sent, counts.failed)
    : 'processing'

  await updateChannelFields(campaignId, {
    [`${prefix}.completedBatches`]: completedBatches,
    [`${prefix}.status`]: channelStatus,
  })
  return stats
}

/** Failed only when nothing was delivered. A few bounces still count as completed. */
export function outcomeStatus(sent, failed) {
  if (sent > 0 || failed === 0) return 'completed'
  return 'failed'
}

export function outcomeStatusFromStats(statsObj) {
  const values = statsObj instanceof Map ? [...statsObj.values()] : Object.values(statsObj || {})
  let sent = 0
  let failed = 0
  for (const stats of values) {
    sent += Number(stats?.sentCount) || 0
    failed += Number(stats?.failedCount) || 0
  }
  return outcomeStatus(sent, failed)
}

/**
 * Reconcile campaign status from recipient records.
 * A finished send with any successful deliveries stays completed.
 */
export async function refreshCampaignStatusFromRecipients(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign || ['cancelled', 'draft'].includes(campaign.status)) return campaign

  await syncAllChannelStats(campaignId)

  const fresh = await Campaign.findById(campaignId)
  const [recipientRows, pending] = await Promise.all([
    CampaignRecipient.countDocuments({ campaignId }),
    CampaignRecipient.countDocuments({ campaignId, status: 'pending' }),
  ])

  // Recipients are created by the worker after the API marks the campaign queued.
  // Completing here while that list is still empty is what made the screen jump
  // straight to Completed with 0 sent.
  if (recipientRows === 0) return fresh

  if (pending > 0) {
    await Campaign.updateOne(
      { _id: fresh._id, status: { $in: ['completed', 'failed'] } },
      { $set: { status: 'processing' }, $unset: { completedAt: 1 } }
    )
    return await Campaign.findById(campaignId)
  }

  const statsObj =
    fresh.channelStats instanceof Map
      ? Object.fromEntries(fresh.channelStats)
      : fresh.channelStats || {}

  const nextStatus = outcomeStatusFromStats(statsObj)
  await Campaign.updateOne(
    { _id: fresh._id, status: { $in: ['queued', 'processing', 'completed', 'failed'] } },
    { $set: { status: nextStatus, completedAt: fresh.completedAt || new Date() } }
  )

  return await Campaign.findById(campaignId)
}

/** Live sent/failed/skipped totals from recipient rows, keyed by campaignId:channel. */
export async function loadRecipientCountIndex(campaignIds) {
  const index = new Map()
  if (!campaignIds.length) return index

  const rows = await CampaignRecipient.aggregate([
    { $match: { campaignId: { $in: campaignIds.map((id) => toCampaignObjectId(id)) } } },
    {
      $group: {
        _id: { campaignId: '$campaignId', channel: '$channel', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ])

  for (const row of rows) {
    const key = `${row._id.campaignId}:${row._id.channel}`
    if (!index.has(key)) {
      index.set(key, { sent: 0, failed: 0, skipped: 0, pending: 0, total: 0 })
    }
    const bucket = index.get(key)
    bucket.total += row.count
    if (row._id.status === 'sent') bucket.sent = row.count
    else if (row._id.status === 'failed') bucket.failed = row.count
    else if (row._id.status === 'skipped') bucket.skipped = row.count
    else if (row._id.status === 'pending') bucket.pending = row.count
  }

  return index
}

/** Replace stored counters with recipient-row totals so the admin bar cannot stay at 0. */
export function applyRecipientCounts(json, index) {
  if (!json?.id || !index?.size) return json
  const stats = { ...(json.channelStats || {}) }
  const channels = json.channels?.length ? json.channels : Object.keys(stats)

  for (const channelId of channels) {
    const counts = index.get(`${json.id}:${channelId}`)
    if (!counts?.total) continue
    const existing = cloneChannelStats(stats[channelId])
    stats[channelId] = {
      ...existing,
      sentCount: counts.sent,
      failedCount: counts.failed,
      skippedCount: counts.skipped,
      totalRecipients: counts.total,
    }
  }

  json.channelStats = stats
  return json
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
