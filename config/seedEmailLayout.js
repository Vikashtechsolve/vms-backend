import EmailLayout from '../models/EmailLayout.js'

/** Header opens the content cell; footer closes it. No outer wrapper — safe for admin preview. */
const DEFAULT_HEADER = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border-collapse:collapse;">
  <tr>
    <td style="padding:22px 28px 18px;background-color:#ffffff;border-bottom:1px solid #e5e7eb;">
      <a href="{{siteUrl}}" target="_blank" style="text-decoration:none;display:block;">
        <img src="{{logoUrl}}" alt="Trainer Adda" width="200" style="display:block;border:0;height:auto;max-width:200px;width:200px;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 28px;background-color:#fef2f2;border-bottom:1px solid #fecaca;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#b91c1c;line-height:1.4;">
        New training opportunity for you
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1f2937;background-color:#ffffff;">
`

const DEFAULT_FOOTER = `
    </td>
  </tr>
  <tr>
    <td style="padding:16px 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;background-color:#ffffff;border-top:1px solid #f1f5f9;">
      <p style="margin:0 0 4px;font-size:14px;color:#64748b;">Best regards,</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Team Trainer Adda</p>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 28px;background-color:#2C3447;text-align:center;">
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;color:#ffffff;line-height:1.2;text-transform:uppercase;letter-spacing:0.04em;">
        Trainer <span style="color:#e85d63;">Adda</span>
      </p>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.16em;text-transform:uppercase;">
        Train. Empower. Excel.
      </p>
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#e2e8f0;">
        <a href="mailto:support@traineradda.com" style="color:#ffffff;text-decoration:none;">support@traineradda.com</a>
        <span style="color:#64748b;"> &middot; </span>
        <a href="tel:+918320353164" style="color:#ffffff;text-decoration:none;">+91 83203 53164</a>
      </p>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;line-height:1.5;">
        Connecting trainers with colleges &amp; corporates across India
      </p>
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
        <a href="{{siteUrl}}" target="_blank" style="color:#60a5fa;text-decoration:none;font-weight:600;">traineradda.com</a>
      </p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748b;">
        <a href="{{unsubscribeUrl}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> from requirement alerts
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 28px;background-color:#f8fafc;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;border-top:1px solid #e5e7eb;">
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
