import mongoose from 'mongoose'

const importantLinkSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
)

importantLinkSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('ImportantLink', importantLinkSchema)
