import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import WhatsAppTemplate from '../models/WhatsAppTemplate.js'
import { fetchMetaTemplates, isWhatsAppConfigured } from '../services/messaging/channels/whatsapp/metaWhatsAppService.js'

const router = Router()

router.use(authMiddleware)

function extractBodyPreview(components = []) {
  const body = components.find((c) => c.type === 'BODY')
  return body?.text || ''
}

router.get('/status', (_req, res) => {
  res.json({
    configured: isWhatsAppConfigured(),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? true : false,
  })
})

router.get('/', async (_req, res) => {
  try {
    const items = await WhatsAppTemplate.find().sort({ name: 1 })
    res.json(items.map((t) => t.toJSON()))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.name?.trim()) return res.status(400).json({ error: 'Template name is required' })

    const template = await WhatsAppTemplate.create({
      name: body.name.trim(),
      providerTemplateId: body.providerTemplateId || '',
      language: body.language || 'en',
      category: body.category || 'MARKETING',
      bodyPreview: body.bodyPreview || '',
      variableMapping: body.variableMapping || ['firstName', 'requirementTitle', 'requirementBody'],
      status: body.status || 'approved',
      isActive: body.isActive !== false,
    })
    res.status(201).json(template.toJSON())
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Template name already exists' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const template = await WhatsAppTemplate.findById(req.params.id)
    if (!template) return res.status(404).json({ error: 'Template not found' })

    const body = req.body || {}
    if (body.name != null) template.name = body.name.trim()
    if (body.language != null) template.language = body.language
    if (body.bodyPreview != null) template.bodyPreview = body.bodyPreview
    if (body.variableMapping != null) template.variableMapping = body.variableMapping
    if (body.status != null) template.status = body.status
    if (body.isActive != null) template.isActive = body.isActive

    await template.save()
    res.json(template.toJSON())
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Template not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const template = await WhatsAppTemplate.findById(req.params.id)
    if (!template) return res.status(404).json({ error: 'Template not found' })
    await template.deleteOne()
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Template not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

/** Pull approved templates from Meta and upsert into local catalog. */
router.post('/sync', async (_req, res) => {
  try {
    if (!isWhatsAppConfigured()) {
      return res.status(400).json({ error: 'WhatsApp is not configured' })
    }

    const metaTemplates = await fetchMetaTemplates()
    let synced = 0

    for (const mt of metaTemplates) {
      if (mt.status !== 'APPROVED') continue

      const bodyPreview = extractBodyPreview(mt.components)
      await WhatsAppTemplate.findOneAndUpdate(
        { name: mt.name },
        {
          name: mt.name,
          providerTemplateId: mt.id || '',
          language: mt.language || 'en',
          category: mt.category || 'MARKETING',
          bodyPreview,
          status: 'approved',
          isActive: true,
        },
        { upsert: true, new: true }
      )
      synced += 1
    }

    const items = await WhatsAppTemplate.find().sort({ name: 1 })
    res.json({ synced, items: items.map((t) => t.toJSON()) })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Sync failed' })
  }
})

export default router
