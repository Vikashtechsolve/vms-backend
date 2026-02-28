import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Trainer from '../models/Trainer.js'
import Vendor from '../models/Vendor.js'

const router = Router()

router.use(authMiddleware)

router.get('/stats', async (req, res) => {
  try {
    const numberOfTrainers = await Trainer.countDocuments()
    const numberOfVendors = await Vendor.countDocuments()
    const activeTrainers = await Trainer.countDocuments({ workLookingFor: { $exists: true, $ne: '' } })
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
