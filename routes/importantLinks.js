import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import ImportantLink from '../models/ImportantLink.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const list = await ImportantLink.find().sort({ createdAt: -1 }).lean()
    res.json(list.map((doc) => ({ id: doc._id.toString(), description: doc.description, url: doc.url })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { description, url } = req.body || {}
    if (!description || !url) return res.status(400).json({ error: 'description and url required' })
    const link = await ImportantLink.create({ description: description.trim(), url: url.trim() })
    res.status(201).json({ id: link._id.toString(), description: link.description, url: link.url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const link = await ImportantLink.findByIdAndDelete(req.params.id)
    if (!link) return res.status(404).json({ error: 'Link not found' })
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Link not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
