export const CHANNEL_IDS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
}

export const MERGE_TAGS = [
  'trainerName',
  'firstName',
  'email',
  'city',
  'state',
  'skills',
  'unsubscribeUrl',
]

/**
 * @typedef {Object} MessagePayload
 * @property {string} [subject]
 * @property {string} [bodyHtml]
 * @property {string} [bodyText]
 */

/**
 * @typedef {Object} SendResult
 * @property {string} [providerMessageId]
 * @property {string} [error]
 */

/**
 * Attachable messaging channel contract.
 * @typedef {Object} MessagingChannel
 * @property {string} id
 * @property {string} label
 * @property {string} queueName
 * @property {boolean} isConfigured
 * @property {number} batchSize
 * @property {{ max: number, duration: number }} rateLimit
 * @property {(trainer: object) => { eligible: boolean, skipReason?: string }} isTrainerEligible
 * @property {(trainer: object) => string | null} getRecipientAddress
 * @property {(campaign: object) => string[]} validateCampaign
 * @property {(campaign: object, trainer: object, layoutOrTemplate?: object) => MessagePayload} buildMessage
 * @property {(params: object) => Promise<SendResult>} send
 */

export function queueNameForChannel(channelId) {
  return `campaign-${channelId}`
}
