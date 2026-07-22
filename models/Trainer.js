import mongoose from 'mongoose'
import { normalizeContact, normalizeEmail } from '../helpers/trainerFields.js'

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
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
)

trainerSchema.pre('validate', function normalizeFields(next) {
  if (this.email) this.email = normalizeEmail(this.email)
  if (this.contact) {
    this.contact = String(this.contact).trim()
    this.contactNormalized = normalizeContact(this.contact)
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

trainerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.contactNormalized
    return ret
  },
})

export default mongoose.model('Trainer', trainerSchema)
