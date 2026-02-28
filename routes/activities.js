import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Activity from '../models/Activity.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const dateKey = req.query.date || new Date().toISOString().slice(0, 10)
    const list = await Activity.find({ date_key: dateKey }).sort({ createdAt: -1 }).lean()
    res.json(list.map((doc) => ({
      id: doc._id.toString(),
      color: doc.color,
      text: doc.text,
      time: doc.time_ago,
      dateKey: doc.date_key,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
