import mongoose from 'mongoose'

const emailLayoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, default: '', index: true },
    headerHtml: { type: String, default: '' },
    footerHtml: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    /** System starter layout — cannot be deleted. */
    isProtected: { type: Boolean, default: false },
  },
  { timestamps: true }
)

emailLayoutSchema.index({ slug: 1 }, { unique: true, sparse: true })

emailLayoutSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('EmailLayout', emailLayoutSchema)
