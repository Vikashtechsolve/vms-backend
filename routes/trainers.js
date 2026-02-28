import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Trainer from '../models/Trainer.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { logActivity } from '../helpers/activities.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB per file
const uploadFields = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'resume', maxCount: 1 }])

const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function uploadImageToCloudinary(buffer) {
  if (!hasCloudinary) return null
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'vms/trainers', resource_type: 'image' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result?.secure_url)
      }
    ).end(buffer)
  })
}

async function uploadResumeToCloudinary(buffer) {
  if (!hasCloudinary) return null
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'vms/trainers/resumes', resource_type: 'raw' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result?.secure_url)
      }
    ).end(buffer)
  })
}

/** Public trainer registration (no auth) - for VMS website */
router.post('/register', uploadFields, async (req, res) => {
  try {
    const b = req.body || {}
    let photo = ''
    let resume = ''
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer)
      if (url) resume = url
    }
    const trainer = await Trainer.create({
      name: b.name ?? '',
      photo,
      resume,
      contact: b.contact ?? '',
      location: b.location ?? '',
      qualification: b.qualification ?? '',
      passingYear: b.passingYear ?? '',
      subject: b.subject ?? '',
      teachingExperience: b.teachingExperience ?? '',
      developmentExperience: b.developmentExperience ?? '',
      totalExperience: b.totalExperience ?? '',
      workLookingFor: b.workLookingFor ?? 'Full-Time Trainer',
      mode: b.mode ?? 'Offline Mode',
      payoutExpectations: b.payoutExpectations ?? '',
    })
    res.status(201).json(trainer.toJSON())
  } catch (err) {
    console.error('Trainer register error:', err)
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Upload failed. Check Cloudinary config.' })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const list = await Trainer.find().sort({ createdAt: -1 })
    res.json(list.map((doc) => doc.toJSON()))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await Trainer.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Trainer not found' })
    res.json(doc.toJSON())
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', uploadFields, async (req, res) => {
  try {
    const b = req.body || {}
    let comments = b.comments
    if (typeof comments === 'string') {
      try { comments = JSON.parse(comments) } catch { comments = [] }
    }
    let photo = b.photo || ''
    let resume = b.resume || ''
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer)
      if (url) resume = url
    }
    const trainer = await Trainer.create({
      name: b.name ?? '',
      photo,
      contact: b.contact ?? '',
      location: b.location ?? '',
      qualification: b.qualification ?? '',
      passingYear: b.passingYear ?? '',
      subject: b.subject ?? '',
      teachingExperience: b.teachingExperience ?? '',
      developmentExperience: b.developmentExperience ?? '',
      totalExperience: b.totalExperience ?? '',
      workLookingFor: b.workLookingFor ?? 'Full-Time Trainer',
      mode: b.mode ?? 'Offline Mode',
      payoutExpectations: b.payoutExpectations ?? '',
      resume,
      comments: comments ?? [],
    })
    const out = trainer.toJSON()
    await logActivity(`New trainer profile added: ${out.name}`, 'Just now')
    res.status(201).json(out)
  } catch (err) {
    console.error('Trainer create/upload error:', err)
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Photo upload failed. Check Cloudinary config.' })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.put('/:id', uploadFields, async (req, res) => {
  try {
    const existing = await Trainer.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Trainer not found' })
    const b = req.body || {}
    let comments = b.comments
    if (typeof comments === 'string') {
      try { comments = JSON.parse(comments) } catch { comments = undefined }
    }
    let photo = (b.photo !== undefined && b.photo !== '') ? b.photo : existing.photo
    let resume = (b.resume !== undefined && b.resume !== '') ? b.resume : existing.resume
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer)
      if (url) resume = url
    }
    existing.name = b.name ?? existing.name
    existing.photo = photo
    existing.contact = b.contact ?? existing.contact
    existing.location = b.location ?? existing.location
    existing.qualification = b.qualification ?? existing.qualification
    existing.passingYear = b.passingYear ?? existing.passingYear
    existing.subject = b.subject ?? existing.subject
    existing.teachingExperience = b.teachingExperience ?? existing.teachingExperience
    existing.developmentExperience = b.developmentExperience ?? existing.developmentExperience
    existing.totalExperience = b.totalExperience ?? existing.totalExperience
    existing.workLookingFor = b.workLookingFor ?? existing.workLookingFor
    existing.mode = b.mode ?? existing.mode
    existing.payoutExpectations = b.payoutExpectations ?? existing.payoutExpectations
    existing.resume = resume
    if (comments !== undefined) existing.comments = comments
    await existing.save()
    const out = existing.toJSON()
    await logActivity(`Trainer profile updated: ${out.name}`, 'Just now')
    res.json(out)
  } catch (err) {
    console.error('Trainer update/upload error:', err)
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Photo upload failed. Check Cloudinary config.' })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id)
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' })
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
