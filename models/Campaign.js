import mongoose from 'mongoose'

const channelStatsSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    totalRecipients: { type: Number, default: 0 },
    totalBatches: { type: Number, default: 0 },
    completedBatches: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
  },
  { _id: false }
)

const campaignSchema = new mongoose.Schema(
  {
    channels: { type: [String], default: ['email'] },
    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    layoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLayout' },
    subject: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    selectionMode: {
      type: String,
      enum: ['all', 'filter', 'manual'],
      default: 'filter',
    },
    audienceFilter: { type: mongoose.Schema.Types.Mixed, default: {} },
    selectedTrainerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' }],
    excludedTrainerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' }],
    channelStats: {
      type: Map,
      of: channelStatsSchema,
      default: () => new Map(),
    },
    dispatchJobId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
)

campaignSchema.index({ createdAt: -1 })
campaignSchema.index({ status: 1, createdAt: -1 })

campaignSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    if (ret.layoutId) ret.layoutId = ret.layoutId.toString()
    if (ret.channelStats instanceof Map) {
      ret.channelStats = Object.fromEntries(ret.channelStats)
    }
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Campaign', campaignSchema)
