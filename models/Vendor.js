import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  id: String,
  authorName: String,
  authorInitials: String,
  text: String,
  createdAt: String,
  verified: Boolean,
}, { _id: false })

const vendorSchema = new mongoose.Schema(
  {
    company: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: String, default: '' },
    status: { type: String, default: 'Active' },
    hrName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    skills: { type: String, default: '' },
    hiring: { type: String, default: '' },
    mode: { type: String, default: '' },
    logo: { type: String, default: '' },
    logoTint: { type: String, default: '' },
    /** admin = manual record; website = public registration awaiting shift */
    source: { type: String, enum: ['admin', 'website'], default: 'admin', index: true },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
)

vendorSchema.index({ source: 1 })

vendorSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Vendor', vendorSchema)
