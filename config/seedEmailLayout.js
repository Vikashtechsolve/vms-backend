import EmailLayout from '../models/EmailLayout.js'

export const DEFAULT_LOGO_URL =
  'https://res.cloudinary.com/dc4gqqd35/image/upload/w_350,f_auto,q_auto/v1787319069/traineradda_bfnnbn.jpg'

/**
 * Header opens the outer shell + white card and leaves the body <td> open.
 * Footer closes that <td>, adds sign-off + brand footer, then closes all tables.
 * Never close the main card in the header — bodyHtml is inserted between them.
 */
const DEFAULT_HEADER = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background-color:#f4f5f7;">
  <tr>
    <td align="center" style="padding:28px 12px;background-color:#f4f5f7;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border-collapse:collapse;border:1px solid #e8eaed;">
        <tr>
          <td style="padding:24px 32px 20px;background-color:#ffffff;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tr>
                <td align="left" valign="middle" style="width:62%;padding:0;text-align:left;">
                  <a href="{{siteUrl}}" target="_blank" style="display:inline-block;text-decoration:none;">
                    <img src="{{logoUrl}}" alt="Trainer Adda" width="175" style="display:block;width:175px;max-width:175px;height:auto;border:0;outline:none;text-decoration:none;" />
                  </a>
                </td>
                <td align="right" valign="middle" style="width:38%;padding:0;text-align:right;font-family:Arial,Helvetica,sans-serif;">
                  <a href="{{siteUrl}}" target="_blank" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:600;color:#C1272D;text-decoration:none;white-space:nowrap;">
                    Visit Website&nbsp;&rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="height:3px;padding:0;background-color:#C1272D;font-size:0;line-height:3px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:14px 32px 0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:500;letter-spacing:0.25px;color:#6b7280;">
              Train. Empower. Excel.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;background-color:#ffffff;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tr>
                <td style="padding:12px 16px;background-color:#fff5f5;border-left:4px solid #C1272D;border-radius:0 6px 6px 0;">
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
          <td style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;background-color:#ffffff;">
`

const DEFAULT_FOOTER = `
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 24px;font-family:Arial,Helvetica,sans-serif;background-color:#ffffff;border-top:1px solid #f1f5f9;">
            <p style="margin:0 0 4px;font-size:14px;color:#64748b;line-height:1.5;">Best regards,</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#111827;line-height:1.5;">Team Trainer Adda</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;background-color:#2C3447;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px;">
              <tr>
                <td style="width:24px;height:2px;background-color:#C1272D;font-size:0;line-height:0;">&nbsp;</td>
                <td style="padding:0 12px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.18em;text-transform:uppercase;white-space:nowrap;">
                  Train. Empower. Excel.
                </td>
                <td style="width:24px;height:2px;background-color:#64748b;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;font-weight:700;color:#ffffff;">
              Trainer Adda
            </p>
            <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#94a3b8;">
              Connecting trainers with colleges &amp; corporates across India
            </p>
            <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:#e2e8f0;">
              <a href="mailto:support@traineradda.com" style="color:#ffffff;text-decoration:none;">support@traineradda.com</a>
              <span style="color:#64748b;"> &nbsp;&middot;&nbsp; </span>
              <a href="tel:+918320353164" style="color:#ffffff;text-decoration:none;">+91 83203 53164</a>
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
            &copy; 2026 Trainer Adda. All rights reserved.
          </td>
        </tr>
      </table>
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
