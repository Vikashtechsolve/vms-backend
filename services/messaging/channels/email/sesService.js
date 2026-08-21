import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { stripHtml } from '../../mergeTags.js'

let client = null

function getClient() {
  if (!client) {
    client = new SESv2Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    })
  }
  return client
}

export function isSesConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.SES_FROM_EMAIL
  )
}

export async function sendEmail({ to, subject, html, text }) {
  const fromEmail = process.env.SES_FROM_EMAIL
  const fromName = process.env.SES_FROM_NAME || 'TrainerAdda'
  if (!fromEmail) throw new Error('SES_FROM_EMAIL is not configured')

  const command = new SendEmailCommand({
    FromEmailAddress: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text || stripHtml(html), Charset: 'UTF-8' },
        },
      },
    },
  })

  const response = await getClient().send(command)
  return { providerMessageId: response.MessageId || '' }
}
