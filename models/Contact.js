import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    role: { type: String, default: '' },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

contactSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Contact', contactSchema)
