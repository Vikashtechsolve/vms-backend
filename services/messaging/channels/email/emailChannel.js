import { CHANNEL_IDS, queueNameForChannel } from '../../types.js'
import { assembleEmailHtml } from './emailAssembler.js'
import { isSesConfigured, sendEmail } from './sesService.js'
import { stripHtml } from '../../mergeTags.js'
import { registerChannel } from '../../channelRegistry.js'

export const emailChannel = {
  id: CHANNEL_IDS.EMAIL,
  label: 'Email',
  queueName: queueNameForChannel(CHANNEL_IDS.EMAIL),
  isConfigured: isSesConfigured(),
  batchSize: 50,
  rateLimit: { max: 14, duration: 1000 },

  isTrainerEligible(trainer) {
    if (!trainer.email?.trim()) return { eligible: false, skipReason: 'no_email' }
    if (trainer.emailOptIn === false) return { eligible: false, skipReason: 'opt_out' }
    if (trainer.unsubscribedAt) return { eligible: false, skipReason: 'unsubscribed' }
    return { eligible: true }
  },

  getRecipientAddress(trainer) {
    const email = trainer.email?.trim()
    return email || null
  },

  validateCampaign(campaign) {
    const errors = []
    if (!campaign.subject?.trim()) errors.push('Subject is required')
    if (!campaign.bodyHtml?.trim()) errors.push('Email body is required')
    if (!campaign.layoutId) errors.push('Email layout is required')
    if (!isSesConfigured()) errors.push('AWS SES is not configured')
    return errors
  },

  async buildMessage(campaign, trainer, layout) {
    const { subject, bodyHtml } = await assembleEmailHtml({ layout, campaign, trainer })
    return {
      subject,
      bodyHtml,
      bodyText: stripHtml(bodyHtml),
    }
  },

  async send({ address, message }) {
    const result = await sendEmail({
      to: address,
      subject: message.subject,
      html: message.bodyHtml,
      text: message.bodyText,
    })
    return { providerMessageId: result.providerMessageId }
  },
}

export function registerEmailChannelSync() {
  emailChannel.isConfigured = isSesConfigured()
  registerChannel(emailChannel)
}
