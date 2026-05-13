import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const userSelect = { id: true, name: true, profilePicture: true }

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ photoId: string }> },
) {
    const { photoId } = await params
    const id = parseInt(photoId)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const comments = await prisma.galleryComment.findMany({
        where: { photoId: id, parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
            user: { select: userSelect },
            replies: {
                orderBy: { createdAt: 'asc' },
                include: { user: { select: userSelect } },
            },
        },
    })

    return NextResponse.json({ comments })
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ photoId: string }> },
) {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = parseInt(session.user.id)

    const { photoId } = await params
    const id = parseInt(photoId)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const text: string = typeof body.body === 'string' ? body.body.trim() : ''
    if (!text) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
    if (text.length > 1000) return NextResponse.json({ error: 'Comment too long' }, { status: 400 })

    const parentId: number | null =
        typeof body.parentId === 'number' ? body.parentId : null

    // Validate parent belongs to same photo
    if (parentId !== null) {
        const parent = await prisma.galleryComment.findUnique({ where: { id: parentId } })
        if (!parent || parent.photoId !== id)
            return NextResponse.json({ error: 'Invalid parentId' }, { status: 400 })
    }

    const comment = await prisma.galleryComment.create({
        data: { body: text, photoId: id, userId, parentId },
        include: { user: { select: userSelect } },
    })

    return NextResponse.json({ comment }, { status: 201 })
}
