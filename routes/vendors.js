import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Vendor from '../models/Vendor.js'
import { logActivity } from '../helpers/activities.js'

const router = Router()

function adminSourceFilter() {
  return {
    $or: [
      { source: 'admin' },
      { source: { $exists: false } },
      { source: null },
    ],
  }
}

function sourceFilter(source) {
  const value = String(source || '').trim()
  if (value === 'website') return { source: 'website' }
  if (value === 'admin') return adminSourceFilter()
  return null
}

/** Public company/vendor registration (no auth) - for Trainer Adda website */
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
      source: 'website',
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
    const filter = sourceFilter(req.query.source) || {}
    const list = await Vendor.find(filter).sort({ createdAt: -1 }).lean()
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
      source: 'admin',
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
    const update = {
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
    }
    if (req.body.source === 'admin' || req.body.source === 'website') {
      update.source = req.body.source
    }
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })
    const out = vendor.toJSON()
    await logActivity(`Vendor updated: ${out.company || 'Vendor'}`, 'Just now')
    res.json(out)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Vendor not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

/** Move a website registration into Vendor Records. */
router.post('/:id/shift-to-record', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' })
    if (vendor.source === 'admin') {
      return res.json(vendor.toJSON())
    }
    vendor.source = 'admin'
    await vendor.save()
    const out = vendor.toJSON()
    await logActivity(`Vendor registration shifted to records: ${out.company || 'Vendor'}`, 'Just now')
    res.json(out)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Vendor not found' })
    console.error(err)
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
