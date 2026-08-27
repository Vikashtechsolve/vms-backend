import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import Trainer from '../models/Trainer.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { logActivity } from '../helpers/activities.js'
import {
  buildTrainerData,
  checkTrainerAvailability,
  findTrainerConflict,
  trainerDuplicateMessage,
  validateTrainerInput,
  validateTrainerOptionalFields,
} from '../helpers/trainerFields.js'
import { resolveTrainerLocation } from '../helpers/locationFields.js'
import {
  buildTrainerPagination,
  buildTrainerQuery,
  buildTrainerSort,
  getTrainerFilterOptions,
} from '../helpers/trainerQuery.js'
import { applyTrainerTags, syncTrainerTagCounts } from '../helpers/trainerTagService.js'
import { toSlugList } from '../helpers/trainerTagUtils.js'

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
      { folder: 'traineradda/trainers', resource_type: 'image' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result?.secure_url)
      }
    ).end(buffer)
  })
}

async function uploadResumeToCloudinary(buffer, originalName = 'resume') {
  if (!hasCloudinary) return null
  const rawName = String(originalName || 'resume').replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const extMatch = rawName.match(/\.([a-z0-9]{2,5})$/i)
  const ext = extMatch ? extMatch[1].toLowerCase() : ''
  const base = rawName.replace(/\.[^.]+$/, '') || 'resume'
  // Include extension in public_id so Cloudinary URLs remain previewable.
  const publicId = `${Date.now()}-${base}${ext ? `.${ext}` : ''}`
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'traineradda/trainers/resumes',
        resource_type: 'raw',
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
      },
      (err, result) => {
        if (err) reject(err)
        else resolve(result?.secure_url)
      }
    ).end(buffer)
  })
}

/** Parse tagSlugs from JSON string (FormData) or array. Website registration must not set tags. */
function parseTagSlugsInput(b, allowTags) {
  if (!allowTags) return undefined
  if (b.tagSlugs == null) return undefined
  if (Array.isArray(b.tagSlugs)) return b.tagSlugs
  if (typeof b.tagSlugs === 'string') {
    const trimmed = b.tagSlugs.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : toSlugList(trimmed)
    } catch {
      return toSlugList(trimmed)
    }
  }
  return []
}

async function saveTrainerTags(trainer, tagSlugsInput, previousSlugs = []) {
  if (tagSlugsInput === undefined) return
  await applyTrainerTags(trainer, tagSlugsInput)
  const affected = [...new Set([...(previousSlugs || []), ...(trainer.tagSlugs || [])])]
  await syncTrainerTagCounts(affected)
}

