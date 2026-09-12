import mongoose from 'mongoose'

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    /** Meta template name (e.g. trainer_opening_alert) */
    name: { type: String, trim: true, required: true, unique: true },
    providerTemplateId: { type: String, trim: true, default: '' },
    language: { type: String, default: 'en' },
    category: { type: String, default: 'MARKETING' },
    bodyPreview: { type: String, default: '' },
    /** Merge tag keys mapped to {{1}}, {{2}}, … in order */
    variableMapping: {
      type: [String],
      default: ['firstName', 'requirementTitle', 'requirementBody'],
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
)

whatsAppTemplateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema)
