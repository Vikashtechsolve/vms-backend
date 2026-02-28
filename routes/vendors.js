import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Vendor from '../models/Vendor.js'
import { logActivity } from '../helpers/activities.js'

const router = Router()

/** Public company/vendor registration (no auth) - for VMS website */
router.post('/register', async (req, res) => {
  try {
    const b = req.body || {}
    const vendor = await Vendor.create({
      company: b.company ?? '',
      type: b.type ?? '',
      size: b.size ?? '',
      status: b.status ?? 'Active',
      hrName: b.hrName ?? '',
      email: b.email ?? '',
      phone: b.phone ?? '',
      skills: b.skills ?? '',
      hiring: b.hiring ?? '',
      mode: b.mode ?? '',
      logo: '',
      logoTint: '',
    })
    const out = vendor.toJSON()
    await logActivity(`New company registered: ${out.company || 'New vendor'}`, 'Just now')
    res.status(201).json({ ok: true, id: out.id, company: out.company })
  } catch (err) {
    console.error('Vendor register error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const list = await Vendor.find().sort({ createdAt: -1 }).lean()
    res.json(list.map((doc) => ({ ...doc, id: doc._id.toString(), _id: undefined })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await Vendor.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Vendor not found' })
    const obj = doc.toJSON()
    res.json(obj)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Vendor not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const vendor = await Vendor.create({
      company: b.company ?? '',
      type: b.type ?? '',
      size: b.size ?? '',
      status: b.status ?? 'Active',
      hrName: b.hrName ?? '',
      email: b.email ?? '',
      phone: b.phone ?? '',
      skills: b.skills ?? '',
      hiring: b.hiring ?? '',
      mode: b.mode ?? '',
      logo: b.logo ?? '',
      logoTint: b.logoTint ?? '',
    })
    const out = vendor.toJSON()
    await logActivity(`Vendor added: ${out.company || 'New vendor'}`, 'Just now')
    res.status(201).json(out)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        company: req.body.company,
        type: req.body.type,
        size: req.body.size,
        status: req.body.status,
        hrName: req.body.hrName,
        email: req.body.email,
        phone: req.body.phone,
        skills: req.body.skills,
        hiring: req.body.hiring,
        mode: req.body.mode,
        logo: req.body.logo,
        logoTint: req.body.logoTint,
      },
      { new: true, runValidators: true }
    )
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })
    const out = vendor.toJSON()
    await logActivity(`Vendor updated: ${out.company || 'Vendor'}`, 'Just now')
    res.json(out)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Vendor not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id)
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Vendor not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
