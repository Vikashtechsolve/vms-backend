import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Campaign from '../models/Campaign.js'
import CampaignRecipient from '../models/CampaignRecipient.js'
import Trainer from '../models/Trainer.js'
import {
  previewAudience,
  previewCampaignMessage,
  sendTestEmail,
  queueCampaignSend,
  cancelCampaign,
} from '../services/messaging/campaignService.js'

const router = Router()

router.use(authMiddleware)

function campaignPayload(doc) {
  return doc.toJSON()
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const skip = (page - 1) * limit
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Campaign.countDocuments(filter),
    ])

    res.json({
      items: items.map((c) => campaignPayload(c)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    res.json(campaignPayload(campaign))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Campaign not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body || {}
    const campaign = await Campaign.create({
      channels: body.channels || ['email'],
      subject: body.subject || '',
      bodyHtml: body.bodyHtml || '',
      layoutId: body.layoutId || undefined,
      selectionMode: body.selectionMode || 'filter',
      audienceFilter: body.audienceFilter || {},
      selectedTrainerIds: body.selectedTrainerIds || [],
      excludedTrainerIds: body.excludedTrainerIds || [],
      createdBy: req.user?.username || 'admin',
      status: 'draft',
    })
    res.status(201).json(campaignPayload(campaign))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be edited' })
    }

    const body = req.body || {}
    if (body.subject != null) campaign.subject = body.subject
    if (body.bodyHtml != null) campaign.bodyHtml = body.bodyHtml
    if (body.layoutId != null) campaign.layoutId = body.layoutId || undefined
    if (body.selectionMode != null) campaign.selectionMode = body.selectionMode
    if (body.audienceFilter != null) campaign.audienceFilter = body.audienceFilter
    if (body.selectedTrainerIds != null) campaign.selectedTrainerIds = body.selectedTrainerIds
    if (body.excludedTrainerIds != null) campaign.excludedTrainerIds = body.excludedTrainerIds
    if (body.channels != null) campaign.channels = body.channels

    await campaign.save()
    res.json(campaignPayload(campaign))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Campaign not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be deleted' })
    }
    await CampaignRecipient.deleteMany({ campaignId: campaign._id })
    await campaign.deleteOne()
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Campaign not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/audience/preview', async (req, res) => {
  try {
    const body = req.body || {}
    const previewCampaign = {
      selectionMode: body.selectionMode || 'filter',
      audienceFilter: body.audienceFilter || {},
      selectedTrainerIds: body.selectedTrainerIds || [],
      excludedTrainerIds: body.excludedTrainerIds || [],
      channels: body.channels || ['email'],
    }
    const result = await previewAudience(previewCampaign, body.channels)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.post('/preview', async (req, res) => {
  try {
    const { campaignId, trainerId, subject, bodyHtml, layoutId } = req.body || {}
    let campaign
    if (campaignId) {
      campaign = await Campaign.findById(campaignId)
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    } else {
      campaign = { subject, bodyHtml, layoutId }
    }
    if (!trainerId) return res.status(400).json({ error: 'trainerId is required' })
    const preview = await previewCampaignMessage(campaign, trainerId)
    res.json(preview)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Preview failed' })
  }
})

router.post('/test-send', async (req, res) => {
  try {
    const { campaignId, testEmail, trainerId } = req.body || {}
    if (!testEmail?.trim()) return res.status(400).json({ error: 'testEmail is required' })

    let campaign
    if (campaignId) {
      campaign = await Campaign.findById(campaignId)
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    } else {
      return res.status(400).json({ error: 'campaignId is required' })
    }

    await sendTestEmail(campaign, testEmail.trim(), trainerId)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Test send failed' })
  }
})

router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await queueCampaignSend(req.params.id)
    res.json(campaignPayload(campaign))
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Send failed' })
  }
})

router.post('/:id/cancel', async (req, res) => {
  try {
    const campaign = await cancelCampaign(req.params.id)
    res.json(campaignPayload(campaign))
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Cancel failed' })
  }
})

router.get('/:id/recipients', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const skip = (page - 1) * limit
    const filter = { campaignId: req.params.id }
    if (req.query.status) filter.status = req.query.status
    if (req.query.channel) filter.channel = req.query.channel

    const [recipients, total] = await Promise.all([
      CampaignRecipient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CampaignRecipient.countDocuments(filter),
    ])

    const trainerIds = recipients.map((r) => r.trainerId)
    const trainers = await Trainer.find({ _id: { $in: trainerIds } }).select('name email').lean()
    const trainerMap = new Map(trainers.map((t) => [t._id.toString(), t]))

    res.json({
      items: recipients.map((r) => {
        const json = r.toJSON()
        const trainer = trainerMap.get(r.trainerId.toString())
        json.trainerName = trainer?.name || ''
        json.trainerEmail = trainer?.email || ''
        return json
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await Campaign.findById(req.params.id)
    if (!source) return res.status(404).json({ error: 'Campaign not found' })

    const campaign = await Campaign.create({
      channels: source.channels,
      subject: source.subject,
      bodyHtml: source.bodyHtml,
      layoutId: source.layoutId,
      selectionMode: source.selectionMode,
      audienceFilter: source.audienceFilter,
      selectedTrainerIds: source.selectedTrainerIds,
      excludedTrainerIds: [],
      createdBy: req.user?.username || 'admin',
      status: 'draft',
    })
    res.status(201).json(campaignPayload(campaign))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Campaign not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
