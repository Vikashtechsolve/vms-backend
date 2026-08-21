import mongoose from 'mongoose'

const emailLayoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    headerHtml: { type: String, default: '' },
    footerHtml: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

emailLayoutSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('EmailLayout', emailLayoutSchema)
