import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

// Factory — NextResponse objects must not be reused across requests
const genericOk = () => NextResponse.json({ success: true })

function generateOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

function buildHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr>
          <td style="padding:32px 32px 0">
            <p style="margin:0 0 4px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600">UW Housings</p>
            <h1 style="margin:0 0 24px;font-size:22px;color:#0f172a;font-weight:700">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">
              Enter the code below to set a new password. It expires in&nbsp;<strong>10&nbsp;minutes</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 32px 28px">
            <div style="display:inline-block;background:#fef3c7;border:2px solid #fcd34d;border-radius:10px;padding:18px 36px">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#92400e;font-variant-numeric:tabular-nums;font-family:'Courier New',monospace">${otp}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') return genericOk()

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    })

    // OAuth-only users have no password to reset — respond generically
    if (!user || !user.password) return genericOk()

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.passwordResetToken.deleteMany({ where: { email } })
    await prisma.passwordResetToken.create({ data: { email, otp, expiresAt } })

    const domain = new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000').hostname

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: `${otp} is your UW Housings password reset code`,
      text: `Your UW Housings password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n@${domain} #${otp}`,
      html: buildHtml(otp),
    })

    if (sendError) {
      console.error('[forgot-password] Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return genericOk()
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
