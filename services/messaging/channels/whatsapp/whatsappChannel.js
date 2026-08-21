import { CHANNEL_IDS, queueNameForChannel } from '../../types.js'
import { registerChannel } from '../../channelRegistry.js'

export const whatsappChannel = {
  id: CHANNEL_IDS.WHATSAPP,
  label: 'WhatsApp',
  queueName: queueNameForChannel(CHANNEL_IDS.WHATSAPP),
  isConfigured: false,
  batchSize: 50,
  rateLimit: { max: 10, duration: 1000 },

  isTrainerEligible() {
    return { eligible: false, skipReason: 'not_implemented' }
  },

  getRecipientAddress() {
    return null
  },

  validateCampaign() {
    return ['WhatsApp channel is not configured yet']
  },

  async buildMessage() {
    return { bodyText: '' }
  },

  async send() {
    return { error: 'WhatsApp channel is not implemented' }
  },
}

export function registerWhatsAppChannel() {
  registerChannel(whatsappChannel)
}
