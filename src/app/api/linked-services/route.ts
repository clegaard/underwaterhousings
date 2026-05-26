import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/linked-services — returns all linked services for the current user
export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = await prisma.linkedService.findMany({
        where: { userId },
        select: {
            service: true,
            serviceUserId: true,
            serviceUsername: true,
            scopes: true,
            tokenExpiry: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    return NextResponse.json({ services })
}
