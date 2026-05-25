import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { withBase } from '@/lib/images'

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePicture: true, oauthAvatarUrl: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Explicit upload takes priority; fall back to OAuth provider avatar
    const picture = user.profilePicture
        ? withBase(user.profilePicture)
        : (user.oauthAvatarUrl ?? null)

    return NextResponse.json({ profilePicture: picture })
}
