import { Router } from 'express'
import WhatsAppTemplate from '../models/WhatsAppTemplate.js'
import { isWhatsAppConfigured } from '../services/messaging/channels/whatsapp/metaWhatsAppService.js'

const DEFAULT_TEMPLATE = {
  name: 'trainer_opening_alert',
  language: 'en',
  category: 'MARKETING',
  bodyPreview:
    'Hi {{1}},\n\nNew trainer opening from Trainer Adda:\n\n*{{2}}*\n\n{{3}}\n\nVisit traineradda.com for more details.\nReply STOP to opt out.',
  variableMapping: ['firstName', 'requirementTitle', 'requirementBody'],
  status: 'approved',
  isActive: true,
}

export async function seedWhatsAppTemplate() {
  if (!isWhatsAppConfigured()) return

  const count = await WhatsAppTemplate.countDocuments()
  if (count > 0) return

  await WhatsAppTemplate.create(DEFAULT_TEMPLATE)
  console.log('Seeded default WhatsApp template: trainer_opening_alert')
}
