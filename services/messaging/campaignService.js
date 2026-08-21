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

  const { recipients } = await buildRecipientsForCampaign(campaign)
  if (!recipients.length) throw new Error('No eligible recipients for this campaign')

  await CampaignRecipient.deleteMany({ campaignId: campaign._id })

  const channelStats = initChannelStatsMap(activeChannels)
  for (const ch of activeChannels) {
    const count = recipients.filter((r) => r.channel === ch).length
    const stats = channelStats.get(ch)
    stats.totalRecipients = count
    channelStats.set(ch, stats)
  }

  await CampaignRecipient.insertMany(recipients, { ordered: false })

  campaign.channels = activeChannels
  campaign.channelStats = channelStats
  campaign.status = 'queued'
  campaign.startedAt = undefined
  campaign.completedAt = undefined
  campaign.lastError = ''

  const job = await enqueueStartCampaign(campaign._id.toString())
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
