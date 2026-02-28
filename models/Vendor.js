import mongoose from 'mongoose'

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
  },
  { timestamps: true }
)

vendorSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Vendor', vendorSchema)
