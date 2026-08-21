import mongoose from 'mongoose'

/** Stub model — CRUD routes added when WhatsApp channel is implemented. */
const whatsAppTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    providerTemplateId: { type: String, trim: true, default: '' },
    language: { type: String, default: 'en' },
    bodyPreview: { type: String, default: '' },
    variableMapping: { type: [String], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema)
