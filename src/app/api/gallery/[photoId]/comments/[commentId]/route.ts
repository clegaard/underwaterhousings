import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ photoId: string; commentId: string }> },
) {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = parseInt(session.user.id)

    const { commentId } = await params
    const id = parseInt(commentId)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const comment = await prisma.galleryComment.findUnique({ where: { id } })
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (comment.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.galleryComment.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
