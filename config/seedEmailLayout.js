import EmailLayout from '../models/EmailLayout.js'

export const DEFAULT_LOGO_URL =
  'https://res.cloudinary.com/dc4gqqd35/image/upload/w_280,f_auto,q_auto/v1787319069/traineradda_bfnnbn.jpg'

/** Header opens the content cell; footer closes it. Logo only — no extra brand text. */
const DEFAULT_HEADER = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:28px 32px 24px;background-color:#ffffff;border-bottom:1px solid #e5e7eb;">
      <a href="{{siteUrl}}" target="_blank" style="text-decoration:none;display:inline-block;">
        <img src="{{logoUrl}}" alt="Trainer Adda — Train. Empower. Excel." width="280" style="display:block;border:0;height:auto;max-width:280px;width:100%;margin:0 auto;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px;background-color:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:12px 16px;background-color:#fff5f5;border-left:4px solid #C1272D;border-radius:0 8px 8px 0;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#C1272D;line-height:1.45;">
              New training opportunity for you
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:20px;font-size:0;line-height:0;background-color:#ffffff;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:8px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1f2937;background-color:#ffffff;">
`

const DEFAULT_FOOTER = `
    </td>
  </tr>
  <tr>
    <td style="padding:20px 32px 28px;font-family:Arial,Helvetica,sans-serif;background-color:#ffffff;border-top:1px solid #f1f5f9;">
      <p style="margin:0 0 4px;font-size:14px;color:#64748b;line-height:1.5;">Best regards,</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#111827;line-height:1.5;">Team Trainer Adda</p>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px;background-color:#2C3447;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td style="width:24px;height:2px;background-color:#C1272D;font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding:0 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.2em;text-transform:uppercase;white-space:nowrap;">
            Train. Empower. Excel.
          </td>
          <td style="width:24px;height:2px;background-color:#64748b;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:#e2e8f0;">
        <a href="mailto:support@traineradda.com" style="color:#ffffff;text-decoration:none;">support@traineradda.com</a>
        <span style="color:#64748b;"> &nbsp;&middot;&nbsp; </span>
        <a href="tel:+918320353164" style="color:#ffffff;text-decoration:none;">+91 83203 53164</a>
      </p>
      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;line-height:1.55;">
        Connecting trainers with colleges &amp; corporates across India
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;">
        <a href="{{siteUrl}}" target="_blank" style="color:#60a5fa;text-decoration:none;font-weight:600;">Visit traineradda.com</a>
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.5;">
        <a href="{{unsubscribeUrl}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from requirement alerts
      </p>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:14px 32px;background-color:#232b3e;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;line-height:1.5;">
      &copy; Trainer Adda. All rights reserved.
    </td>
  </tr>
</table>
`

export async function seedEmailLayout() {
  const payload = {
    name: 'Trainer Adda Standard',
    headerHtml: DEFAULT_HEADER,
    footerHtml: DEFAULT_FOOTER,
    isDefault: true,
    isActive: true,
  }

  const existingDefault = await EmailLayout.findOne({ isDefault: true })
  if (existingDefault) {
    existingDefault.name = payload.name
    existingDefault.headerHtml = payload.headerHtml
    existingDefault.footerHtml = payload.footerHtml
    existingDefault.isActive = true
    await existingDefault.save()
    console.log('Default email layout updated')
    return
  }

  const count = await EmailLayout.countDocuments()
  if (count > 0) return

  await EmailLayout.create(payload)
  console.log('Default email layout seeded')
}
