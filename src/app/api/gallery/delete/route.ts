import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!dbUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let ids: number[]
    try {
        const body = await request.json()
        ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : []
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (ids.length === 0) {
        return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Fetch only the photos owned by this user (access control)
    const photos = await prisma.galleryPhoto.findMany({
        where: { id: { in: ids }, userId: dbUser.id },
        select: { id: true, imagePath: true },
    })

    if (photos.length === 0) {
        return NextResponse.json({ error: 'No matching photos found' }, { status: 404 })
    }

    await prisma.galleryPhoto.deleteMany({
        where: { id: { in: photos.map(p => p.id) } },
    })

    // Clean up uploaded files from disk (only for user-uploaded paths, not seeded assets)
    const uploadPrefix = '/gallery/uploads/'
    await Promise.allSettled(
        photos
            .filter(p => p.imagePath.startsWith(uploadPrefix))
            .map(p => unlink(path.join(process.cwd(), 'public', p.imagePath)))
    )

    return NextResponse.json({ success: true, deleted: photos.length })
}
