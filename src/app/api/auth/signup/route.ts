import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

// RFC-5321 compliant local-part + domain check (good balance of strictness vs coverage)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function generateOtp(): string {
  // Cryptographically random 6-digit code
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

function buildEmailHtml(otp: string): string {
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
            <h1 style="margin:0 0 24px;font-size:22px;color:#0f172a;font-weight:700">Verify your email address</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">
              Enter the code below to complete your account creation. It expires in&nbsp;<strong>10&nbsp;minutes</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 32px 28px">
            <div style="display:inline-block;background:#f0f9ff;border:2px solid #bae6fd;border-radius:10px;padding:18px 36px">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0369a1;font-variant-numeric:tabular-nums;font-family:'Courier New',monospace">${otp}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
              If you didn't create an account with UW Housings, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildEmailText(otp: string, domain: string): string {
  // Plain-text version follows the WebOTP format so Android can auto-suggest the code.
  // iOS Mail and macOS also scan for 4–8 digit codes adjacent to the word "code".
  return `Your UW Housings verification code is: ${otp}

This code expires in 10 minutes.

If you didn't create an account, please ignore this email.

@${domain} #${otp}`
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Replace any previous pending verification for this email
    await prisma.pendingVerification.deleteMany({ where: { email } })
    await prisma.pendingVerification.create({
      data: { email, name: name || null, password: hashed, otp, expiresAt },
    })

    const domain = new URL(process.env.AUTH_URL ?? 'http://localhost:3000').hostname

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      // Subject starts with the code so iOS Mail / macOS Sequoia can offer AutoFill
      subject: `${otp} is your UW Housings verification code`,
      text: buildEmailText(otp, domain),
      html: buildEmailHtml(otp),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
