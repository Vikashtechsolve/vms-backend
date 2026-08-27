import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import TrainerTag from '../models/TrainerTag.js'
import {
  createTrainerTag,
  listTrainerTags,
  searchTrainerTags,
} from '../helpers/trainerTagService.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const tags = await listTrainerTags()
    res.json(tags.map((t) => ({ ...t, id: t._id.toString() })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/search', async (req, res) => {
  try {
    const tags = await searchTrainerTags(req.query.q, Number(req.query.limit) || 12)
    res.json(tags.map((t) => ({ ...t, id: t._id.toString() })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {}
    const tag = await createTrainerTag(name)
    res.status(201).json(tag.toJSON())
  } catch (err) {
    if (err.code === 'TAG_EXISTS') {
      return res.status(409).json({
        error: err.message,
        existing: { id: err.existing._id.toString(), name: err.existing.name, slug: err.existing.slug },
      })
    }
    if (err.message?.includes('required')) return res.status(400).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const tag = await TrainerTag.findById(req.params.id)
    if (!tag) return res.status(404).json({ error: 'Tag not found' })
    if (tag.trainerCount > 0) {
      return res.status(400).json({
        error: `Tag is used by ${tag.trainerCount} trainer(s). Remove it from trainers first.`,
      })
    }
    await tag.deleteOne()
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Tag not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
