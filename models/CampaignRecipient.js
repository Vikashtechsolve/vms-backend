import mongoose from 'mongoose'

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
    channel: { type: String, required: true, index: true },
    address: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    providerMessageId: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    sentAt: { type: Date },
    batchIndex: { type: Number, default: null },
  },
  { timestamps: true }
)

campaignRecipientSchema.index({ campaignId: 1, status: 1 })
campaignRecipientSchema.index({ campaignId: 1, trainerId: 1, channel: 1 }, { unique: true })

campaignRecipientSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    ret.campaignId = ret.campaignId?.toString()
    ret.trainerId = ret.trainerId?.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('CampaignRecipient', campaignRecipientSchema)
