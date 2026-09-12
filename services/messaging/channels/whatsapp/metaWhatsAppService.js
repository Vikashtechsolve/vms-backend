import crypto from 'crypto'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

export function isWhatsAppConfigured() {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  )
}

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
  }
}

async function graphRequest(path, options = {}) {
  const { accessToken } = getConfig()
  const url = `${GRAPH_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error?.error_user_msg ||
      `WhatsApp API error (${res.status})`
    throw new Error(msg)
  }
  return data
}

/**
 * Send an approved template message via Meta Cloud API.
 * @param {{ to: string, templateName: string, language: string, bodyParameters: string[] }} payload
 */
export async function sendTemplateMessage({ to, templateName, language, bodyParameters = [] }) {
  if (!isWhatsAppConfigured()) {
    throw new Error('WhatsApp is not configured')
  }

  const { phoneNumberId } = getConfig()
  const components = []

  if (bodyParameters.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParameters.map((text) => ({
        type: 'text',
        text: String(text ?? '').slice(0, 1024),
      })),
    })
  }

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language || 'en' },
      ...(components.length ? { components } : {}),
    },
  }

  const data = await graphRequest(`/${phoneNumberId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return {
    providerMessageId: data.messages?.[0]?.id || '',
  }
}

/** Fetch approved message templates from the WhatsApp Business Account. */
export async function fetchMetaTemplates() {
  const { businessAccountId } = getConfig()
  if (!businessAccountId) {
    throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to sync templates')
  }

  const data = await graphRequest(
    `/${businessAccountId}/message_templates?fields=name,status,language,id,components,category&limit=100`
  )

  return data.data || []
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim()
  if (!secret || !signatureHeader) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = String(signatureHeader).replace(/^sha256=/, '')
  return expected === received
}
