import EmailLayout from '../../../../models/EmailLayout.js'
import { applyMergeTags } from '../../mergeTags.js'

export async function assembleEmailHtml({ layout, campaign, trainer, extraTags = {} }) {
  const layoutDoc =
    layout ||
    (campaign.layoutId ? await EmailLayout.findById(campaign.layoutId).lean() : null)

  const baseUrl = (process.env.APP_PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, '')
  const unsubscribeUrl =
    extraTags.unsubscribeUrl ||
    `${baseUrl}/api/unsubscribe/${trainer.unsubscribeToken || ''}`

  const tags = {
    unsubscribeUrl,
    logoUrl:
      process.env.EMAIL_LOGO_URL ||
      'https://res.cloudinary.com/dc4gqqd35/image/upload/w_280,f_auto,q_auto/v1787319069/traineradda_bfnnbn.jpg',
    siteUrl: (process.env.SITE_URL || 'https://traineradda.com').replace(/\/$/, ''),
    ...extraTags,
  }
  const subject = applyMergeTags(campaign.subject, trainer, tags)
  const bodyInner = applyMergeTags(campaign.bodyHtml, trainer, tags)

  const headerHtml = layoutDoc?.headerHtml
    ? applyMergeTags(layoutDoc.headerHtml, trainer, tags)
    : ''
  const footerHtml = layoutDoc?.footerHtml
    ? applyMergeTags(layoutDoc.footerHtml, trainer, tags)
    : `<p style="font-size:12px;color:#666;"><a href="${unsubscribeUrl}">Unsubscribe</a></p>`

  const bodyHtml = `${headerHtml}${bodyInner}${footerHtml}`

  return { subject, bodyHtml }
}
