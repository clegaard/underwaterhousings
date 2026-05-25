import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json()

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        const token = await prisma.passwordResetToken.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        })

        if (!token || !token.otp) {
            return NextResponse.json(
                { error: 'No reset code found. Please request a new one.' },
                { status: 400 }
            )
        }

        if (new Date() > token.expiresAt) {
            await prisma.passwordResetToken.delete({ where: { id: token.id } })
            return NextResponse.json(
                { error: 'Code has expired. Please request a new one.' },
                { status: 400 }
            )
        }

        if (token.otp !== String(otp).trim()) {
            return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
        }

        // OTP is valid — exchange it for a one-time session token so the user
        // can set their new password without time pressure.
        const sessionToken = crypto.randomUUID()
        const sessionExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        await prisma.passwordResetToken.update({
            where: { id: token.id },
            data: { otp: null, sessionToken, expiresAt: sessionExpiry },
        })

        return NextResponse.json({ sessionToken })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
