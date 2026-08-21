import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import EmailLayout from '../models/EmailLayout.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const list = await EmailLayout.find().sort({ isDefault: -1, createdAt: -1 })
    res.json(list.map((doc) => doc.toJSON()))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const layout = await EmailLayout.findById(req.params.id)
    if (!layout) return res.status(404).json({ error: 'Layout not found' })
    res.json(layout.toJSON())
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
      headerHtml: headerHtml || '',
      footerHtml: footerHtml || '',
      isDefault: Boolean(isDefault),
      isActive: isActive !== false,
    })
    res.status(201).json(layout.toJSON())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, headerHtml, footerHtml, isDefault, isActive } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

    if (isDefault) {
      await EmailLayout.updateMany({}, { isDefault: false })
    }

    const layout = await EmailLayout.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        headerHtml: headerHtml || '',
        footerHtml: footerHtml || '',
        isDefault: Boolean(isDefault),
        isActive: isActive !== false,
      },
      { new: true }
    )
    if (!layout) return res.status(404).json({ error: 'Layout not found' })
    res.json(layout.toJSON())
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

    const total = await EmailLayout.countDocuments()
    if (total <= 1) return res.status(400).json({ error: 'Cannot delete the only layout' })

    await layout.deleteOne()

    if (layout.isDefault) {
      const first = await EmailLayout.findOne().sort({ createdAt: 1 })
      if (first) {
        first.isDefault = true
        await first.save()
      }
    }

    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Layout not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