/** Multer can put `{}` on file field names in req.body; only accept real strings. */
function bodyString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/** Public trainer registration (no auth) - for Trainer Adda website */
router.post('/register', uploadFields, async (req, res) => {
  try {
    const b = req.body || {}
    const validated = validateTrainerInput(b)
    if (validated.errors.length) {
      return res.status(400).json({ error: validated.errors[0] })
    }

    const optional = validateTrainerOptionalFields(b)
    if (optional.errors.length) {
      return res.status(400).json({ error: optional.errors[0] })
    }

    const place = resolveTrainerLocation(b)
    if (place.errors.length) {
      return res.status(400).json({ error: place.errors[0] })
    }

    const conflict = await findTrainerConflict(Trainer, validated)
    if (conflict) return res.status(409).json({ error: conflict })

    let photo = ''
    let resume = ''
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer, req.files.resume[0].originalname)
      if (url) resume = url
    }
    const trainer = await Trainer.create({
      ...buildTrainerData(b, validated, optional, place),
      photo,
      resume,
      source: 'website',
      tags: [],
      tagSlugs: [],
    })
    res.status(201).json(trainer.toJSON())
  } catch (err) {
    console.error('Trainer register error:', err)
    const duplicate = trainerDuplicateMessage(err)
    if (duplicate) return res.status(409).json({ error: duplicate })
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Upload failed. Check Cloudinary config.' })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.use(authMiddleware)

/** Filtered, sorted and paginated trainer list. */
router.get('/', async (req, res) => {
  try {
    const filter = buildTrainerQuery(req.query)
    const sort = buildTrainerSort(req.query.sort)
    const { page, limit, skip } = buildTrainerPagination(req.query)

    const [items, total] = await Promise.all([
      Trainer.find(filter).sort(sort).skip(skip).limit(limit),
      Trainer.countDocuments(filter),
    ])

    res.json({
      items: items.map((doc) => doc.toJSON()),
      total,
      page,
      limit,
      pages: Math.max(Math.ceil(total / limit), 1),
    })
  } catch (err) {
    console.error('Trainer list error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/** Facet values for the filter panel, derived from the existing records. */
router.get('/filter-options', async (req, res) => {
  try {
    res.json(await getTrainerFilterOptions(Trainer, req.query))
  } catch (err) {
    console.error('Trainer filter options error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/** Live duplicate check for admin form (single query for email + mobile). */
router.get('/check-availability', async (req, res) => {
  try {
    const { email, contact, excludeId } = req.query
    const result = await checkTrainerAvailability(Trainer, {
      email: bodyString(email),
      contact: bodyString(contact),
      excludeId: bodyString(excludeId) || undefined,
    })
    res.json(result)
  } catch (err) {
    console.error('Trainer availability check error:', err)
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
    const validated = validateTrainerInput(b)
    if (validated.errors.length) {
      return res.status(400).json({ error: validated.errors[0] })
    }

    const optional = validateTrainerOptionalFields(b)
    if (optional.errors.length) {
      return res.status(400).json({ error: optional.errors[0] })
    }

    const place = resolveTrainerLocation(b)
    if (place.errors.length) {
      return res.status(400).json({ error: place.errors[0] })
    }

    const conflict = await findTrainerConflict(Trainer, validated)
    if (conflict) return res.status(409).json({ error: conflict })

    let comments = b.comments
    if (typeof comments === 'string') {
      try { comments = JSON.parse(comments) } catch { comments = [] }
    }
    let photo = bodyString(b.photo)
    let resume = bodyString(b.resume)
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
      else if (!hasCloudinary) {
        return res.status(502).json({ error: 'Photo upload failed. Cloudinary is not configured.' })
      }
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer, req.files.resume[0].originalname)
      if (url) resume = url
      else if (!hasCloudinary) {
        return res.status(502).json({ error: 'Resume upload failed. Cloudinary is not configured.' })
      }
    }
    const trainer = await Trainer.create({
      ...buildTrainerData(b, validated, optional, place),
      photo,
      resume,
      comments: comments ?? [],
      source: 'admin',
      tags: [],
      tagSlugs: [],
    })
    await saveTrainerTags(trainer, parseTagSlugsInput(b, true))
    await trainer.save()
    const out = trainer.toJSON()
    await logActivity(`New trainer profile added: ${out.name}`, 'Just now')
    res.status(201).json(out)
  } catch (err) {
    console.error('Trainer create/upload error:', err)
    const duplicate = trainerDuplicateMessage(err)
    if (duplicate) return res.status(409).json({ error: duplicate })
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

    const validated = validateTrainerInput({
      name: b.name ?? existing.name,
      email: b.email ?? existing.email,
      contact: b.contact ?? existing.contact,
    }, { requireEmail: false })
    if (validated.errors.length) {
      return res.status(400).json({ error: validated.errors[0] })
    }

    const optional = validateTrainerOptionalFields({
      rating: b.rating !== undefined ? b.rating : existing.rating,
      linkedinUrl: b.linkedinUrl !== undefined ? b.linkedinUrl : existing.linkedinUrl,
      status: b.status !== undefined ? b.status : existing.status,
      additionalDetails: b.additionalDetails !== undefined ? b.additionalDetails : existing.additionalDetails,
    })
    if (optional.errors.length) {
      return res.status(400).json({ error: optional.errors[0] })
    }

    const place = resolveTrainerLocation({
      city: b.city !== undefined ? b.city : existing.city,
      state: b.state !== undefined ? b.state : existing.state,
      location: b.location !== undefined ? b.location : existing.location,
    })
    if (place.errors.length) {
      return res.status(400).json({ error: place.errors[0] })
    }

    const conflict = await findTrainerConflict(Trainer, {
      ...validated,
      excludeId: existing._id,
    })
    if (conflict) return res.status(409).json({ error: conflict })

    let comments = b.comments
    if (typeof comments === 'string') {
      try { comments = JSON.parse(comments) } catch { comments = undefined }
    }
    let photo = bodyString(b.photo, existing.photo)
    let resume = bodyString(b.resume, existing.resume)
    if (req.files?.photo?.[0]?.buffer) {
      const url = await uploadImageToCloudinary(req.files.photo[0].buffer)
      if (url) photo = url
      else if (!hasCloudinary) {
        return res.status(502).json({ error: 'Photo upload failed. Cloudinary is not configured.' })
      }
    }
    if (req.files?.resume?.[0]?.buffer) {
      const url = await uploadResumeToCloudinary(req.files.resume[0].buffer, req.files.resume[0].originalname)
      if (url) resume = url
      else if (!hasCloudinary) {
        return res.status(502).json({ error: 'Resume upload failed. Cloudinary is not configured.' })
      }
    }
    const previousTagSlugs = [...(existing.tagSlugs || [])]
    existing.name = validated.name
    existing.email = validated.email
    existing.contact = validated.contact
    existing.contactNormalized = validated.contactNormalized
    existing.photo = photo
    existing.location = place.location
    existing.city = place.city
    existing.state = place.state
    existing.qualification = b.qualification ?? existing.qualification
    existing.passingYear = b.passingYear ?? existing.passingYear
    existing.subject = b.subject ?? existing.subject
    existing.teachingExperience = b.teachingExperience ?? existing.teachingExperience
    existing.developmentExperience = b.developmentExperience ?? existing.developmentExperience
    existing.totalExperience = b.totalExperience ?? existing.totalExperience
    existing.workLookingFor = b.workLookingFor ?? existing.workLookingFor
    existing.mode = b.mode ?? existing.mode
    existing.payoutExpectations = b.payoutExpectations ?? existing.payoutExpectations
    existing.rating = optional.rating
    existing.linkedinUrl = optional.linkedinUrl
    existing.status = optional.status
    existing.additionalDetails = optional.additionalDetails
    existing.resume = resume
    if (comments !== undefined) existing.comments = comments
    await saveTrainerTags(existing, parseTagSlugsInput(b, true), previousTagSlugs)
    await existing.save()
    const out = existing.toJSON()
    await logActivity(`Trainer profile updated: ${out.name}`, 'Just now')
    res.json(out)
  } catch (err) {
    console.error('Trainer update/upload error:', err)
    const duplicate = trainerDuplicateMessage(err)
    if (duplicate) return res.status(409).json({ error: duplicate })
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Photo upload failed. Check Cloudinary config.' })
    }
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

/** Move a website registration into Trainer Records. */
router.post('/:id/shift-to-record', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' })
    if (trainer.source === 'admin') {
      return res.json(trainer.toJSON())
    }
    trainer.source = 'admin'
    await trainer.save()
    const out = trainer.toJSON()
    await logActivity(`Trainer registration shifted to records: ${out.name}`, 'Just now')
    res.json(out)
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id)
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' })
    const previousTagSlugs = [...(trainer.tagSlugs || [])]
    await trainer.deleteOne()
    await syncTrainerTagCounts(previousTagSlugs)
    res.status(204).send()
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Trainer not found' })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
