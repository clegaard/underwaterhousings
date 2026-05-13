import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/** Toggle like – returns { liked: boolean, likeCount: number } */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ photoId: string }> },
) {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = parseInt(session.user.id)

    const { photoId } = await params
    const id = parseInt(photoId)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const existing = await prisma.galleryLike.findUnique({
        where: { photoId_userId: { photoId: id, userId } },
    })

    if (existing) {
        await prisma.galleryLike.delete({ where: { photoId_userId: { photoId: id, userId } } })
    } else {
        await prisma.galleryLike.create({ data: { photoId: id, userId } })
    }

    const likeCount = await prisma.galleryLike.count({ where: { photoId: id } })
    return NextResponse.json({ liked: !existing, likeCount })
}
