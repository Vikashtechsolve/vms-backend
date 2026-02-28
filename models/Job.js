import mongoose from 'mongoose'

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: '' },
    email: { type: String, default: '' },
    contact: { type: String, default: '' },
    skills: { type: String, default: '' },
    experience: { type: String, default: '' },
    trainersNeeded: { type: String, default: '' },
    level: { type: String, default: '' },
    trainingType: { type: String, default: '' },
    mode: { type: String, default: '' },
    duration: { type: String, default: '' },
    location: { type: String, default: '' },
    budget: { type: String, default: '' },
    accommodation: { type: String, default: '' },
    language: { type: String, default: '' },
    visibility: { type: String, default: 'Private' },
    requirements: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

jobSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Job', jobSchema)
