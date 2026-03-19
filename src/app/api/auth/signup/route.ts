import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
        }

        const hashed = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: { email, password: hashed, name: name || null },
            select: { id: true, email: true, name: true, isSuperuser: true, isUser: true },
        })

        return NextResponse.json({ success: true, user }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
