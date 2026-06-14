import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

async function fetchComponentDetail(type: ComponentType, id: number) {
    switch (type) {
        case 'camera':
            return prisma.camera.findUnique({
                where: { id },
                include: { brand: true },
            })
        case 'lens':
            return prisma.lens.findUnique({
                where: { id },
                include: { manufacturer: true },
            })
        case 'housing':
            return prisma.housing.findUnique({
                where: { id },
                include: { manufacturer: true },
            })
        case 'port':
            return prisma.port.findUnique({
                where: { id },
                include: { manufacturer: true },
            })
        case 'portAdapter':
            return prisma.portAdapter.findUnique({
                where: { id },
                include: { manufacturer: true },
            })
        case 'extensionRing':
            return prisma.extensionRing.findUnique({
                where: { id },
                include: { manufacturer: true },
            })
        default:
            return null
    }
}

async function enrichReview(review: {
    id: number
    title: string
    body: string
    status: string
    userId: number
    createdAt: Date
    updatedAt: Date
    components: Array<{
        id: number
        reviewId: number
        componentType: string
        componentId: number
        description: string | null
    }>
}) {
    const enrichedComponents = await Promise.all(
        review.components.map(async (rc) => {
            const detail = await fetchComponentDetail(rc.componentType as ComponentType, rc.componentId)
            return {
                ...rc,
                detail: detail ?? null,
            }
        })
    )
    return {
        ...review,
        components: enrichedComponents,
    }
}

// GET /api/reviews — list published reviews
export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const userId = sp.get('userId')
    const id = sp.get('id')
    const status = sp.get('status') ?? 'published'

    try {
        // Single review
        if (id) {
            const review = await prisma.review.findUnique({
                where: { id: parseInt(id) },
                include: {
                    user: { select: { id: true, name: true, profilePicture: true } },
                    components: true,
                },
            })
            if (!review) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
            const enriched = await enrichReview(review)
            return NextResponse.json({ success: true, data: enriched })
        }

        // List reviews
        const where: Record<string, unknown> = {}
        if (userId) where.userId = parseInt(userId)
        if (status) where.status = status

        const reviews = await prisma.review.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 40,
            include: {
                user: { select: { id: true, name: true, profilePicture: true } },
                components: true,
            },
        })
        const enriched = await Promise.all(reviews.map(r => enrichReview(r)))
        return NextResponse.json({ success: true, data: enriched })
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
        const { title, body: reviewBody, status = 'draft', components } = body

        if (!title || !Array.isArray(components) || components.length === 0) {
            return NextResponse.json({ success: false, error: 'title and components are required' }, { status: 400 })
        }

        // Validate each component has componentType and componentId
        for (const c of components) {
            if (!c.componentType || !c.componentId) {
                return NextResponse.json({ success: false, error: 'Each component must have componentType and componentId' }, { status: 400 })
            }
            const validTypes: ComponentType[] = ['camera', 'lens', 'housing', 'port', 'portAdapter', 'extensionRing']
            if (!validTypes.includes(c.componentType)) {
                return NextResponse.json({ success: false, error: `Invalid componentType: ${c.componentType}` }, { status: 400 })
            }
        }

        // Validate that each component exists in the user's camera systems
        const userSystems = await prisma.cameraSystem.findMany({
            where: { userId: parseInt(userId), isActive: true },
            select: {
                cameraId: true,
                lensId: true,
                housingId: true,
                portId: true,
                portAdapterId: true,
            },
        })

        // Build a set of valid component references from user's systems
        const validComponents = new Set<string>()
        for (const cs of userSystems) {
            validComponents.add(`camera:${cs.cameraId}`)
            if (cs.lensId) validComponents.add(`lens:${cs.lensId}`)
            if (cs.housingId) validComponents.add(`housing:${cs.housingId}`)
            if (cs.portId) validComponents.add(`port:${cs.portId}`)
            if (cs.portAdapterId) validComponents.add(`portAdapter:${cs.portAdapterId}`)
        }

        for (const c of components) {
            const key = `${c.componentType}:${c.componentId}`
            if (!validComponents.has(key)) {
                return NextResponse.json({
                    success: false,
                    error: `Component ${key} is not part of any of your camera systems`,
                }, { status: 403 })
            }
        }

        const review = await prisma.review.create({
            data: {
                title,
                body: reviewBody ?? '',
                status,
                userId: parseInt(userId),
                components: {
                    create: components.map((c: { componentType: string; componentId: number; description?: string }) => ({
                        componentType: c.componentType,
                        componentId: c.componentId,
                        description: c.description ?? null,
                    })),
                },
            },
            include: {
                components: true,
            },
        })
        const enriched = await enrichReview(review)
        return NextResponse.json({ success: true, data: enriched }, { status: 201 })
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
        const { title, body: reviewBody, status, components } = body

        const review = await prisma.review.update({
            where: { id: parseInt(id) },
            data: {
                title: title ?? existing.title,
                body: reviewBody ?? existing.body,
                status: status ?? existing.status,
                ...(components ? {
                    components: {
                        deleteMany: {},
                        create: components.map((c: { componentType: string; componentId: number; description?: string }) => ({
                            componentType: c.componentType,
                            componentId: c.componentId,
                            description: c.description ?? null,
                        })),
                    },
                } : {}),
            },
            include: {
                components: true,
            },
        })
        const enriched = await enrichReview(review)
        return NextResponse.json({ success: true, data: enriched })
    } catch (error) {
        console.error('Error updating review:', error)
        return NextResponse.json({ success: false, error: 'Failed to update review' }, { status: 500 })
    }
}

// DELETE /api/reviews?id=x
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
