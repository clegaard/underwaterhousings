import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { email, sessionToken, password } = await req.json()

        if (!email || !sessionToken || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const token = await prisma.passwordResetToken.findFirst({
            where: { email, sessionToken },
            orderBy: { createdAt: 'desc' },
        })

        if (!token) {
            return NextResponse.json(
                { error: 'Invalid or expired session. Please start over.' },
                { status: 400 }
            )
        }

        if (new Date() > token.expiresAt) {
            await prisma.passwordResetToken.delete({ where: { id: token.id } })
            return NextResponse.json(
                { error: 'Session expired. Please start over.' },
                { status: 400 }
            )
        }

        const hashed = await bcrypt.hash(password, 12)

        await prisma.user.update({ where: { email }, data: { password: hashed } })
        await prisma.passwordResetToken.delete({ where: { id: token.id } })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
