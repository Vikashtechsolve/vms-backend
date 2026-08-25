import Trainer from '../../models/Trainer.js'
import { buildTrainerQuery } from '../../helpers/trainerQuery.js'
import { getChannel, listActiveChannelIds } from './channelRegistry.js'

function toObjectIdStrings(ids = []) {
  return ids.map((id) => String(id))
}

function buildBaseTrainerFilter(campaign) {
  const filter = {}

  if (campaign.selectionMode === 'manual') {
    const ids = campaign.selectedTrainerIds || []
    if (!ids.length) return { _id: { $in: [] } }
    filter._id = { $in: ids }
    return filter
  }

  const audienceFilter = { ...(campaign.audienceFilter || {}) }
  return buildTrainerQuery(audienceFilter)
}

function isExcluded(trainer, excludedIds) {
  const id = trainer._id?.toString()
  return excludedIds.includes(id)
}

export async function resolveBaseTrainers(campaign) {
  const filter = buildBaseTrainerFilter(campaign)
  const excludedIds = toObjectIdStrings(campaign.excludedTrainerIds || [])
  const trainers = await Trainer.find(filter).lean()
  return trainers.filter((t) => !isExcluded(t, excludedIds))
}

function countBySource(trainers) {
  let admin = 0
  let website = 0
  for (const trainer of trainers) {
    if (trainer.source === 'website') website += 1
    else admin += 1
  }
  return { admin, website }
}

export async function previewAudience(campaign, channelIds = null) {
  const ids = channelIds || campaign.channels || listActiveChannelIds()
  const trainers = await resolveBaseTrainers(campaign)
  const sourceBreakdown = countBySource(trainers)
  const channels = {}

  for (const channelId of ids) {
    const channel = getChannel(channelId)
    let eligible = 0
    const skipReasons = {}

    for (const trainer of trainers) {
      const result = channel.isTrainerEligible(trainer)
      if (result.eligible) {
        eligible += 1
      } else {
        const reason = result.skipReason || 'ineligible'
        skipReasons[reason] = (skipReasons[reason] || 0) + 1
      }
    }

    channels[channelId] = {
      eligible,
      skipped: trainers.length - eligible,
      skipReasons,
    }
  }

  return {
    totalMatched: trainers.length,
    sourceBreakdown,
    channels,
    sample: trainers.slice(0, 10).map((t) => ({
      id: t._id.toString(),
      name: t.name,
      email: t.email,
      contact: t.contact,
      city: t.city,
      state: t.state,
      source: t.source === 'website' ? 'website' : 'admin',
    })),
  }
}

export async function buildRecipientsForCampaign(campaign) {
  const trainers = await resolveBaseTrainers(campaign)
  const recipients = []

  for (const channelId of campaign.channels || []) {
    const channel = getChannel(channelId)
    if (!channel.isConfigured) continue

    for (const trainer of trainers) {
      const eligibility = channel.isTrainerEligible(trainer)
      if (!eligibility.eligible) continue

      const address = channel.getRecipientAddress(trainer)
      if (!address) continue

      recipients.push({
        campaignId: campaign._id,
        trainerId: trainer._id,
        channel: channelId,
        address,
        status: 'pending',
      })
    }
  }

  return { trainers, recipients }
}
