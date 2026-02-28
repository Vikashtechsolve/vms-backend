import mongoose from 'mongoose'

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    jobTitle: { type: String, default: '' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    resumeUrl: { type: String, default: '' },
  },
  { timestamps: true }
)

jobApplicationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    ret.jobId = ret.jobId?.toString ? ret.jobId.toString() : ret.jobId
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('JobApplication', jobApplicationSchema)
