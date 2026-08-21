import { CHANNEL_IDS, queueNameForChannel } from '../../types.js'
import { registerChannel } from '../../channelRegistry.js'

export const smsChannel = {
  id: CHANNEL_IDS.SMS,
  label: 'SMS',
  queueName: queueNameForChannel(CHANNEL_IDS.SMS),
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
    return ['SMS channel is not configured yet']
  },

  async buildMessage() {
    return { bodyText: '' }
  },

  async send() {
    return { error: 'SMS channel is not implemented' }
  },
}

export function registerSmsChannel() {
  registerChannel(smsChannel)
}
