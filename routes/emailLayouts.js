import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import EmailLayout from '../models/EmailLayout.js'
import Campaign from '../models/Campaign.js'

const router = Router()

router.use(authMiddleware)

async function campaignCountForLayout(layoutId) {
  return Campaign.countDocuments({ layoutId })
}

async function ensureDefaultLayout() {
  const hasDefault = await EmailLayout.exists({ isDefault: true })
  if (hasDefault) return
  const first = await EmailLayout.findOne().sort({ createdAt: 1 })
  if (first) {
    first.isDefault = true
    await first.save()
  }
}

function layoutPayload(doc, campaignCount = 0) {
  const json = doc.toJSON()
  json.campaignCount = campaignCount
  return json
}

router.get('/', async (req, res) => {
  try {
    const list = await EmailLayout.find().sort({ isDefault: -1, createdAt: -1 })
    const counts = await Promise.all(
      list.map((doc) => campaignCountForLayout(doc._id))
    )
    res.json(list.map((doc, i) => layoutPayload(doc, counts[i])))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const layout = await EmailLayout.findById(req.params.id)
    if (!layout) return res.status(404).json({ error: 'Layout not found' })
    const campaignCount = await campaignCountForLayout(layout._id)
    res.json(layoutPayload(layout, campaignCount))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Layout not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, headerHtml, footerHtml, isDefault, isActive } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

    if (isDefault) {
      await EmailLayout.updateMany({}, { isDefault: false })
    }

    const layout = await EmailLayout.create({
      name: name.trim(),
      headerHtml: headerHtml ?? '',
      footerHtml: footerHtml ?? '',
      isDefault: Boolean(isDefault),
      isActive: isActive !== false,
      isProtected: false,
    })

    if (!(await EmailLayout.exists({ isDefault: true }))) {
      layout.isDefault = true
      await layout.save()
    }

    res.status(201).json(layoutPayload(layout, 0))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await EmailLayout.findById(req.params.id)
    if (!source) return res.status(404).json({ error: 'Layout not found' })

    const copyName = `${source.name} (copy)`.slice(0, 120)
    const layout = await EmailLayout.create({
      name: copyName,
      headerHtml: source.headerHtml ?? '',
      footerHtml: source.footerHtml ?? '',
      isDefault: false,
      isActive: source.isActive !== false,
      isProtected: false,
    })
    res.status(201).json(layoutPayload(layout, 0))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Layout not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const layout = await EmailLayout.findById(req.params.id)
    if (!layout) return res.status(404).json({ error: 'Layout not found' })

    const { name, headerHtml, footerHtml, isDefault, isActive } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

    if (isDefault) {
      await EmailLayout.updateMany({ _id: { $ne: layout._id } }, { isDefault: false })
    }

    layout.name = name.trim()
    if (headerHtml !== undefined) layout.headerHtml = headerHtml
    if (footerHtml !== undefined) layout.footerHtml = footerHtml
    if (isDefault !== undefined) layout.isDefault = Boolean(isDefault)
    if (isActive !== undefined) layout.isActive = isActive !== false

    await layout.save()
    const campaignCount = await campaignCountForLayout(layout._id)
    res.json(layoutPayload(layout, campaignCount))
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Layout not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const layout = await EmailLayout.findById(req.params.id)
    if (!layout) return res.status(404).json({ error: 'Layout not found' })

    if (layout.isProtected) {
      return res.status(400).json({ error: 'This is a protected system layout and cannot be deleted' })
    }

    const total = await EmailLayout.countDocuments()
    if (total <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only layout in the system' })
    }

    const campaignCount = await campaignCountForLayout(layout._id)
    if (campaignCount > 0) {
      return res.status(400).json({
        error: `This layout is used by ${campaignCount} campaign(s). Duplicate it or reassign campaigns before deleting.`,
        campaignCount,
      })
    }

    const wasDefault = layout.isDefault
    await layout.deleteOne()

    if (wasDefault) await ensureDefaultLayout()

    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Layout not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
