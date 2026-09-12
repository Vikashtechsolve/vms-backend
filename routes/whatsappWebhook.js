import { Router } from 'express'
import Trainer from '../models/Trainer.js'
import CampaignRecipient from '../models/CampaignRecipient.js'
import { verifyWebhookSignature } from '../services/messaging/channels/whatsapp/metaWhatsAppService.js'
import { markRecipientDeliveryFailed } from '../services/messaging/campaignStats.js'

const router = Router()

/** Meta webhook verification (GET). */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    return res.status(200).send(challenge)
  }
  return res.status(403).send('Forbidden')
})

/** Meta webhook events (POST). */
router.post('/', async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
    const signature = req.headers['x-hub-signature-256']

    if (process.env.WHATSAPP_APP_SECRET?.trim() && rawBody) {
      if (!verifyWebhookSignature(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    const payload = rawBody ? JSON.parse(rawBody) : {}
    const entries = payload.entry || []

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {}

        for (const status of value.statuses || []) {
          const wamid = status.id
          if (!wamid) continue

          const recipient = await CampaignRecipient.findOne({ providerMessageId: wamid })
          if (!recipient) continue

          if (status.status === 'failed') {
            await markRecipientDeliveryFailed(
              wamid,
              status.errors?.[0]?.title || 'Delivery failed'
            )
          }
        }

        for (const message of value.messages || []) {
          const from = message.from
          const text = message.text?.body?.trim().toLowerCase()
          if (!from || !text) continue

          if (['stop', 'unsubscribe', 'opt out', 'optout'].includes(text)) {
            const digits = String(from).replace(/\D/g, '')
            const last10 = digits.slice(-10)
            await Trainer.updateMany(
              {
                $or: [
                  { contactNormalized: digits },
                  { contactNormalized: last10 },
                ],
              },
              { whatsappOptIn: false, whatsappOptUnsubscribedAt: new Date() }
            )
          }
        }
      }
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    res.status(200).json({ ok: true })
  }
})

export default router
