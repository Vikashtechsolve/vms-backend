import { CHANNEL_IDS, queueNameForChannel } from '../../types.js'
import { registerChannel } from '../../channelRegistry.js'
import { normalizeWhatsAppPhone } from '../../../../helpers/phoneUtils.js'
import {
  isWhatsAppConfigured,
  sendTemplateMessage,
} from './metaWhatsAppService.js'
import {
  loadWhatsAppTemplate,
  previewWhatsAppMessage,
  buildWhatsAppMessageFromTemplate,
} from './whatsappAssembler.js'

export const whatsappChannel = {
  id: CHANNEL_IDS.WHATSAPP,
  label: 'WhatsApp',
  queueName: queueNameForChannel(CHANNEL_IDS.WHATSAPP),
  isConfigured: isWhatsAppConfigured(),
  batchSize: 30,
  rateLimit: { max: 8, duration: 1000 },

  isTrainerEligible(trainer) {
    const phone = normalizeWhatsAppPhone(trainer)
    if (!phone) return { eligible: false, skipReason: 'no_phone' }
    if (trainer.whatsappOptIn !== true) return { eligible: false, skipReason: 'whatsapp_opt_out' }
    if (trainer.whatsappOptUnsubscribedAt) {
      return { eligible: false, skipReason: 'whatsapp_unsubscribed' }
    }
    return { eligible: true }
  },

  getRecipientAddress(trainer) {
    return normalizeWhatsAppPhone(trainer)
  },

  async validateCampaign(campaign) {
    const errors = []
    if (!isWhatsAppConfigured()) errors.push('WhatsApp (Meta) is not configured')
    if (!campaign.whatsappTemplateId) errors.push('WhatsApp template is required')
    if (!campaign.subject?.trim() && !campaign.bodyHtml?.trim()) {
      errors.push('Opening title or requirement details are required for WhatsApp')
    }

    if (campaign.whatsappTemplateId) {
      const template = await loadWhatsAppTemplate(campaign)
      if (!template) errors.push('Selected WhatsApp template not found')
      else if (template.status !== 'approved' || !template.isActive) {
        errors.push(`Template "${template.name}" is not approved or active`)
      }
    }

    return errors
  },

  async buildMessage(campaign, trainer, _layout, templateDoc) {
    const template = templateDoc || await loadWhatsAppTemplate(campaign)
    return buildWhatsAppMessageFromTemplate(campaign, trainer, template)
  },

  async send({ address, message }) {
    try {
      const result = await sendTemplateMessage({
        to: address,
        templateName: message.templateName,
        language: message.language,
        bodyParameters: message.bodyParameters,
      })
      return { providerMessageId: result.providerMessageId }
    } catch (err) {
      return { error: err.message || 'WhatsApp send failed' }
    }
  },
}

export function registerWhatsAppChannel() {
  whatsappChannel.isConfigured = isWhatsAppConfigured()
  registerChannel(whatsappChannel)
}

export { previewWhatsAppMessage, loadWhatsAppTemplate, buildWhatsAppMessageFromTemplate }
