import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Trainer from '../models/Trainer.js'
import Vendor from '../models/Vendor.js'

const router = Router()

router.use(authMiddleware)

router.get('/stats', async (req, res) => {
  try {
    const adminOnly = {
      $or: [
        { source: 'admin' },
        { source: { $exists: false } },
        { source: null },
      ],
    }
    const numberOfTrainers = await Trainer.countDocuments(adminOnly)
    const numberOfVendors = await Vendor.countDocuments(adminOnly)
    const activeTrainers = await Trainer.countDocuments({
      ...adminOnly,
      workLookingFor: { $exists: true, $ne: '' },
    })
    res.json({
      numberOfTrainers,
      numberOfVendors,
      activeTrainers,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
