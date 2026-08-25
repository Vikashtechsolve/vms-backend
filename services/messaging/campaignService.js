import Campaign from '../../models/Campaign.js'
import CampaignRecipient from '../../models/CampaignRecipient.js'
import EmailLayout from '../../models/EmailLayout.js'
import Trainer from '../../models/Trainer.js'
import { logActivity } from '../../helpers/activities.js'
import { getChannel } from './channelRegistry.js'
import { previewAudience, buildRecipientsForCampaign } from './audienceResolver.js'
import { assembleEmailHtml } from './channels/email/emailAssembler.js'
import { enqueueStartCampaign, removeCampaignJobs } from '../../queues/producers.js'
import { CHANNEL_IDS } from './types.js'

function emptyChannelStats() {
  return {
    status: 'pending',
    totalRecipients: 0,
    totalBatches: 0,
    completedBatches: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  }
}

function initChannelStatsMap(channels) {
  const map = new Map()
  for (const ch of channels) {
    map.set(ch, emptyChannelStats())
  }
  return map
}

export async function previewCampaignMessage(campaign, trainerId) {
  const trainer = await Trainer.findById(trainerId).lean()
  if (!trainer) throw new Error('Trainer not found')

  const layoutId = campaign.layoutId?._id || campaign.layoutId
  const layout = layoutId ? await EmailLayout.findById(layoutId).lean() : null
  return assembleEmailHtml({ layout, campaign, trainer })
}

export async function sendTestEmail(campaign, testEmail, trainerId) {
  const channel = getChannel(CHANNEL_IDS.EMAIL)
  const errors = channel.validateCampaign(campaign)
  if (errors.length) throw new Error(errors.join(', '))

  let trainer
  if (trainerId) {
    trainer = await Trainer.findById(trainerId).lean()
  } else {
    trainer = {
      name: 'Test Trainer',
      email: testEmail,
      city: 'Mumbai',
      state: 'Maharashtra',
      subject: 'Java, Python',
      unsubscribeToken: 'test',
    }
  }

  const layout = campaign.layoutId ? await EmailLayout.findById(campaign.layoutId).lean() : null
  const message = await channel.buildMessage(campaign, trainer, layout)
  await channel.send({ address: testEmail, message })
  return { ok: true }
}

const RECIPIENT_INSERT_BATCH_SIZE = 500

export async function insertRecipientsInBatches(recipients) {
  for (let i = 0; i < recipients.length; i += RECIPIENT_INSERT_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + RECIPIENT_INSERT_BATCH_SIZE)
    await CampaignRecipient.insertMany(chunk, { ordered: false })
  }
}

/** Build and persist recipients in the worker so the HTTP send endpoint stays fast. */
export async function ensureRecipientsPrepared(campaign) {
  const existing = await CampaignRecipient.countDocuments({ campaignId: campaign._id })
  if (existing > 0) return existing

  const { recipients } = await buildRecipientsForCampaign(campaign)
  if (!recipients.length) return 0

  await insertRecipientsInBatches(recipients)

  const channelStats =
    campaign.channelStats instanceof Map
      ? campaign.channelStats
      : new Map(Object.entries(campaign.channelStats || {}))

  for (const ch of campaign.channels || []) {
    const count = recipients.filter((r) => r.channel === ch).length
    const stats = channelStats.get(ch) || emptyChannelStats()
    stats.totalRecipients = count
    channelStats.set(ch, stats)
  }

  campaign.channelStats = channelStats
  await campaign.save()

  return recipients.length
}

export async function queueCampaignSend(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Only draft campaigns can be sent')

  const activeChannels = (campaign.channels || []).filter((id) => {
    const ch = getChannel(id)
    return ch.isConfigured
  })

  if (!activeChannels.length) throw new Error('No configured messaging channels')

  for (const channelId of activeChannels) {
    const errors = getChannel(channelId).validateCampaign(campaign)
    if (errors.length) throw new Error(errors.join(', '))
  }

  const preview = await previewAudience(
    { ...campaign.toObject(), channels: activeChannels },
    activeChannels
  )
  const totalEligible = activeChannels.reduce(
    (sum, ch) => sum + (preview.channels[ch]?.eligible || 0),
    0
  )
  if (totalEligible === 0) throw new Error('No eligible recipients for this campaign')

  await CampaignRecipient.deleteMany({ campaignId: campaign._id })

  const channelStats = initChannelStatsMap(activeChannels)
  for (const ch of activeChannels) {
    const stats = channelStats.get(ch)
    stats.totalRecipients = preview.channels[ch]?.eligible || 0
    channelStats.set(ch, stats)
  }

  campaign.channels = activeChannels
  campaign.channelStats = channelStats
  campaign.status = 'queued'
  campaign.startedAt = undefined
  campaign.completedAt = undefined
  campaign.lastError = ''

  let job
  try {
    job = await enqueueStartCampaign(campaign._id.toString())
  } catch (err) {
    console.error('Redis enqueue failed:', err)
    campaign.status = 'draft'
    await campaign.save()
    throw new Error(
      'Could not queue campaign for sending. Ensure Redis is running and REDIS_URL is set on both the API and worker services.'
    )
  }

  campaign.dispatchJobId = job.id || ''
  await campaign.save()

  return campaign
}

export async function cancelCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (!['queued', 'processing'].includes(campaign.status)) {
    throw new Error('Campaign cannot be cancelled')
  }

  await removeCampaignJobs(campaignId)
  campaign.status = 'cancelled'
  campaign.completedAt = new Date()
  await campaign.save()

  await CampaignRecipient.updateMany(
    { campaignId: campaign._id, status: 'pending' },
    { status: 'skipped', errorMessage: 'Campaign cancelled' }
  )

  return campaign
}

export async function finalizeCampaignIfDone(campaignId) {
  const campaign = await Campaign.findById(campaignId)
  if (!campaign || campaign.status === 'cancelled') return

  const statsObj = campaign.channelStats instanceof Map
    ? Object.fromEntries(campaign.channelStats)
    : campaign.channelStats || {}

  const allDone = Object.values(statsObj).every(
    (s) => (s.completedBatches || 0) >= (s.totalBatches || 0)
  )

  if (!allDone) return

  const hasFailures = Object.values(statsObj).some((s) => s.failedCount > 0)
  campaign.status = hasFailures ? 'failed' : 'completed'
  campaign.completedAt = new Date()
  await campaign.save()
  await logActivity(`Campaign "${campaign.subject}" sent (${campaign.status})`)
}

export { previewAudience }
