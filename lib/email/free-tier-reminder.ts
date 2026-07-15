export function freeTierReminderEmail(params: { firstName: string; userId: string }): { subject: string; html: string } {
  const { firstName, userId } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arch.nexplan.io'

  const subject = `Hi ${firstName} — still exploring ArchAI on Scout?`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eeeeee;">

          <!-- Header -->
          <tr>
            <td style="background-color:#000000;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:28px;height:28px;background-color:#ffffff;border-radius:6px;text-align:center;vertical-align:middle;font-weight:800;font-size:14px;color:#000000;">A</td>
                  <td style="padding-left:10px;font-weight:800;font-size:14px;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">ArchAI</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#111111;">Hi ${firstName},</p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#333333;">
                You're still on the <strong>Scout</strong> plan — great for exploring, but you've got more room to grow. Here's what you unlock on a paid plan:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333333;">
                    <strong style="color:#000000;">Azure &amp; GCP</strong> — Scout is AWS only. Pro and up unlock all three clouds.
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333333;">
                    <strong style="color:#000000;">More blueprints</strong> — 25/month on Pro, 150/month on Team, unlimited on Enterprise.
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:#333333;">
                    <strong style="color:#000000;">Brownfield migration</strong> — audit and modernise your existing infrastructure (Team plan and up).
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#000000;border-radius:8px;">
                    <a href="${appUrl}/landing.html#pricing" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Compare plans →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px 0;font-size:13px;line-height:1.6;color:#999999;">
                Not ready yet? No problem — Scout stays free, and we'll check back next week.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:13px;color:#999999;">— Arch Team</p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#bbbbbb;">
                You're receiving this because you signed up for ArchAI's Scout plan.
                <a href="${appUrl}/api/cron/unsubscribe?user=${userId}" style="color:#bbbbbb;">Unsubscribe from these reminders</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  return { subject, html }
}
