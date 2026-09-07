import { Router } from 'express'
import {
  markRecipientDeliveryFailed,
  refreshCampaignStatusFromRecipients,
} from '../services/messaging/campaignStats.js'
import { finalizeCampaignIfDone } from '../services/messaging/campaignService.js'

const router = Router()

function parseSnsBody(body) {
  if (!body) return null
  if (typeof body === 'object') return body
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function bounceReason(message) {
  const bounce = message.bounce || {}
  const recipient = bounce.bouncedRecipients?.[0]
  const parts = [
    bounce.bounceType,
    bounce.bounceSubType,
    recipient?.diagnosticCode,
  ].filter(Boolean)
  return parts.length ? `Bounce: ${parts.join(' — ')}` : 'Bounce: delivery failed'
}

function complaintReason(message) {
  const complaint = message.complaint || {}
  const type = complaint.complaintFeedbackType
  return type ? `Complaint: ${type}` : 'Complaint: recipient reported spam'
}

router.post('/', async (req, res) => {
  try {
    const envelope = parseSnsBody(req.body)
    if (!envelope) {
      return res.status(400).send('Invalid payload')
    }

    if (envelope.Type === 'SubscriptionConfirmation' && envelope.SubscribeURL) {
      await fetch(envelope.SubscribeURL)
      console.log('SES SNS subscription confirmed')
      return res.status(200).send('OK')
    }

    if (envelope.Type !== 'Notification' || !envelope.Message) {
      return res.status(200).send('OK')
    }

    const message = parseSnsBody(envelope.Message)
    if (!message?.notificationType) {
      return res.status(200).send('OK')
    }

    const messageId = message.mail?.messageId
    if (!messageId) {
      return res.status(200).send('OK')
    }

    if (message.notificationType === 'Bounce') {
      const bounceType = message.bounce?.bounceType
      if (bounceType === 'Transient') {
        return res.status(200).send('OK')
      }

      const recipient = await markRecipientDeliveryFailed(messageId, bounceReason(message))
      if (recipient) {
        await refreshCampaignStatusFromRecipients(recipient.campaignId)
        await finalizeCampaignIfDone(recipient.campaignId)
      }
    }

    if (message.notificationType === 'Complaint') {
      const recipient = await markRecipientDeliveryFailed(messageId, complaintReason(message))
      if (recipient) {
        await refreshCampaignStatusFromRecipients(recipient.campaignId)
        await finalizeCampaignIfDone(recipient.campaignId)
      }
    }

    res.status(200).send('OK')
  } catch (err) {
    console.error('SES webhook error:', err)
    res.status(200).send('OK')
  }
})

export default router
