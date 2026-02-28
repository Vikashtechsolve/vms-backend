import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema(
  {
    color: { type: String, required: true },
    text: { type: String, required: true },
    time_ago: { type: String, required: true },
    date_key: { type: String, required: true },
  },
  { timestamps: true }
)

activitySchema.index({ date_key: 1 })

activitySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    ret.time = ret.time_ago
    ret.dateKey = ret.date_key
    delete ret._id
    delete ret.__v
    delete ret.time_ago
    delete ret.date_key
    return ret
  },
})

export default mongoose.model('Activity', activitySchema)
