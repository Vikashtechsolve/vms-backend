import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import { logActivity } from '../helpers/activities.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

const router = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function uploadResumeToCloudinary(buffer) {
  if (!hasCloudinary) return null
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'vms/applications/resumes', resource_type: 'raw' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result?.secure_url)
      }
    ).end(buffer)
  })
}

/** Public: get only Public jobs for the Find Jobs page */
router.get('/public', async (req, res) => {
  try {
    const list = await Job.find({ visibility: 'Public' }).sort({ createdAt: -1 }).lean()
    const mapped = list.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      skills: doc.skills ? doc.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      experience: doc.experience,
      level: doc.level,
      trainingType: doc.trainingType,
      trainingMode: doc.mode,
      location: doc.location,
      accommodation: doc.accommodation,
      languages: doc.language ? doc.language.split(',').map((l) => l.trim()).filter(Boolean) : [],
      duration: doc.duration,
      budget: doc.budget,
      trainersNeeded: doc.trainersNeeded,
      requirements: doc.requirements || [],
    }))
    res.json(mapped)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

/** Public: apply for a job */
router.post('/:id/apply', upload.single('resume'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const { name, email, phone } = req.body || {}
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email and phone are required' })
    }

    let resumeUrl = ''
    if (req.file) {
      try {
        resumeUrl = await uploadResumeToCloudinary(req.file.buffer) || ''
      } catch {
        // non-fatal: save application without resume URL
      }
    }

    const application = await JobApplication.create({
      jobId: job._id,
      jobTitle: job.title,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      resumeUrl,
    })

    await logActivity(`New application for job: ${job.title} from ${name}`, 'Just now')
    res.status(201).json({ ok: true, id: application.toJSON().id })
  } catch (err) {
    console.error('Job apply error:', err)
    if (err.name === 'CastError') return res.status(404).json({ error: 'Job not found' })
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

/** Public job submission (no auth) - for VMS website "Post a Job" form */
router.post('/submit', async (req, res) => {
  try {
    const b = req.body || {}
    const job = await Job.create({
      title: b.title ?? '',
      email: b.email ?? '',
      contact: b.contact ?? '',
      skills: b.skills ?? '',
      experience: b.experience ?? '',
      trainersNeeded: b.trainersNeeded ?? '',
      level: b.level ?? '',
      trainingType: b.trainingType ?? '',
      mode: b.mode ?? '',
      duration: b.duration ?? '',
      location: b.location ?? '',
      budget: b.budget ?? '',
      accommodation: b.accommodation ?? '',
      language: b.language ?? '',
      visibility: 'Private',
      requirements: [],
    })
    const out = job.toJSON()
    await logActivity(`New job posted: ${out.title}`, 'Just now')
    res.status(201).json({ ok: true, id: out.id, title: out.title })
  } catch (err) {
    console.error('Job submit error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.use(authMiddleware)

/** Admin: get all applications for a specific job */
router.get('/:id/applications', async (req, res) => {
  try {
    const applications = await JobApplication.find({ jobId: req.params.id })
      .sort({ createdAt: -1 })
      .lean()
    const mapped = applications.map((doc) => ({
      id: doc._id.toString(),
      jobId: doc.jobId?.toString(),
      jobTitle: doc.jobTitle,
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      resumeUrl: doc.resumeUrl,
      appliedAt: doc.createdAt,
    }))
    res.json(mapped)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Job not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', async (req, res) => {
  try {
    const list = await Job.find().sort({ createdAt: -1 }).lean()
    res.json(list.map((doc) => ({ ...doc, id: doc._id.toString(), _id: undefined })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await Job.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Job not found' })
    res.json(doc.toJSON())
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Job not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body || {}
    const job = await Job.create({
      title: b.title ?? '',
      email: b.email ?? '',
      contact: b.contact ?? '',
      skills: b.skills ?? '',
      experience: b.experience ?? '',
      trainersNeeded: b.trainersNeeded ?? '',
      level: b.level ?? '',
      trainingType: b.trainingType ?? '',
      mode: b.mode ?? '',
      duration: b.duration ?? '',
      location: b.location ?? '',
      budget: b.budget ?? '',
      accommodation: b.accommodation ?? '',
      language: b.language ?? '',
      visibility: b.visibility ?? 'Private',
      requirements: b.requirements ?? [],
    })
    const out = job.toJSON()
    await logActivity(`Job posted: ${out.title}`, 'Just now')
    res.status(201).json(out)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {}
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        title: b.title,
        email: b.email,
        contact: b.contact,
        skills: b.skills,
        experience: b.experience,
        trainersNeeded: b.trainersNeeded,
        level: b.level,
        trainingType: b.trainingType,
        mode: b.mode,
        duration: b.duration,
        location: b.location,
        budget: b.budget,
        accommodation: b.accommodation,
        language: b.language,
        visibility: b.visibility,
        requirements: b.requirements,
      },
      { new: true }
    )
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const out = job.toJSON()
    await logActivity(`Job updated: ${out.title}`, 'Just now')
    res.json(out)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Job not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Job not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
