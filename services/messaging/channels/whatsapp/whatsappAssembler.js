import WhatsAppTemplate from '../../../../models/WhatsAppTemplate.js'
import { applyMergeTags, stripHtml } from '../../mergeTags.js'

const MAX_BODY_SNIPPET = 900

function truncate(text, max) {
  const s = String(text ?? '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/**
 * Build template body parameters from campaign + trainer using template.variableMapping.
 */
export function buildWhatsAppVariables(campaign, trainer, template) {
  const requirementTitle = campaign.subject?.trim() || 'New trainer opening'
  const requirementBody = truncate(
    stripHtml(campaign.bodyHtml || campaign.whatsappBodyText || ''),
    MAX_BODY_SNIPPET
  )
  const skills =
    trainer?.subject?.trim() ||
    (Array.isArray(trainer?.skills) ? trainer.skills.join(', ') : '')

  const context = {
    trainerName: trainer?.name || 'Trainer',
    firstName: (trainer?.name || 'Trainer').split(/\s+/)[0],
    email: trainer?.email || '',
    city: trainer?.city || '',
    state: trainer?.state || '',
    skills: skills || 'As per requirement',
    requirementTitle,
    requirementBody: requirementBody || requirementTitle,
    siteUrl: process.env.SITE_URL || 'https://traineradda.com',
  }

  const mapping = template?.variableMapping?.length
    ? template.variableMapping
    : ['firstName', 'requirementTitle', 'requirementBody']

  return mapping.map((key) => {
    const raw = context[key] ?? applyMergeTags(`{{${key}}}`, trainer, context)
    return truncate(String(raw), 1024)
  })
}

export async function loadWhatsAppTemplate(campaign) {
  const templateId = campaign.whatsappTemplateId?._id || campaign.whatsappTemplateId
  if (!templateId) return null
  return WhatsAppTemplate.findById(templateId).lean()
}

/** Build message payload using a pre-loaded template (one DB read per batch). */
export function buildWhatsAppMessageFromTemplate(campaign, trainer, template) {
  if (!template) throw new Error('WhatsApp template not found')
  const bodyParameters = buildWhatsAppVariables(campaign, trainer, template)
  const preview = previewWhatsAppMessage(campaign, trainer, template)
  return {
    templateName: template.name,
    language: template.language || 'en',
    bodyParameters,
    bodyText: preview.bodyPreview,
  }
}

export function previewWhatsAppMessage(campaign, trainer, template) {
  const variables = buildWhatsAppVariables(campaign, trainer, template)
  const bodyPreview = template?.bodyPreview || ''
  let preview = bodyPreview
  variables.forEach((value, i) => {
    preview = preview.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), value)
    preview = preview.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), value)
  })
  return {
    templateName: template?.name || '',
    language: template?.language || 'en',
    bodyPreview: preview || variables.join(' · '),
    variables,
  }
}
