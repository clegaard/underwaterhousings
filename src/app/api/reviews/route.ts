import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const systemInclude = {
    camera: { include: { brand: true } },
    lens: true,
    housing: { include: { manufacturer: true } },
    port: true,
}

// GET /api/reviews — list published reviews
export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const userId = sp.get('userId')
    const id = sp.get('id')
    const status = sp.get('status') ?? 'published'

    try {
        if (id) {
            const review = await prisma.review.findUnique({
                where: { id: parseInt(id) },
                include: {
                    user: { select: { id: true, name: true, profilePicture: true } },
                    systems: {
                        include: {
                            cameraSystem: { include: systemInclude },
                        },
                    },
                },
            })
            if (!review) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
            return NextResponse.json({ success: true, data: review })
        }

        const where: Record<string, unknown> = {}
        if (userId) where.userId = parseInt(userId)
        if (status) where.status = status

        const reviews = await prisma.review.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 40,
            include: {
                user: { select: { id: true, name: true, profilePicture: true } },
                systems: {
                    include: {
                        cameraSystem: { include: systemInclude },
                    },
                },
            },
        })
        return NextResponse.json({ success: true, data: reviews })
    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 })
    }
}

// POST /api/reviews — create a new review
export async function POST(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { body: reviewBody, status = 'draft', cameraSystemId } = body

        if (!cameraSystemId) {
            return NextResponse.json({ success: false, error: 'cameraSystemId is required' }, { status: 400 })
        }

        const uid = parseInt(userId)

        // Verify the camera system belongs to the user
        const system = await prisma.cameraSystem.findUnique({
            where: { id: cameraSystemId },
            select: { userId: true },
        })
        if (!system || system.userId !== uid) {
            return NextResponse.json({ success: false, error: 'Camera system not found or not owned by you' }, { status: 403 })
        }

        // Check for existing review (one review per user per system)
        const existing = await prisma.review.findFirst({
            where: {
                userId: uid,
                systems: {
                    some: {
                        cameraSystemId,
                    },
                },
            },
        })
        if (existing) {
            return NextResponse.json({ success: false, error: 'You have already reviewed this camera system' }, { status: 409 })
        }

        const review = await prisma.review.create({
            data: {
                title: '',
                body: reviewBody ?? '',
                status,
                userId: uid,
                systems: {
                    create: {
                        cameraSystem: { connect: { id: cameraSystemId } },
                    },
                },
            },
            include: {
                systems: {
                    include: {
                        cameraSystem: { include: systemInclude },
                    },
                },
            },
        })
        return NextResponse.json({ success: true, data: review }, { status: 201 })
    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json({ success: false, error: 'Failed to create review' }, { status: 500 })
    }
}

// PUT /api/reviews?id=x — update a review
export async function PUT(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    try {
        const existing = await prisma.review.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== parseInt(userId)) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { body: reviewBody, status } = body

        const review = await prisma.review.update({
            where: { id: parseInt(id) },
            data: {
                ...(reviewBody !== undefined ? { body: reviewBody } : {}),
                ...(status !== undefined ? { status } : {}),
            },
            include: {
                systems: {
                    include: {
                        cameraSystem: { include: systemInclude },
                    },
                },
            },
        })
        return NextResponse.json({ success: true, data: review })
    } catch (error) {
        console.error('Error updating review:', error)
        return NextResponse.json({ success: false, error: 'Failed to update review' }, { status: 500 })
    }
}

// DELETE /api/reviews?id=x — delete a review
export async function DELETE(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    try {
        const existing = await prisma.review.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== parseInt(userId)) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }

        await prisma.review.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting review:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 })
    }
}
