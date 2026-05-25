import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json()

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        const pending = await prisma.pendingVerification.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        })

        if (!pending) {
            return NextResponse.json(
                { error: 'No pending verification found. Please sign up again.' },
                { status: 400 }
            )
        }

        if (new Date() > pending.expiresAt) {
            await prisma.pendingVerification.delete({ where: { id: pending.id } })
            return NextResponse.json(
                { error: 'Code has expired. Please sign up again.' },
                { status: 400 }
            )
        }

        if (pending.otp !== String(otp).trim()) {
            return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
        }

        // Check once more that the email hasn't been taken between signup and verification
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            await prisma.pendingVerification.delete({ where: { id: pending.id } })
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
        }

        await prisma.user.create({
            data: { email: pending.email, name: pending.name, password: pending.password },
        })

        await prisma.pendingVerification.delete({ where: { id: pending.id } })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
