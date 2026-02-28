import mongoose from 'mongoose'

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
    photo: { type: String, default: '' },
    contact: { type: String, default: '' },
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

trainerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Trainer', trainerSchema)
