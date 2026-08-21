import crypto from 'crypto'
import mongoose from 'mongoose'
import { normalizeContact, normalizeEmail } from '../helpers/trainerFields.js'
import { deriveTrainerFacets } from './../helpers/trainerFacets.js'

const commentSchema = new mongoose.Schema({
  id: String,
  authorName: String,
  authorInitials: String,
  text: String,
  createdAt: String,
  verified: Boolean,
}, { _id: false })

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    photo: { type: String, default: '' },
    contact: { type: String, default: '' },
    contactNormalized: { type: String, default: '' },
    location: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    qualification: { type: String, default: '' },
    passingYear: { type: String, default: '' },
    subject: { type: String, default: '' },
    teachingExperience: { type: String, default: '' },
    developmentExperience: { type: String, default: '' },
    totalExperience: { type: String, default: '' },
    workLookingFor: { type: String, default: 'Full-Time Trainer' },
    mode: { type: String, default: 'Offline Mode' },
    payoutExpectations: { type: String, default: '' },
    resume: { type: String, default: '' },
    rating: { type: Number, min: 0, max: 10, default: null },
    linkedinUrl: { type: String, default: '' },
    status: { type: String, enum: ['', 'available', 'not_available'], default: '' },
    /** admin = manual record; website = public registration awaiting shift */
    source: { type: String, enum: ['admin', 'website'], default: 'admin', index: true },
    additionalDetails: { type: String, default: '' },
    comments: { type: [commentSchema], default: [] },

    // Derived from the free-text fields above so the list query can filter/sort fast.
    skills: { type: [String], default: [] },
    skillTags: { type: [String], default: [] },
    experienceYears: { type: Number, default: null },
    workTypes: { type: [String], default: [] },
    modes: { type: [String], default: [] },
    qualificationTag: { type: String, default: '' },

    emailOptIn: { type: Boolean, default: true },
    whatsappOptIn: { type: Boolean, default: false },
    smsOptIn: { type: Boolean, default: false },
    unsubscribedAt: { type: Date },
    whatsappOptUnsubscribedAt: { type: Date },
    unsubscribeToken: { type: String, default: '' },
  },
  { timestamps: true }
)

trainerSchema.pre('validate', function normalizeFields(next) {
  if (this.email) this.email = normalizeEmail(this.email)
  if (this.contact) {
    this.contact = String(this.contact).trim()
    this.contactNormalized = normalizeContact(this.contact)
  }

  // Derived here rather than per route so every write path stays in sync.
  Object.assign(this, deriveTrainerFacets(this))
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(24).toString('hex')
  }
  next()
})

trainerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $gt: '' } } }
)
trainerSchema.index(
  { contactNormalized: 1 },
  { unique: true, partialFilterExpression: { contactNormalized: { $gt: '' } } }
)
trainerSchema.index({ city: 1, state: 1 })
trainerSchema.index({ skillTags: 1 })
trainerSchema.index({ qualificationTag: 1 })
trainerSchema.index({ workTypes: 1 })
trainerSchema.index({ modes: 1 })
trainerSchema.index({ status: 1 })
trainerSchema.index({ source: 1 })
trainerSchema.index({ rating: -1 })
trainerSchema.index({ experienceYears: -1 })
trainerSchema.index({ createdAt: -1 })

trainerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.contactNormalized
    delete ret.skillTags
    delete ret.qualificationTag
    return ret
  },
})

export default mongoose.model('Trainer', trainerSchema)
