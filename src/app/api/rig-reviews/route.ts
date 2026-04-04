import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/rig-reviews?cameraId=x&housingId=x&lensId=x&portId=x
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cameraId = searchParams.get('cameraId')
    const housingId = searchParams.get('housingId')
    const lensId = searchParams.get('lensId')
    const portId = searchParams.get('portId')

    if (!cameraId || !housingId) {
        return NextResponse.json({ error: 'cameraId and housingId are required' }, { status: 400 })
    }

    try {
        const reviews = await prisma.rigReview.findMany({
            where: {
                cameraId: parseInt(cameraId),
                housingId: parseInt(housingId),
                lensId: lensId ? parseInt(lensId) : null,
                portId: portId ? parseInt(portId) : null,
            },
            include: {
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(reviews)
    } catch (error) {
        console.error('Error fetching rig reviews:', error)
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }
}

// POST /api/rig-reviews
export async function POST(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIdInt = parseInt(userId)
    const userExists = await prisma.user.findUnique({ where: { id: userIdInt }, select: { id: true } })
    if (!userExists) {
        return NextResponse.json({ error: 'Session is stale, please log out and log back in' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const {
            cameraId,
            housingId,
            lensId,
            portId,
            ratingOpticalQuality,
            ratingReliability,
            ratingEaseOfUse,
            comment,
            reviewPhotos,
        } = body

        if (!cameraId || !housingId) {
            return NextResponse.json({ error: 'cameraId and housingId are required' }, { status: 400 })
        }

        for (const [name, val] of [
            ['ratingOpticalQuality', ratingOpticalQuality],
            ['ratingReliability', ratingReliability],
            ['ratingEaseOfUse', ratingEaseOfUse],
        ] as [string, unknown][]) {
            if (typeof val !== 'number' || val < 1 || val > 5) {
                return NextResponse.json(
                    { error: `${name} must be a number between 1 and 5` },
                    { status: 400 }
                )
            }
        }

        const review = await prisma.rigReview.create({
            data: {
                cameraId: parseInt(cameraId),
                housingId: parseInt(housingId),
                lensId: lensId ? parseInt(lensId) : null,
                portId: portId ? parseInt(portId) : null,
                ratingOpticalQuality,
                ratingReliability,
                ratingEaseOfUse,
                comment: comment?.trim() || null,
                reviewPhotos: Array.isArray(reviewPhotos) ? reviewPhotos : [],
                userId: userIdInt,
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(review, { status: 201 })
    } catch (error) {
        console.error('Error creating rig review:', error)
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }
}

// PUT /api/rig-reviews?id=x
export async function PUT(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
        return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
    }

    try {
        const existing = await prisma.rigReview.findUnique({ where: { id: parseInt(id) } })
        if (!existing) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }
        if (existing.userId !== parseInt(userId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { ratingOpticalQuality, ratingReliability, ratingEaseOfUse, comment, reviewPhotos } = body

        for (const [name, val] of [
            ['ratingOpticalQuality', ratingOpticalQuality],
            ['ratingReliability', ratingReliability],
            ['ratingEaseOfUse', ratingEaseOfUse],
        ] as [string, unknown][]) {
            if (typeof val !== 'number' || val < 1 || val > 5) {
                return NextResponse.json(
                    { error: `${name} must be a number between 1 and 5` },
                    { status: 400 }
                )
            }
        }

        const review = await prisma.rigReview.update({
            where: { id: parseInt(id) },
            data: {
                ratingOpticalQuality,
                ratingReliability,
                ratingEaseOfUse,
                comment: comment?.trim() || null,
                reviewPhotos: Array.isArray(reviewPhotos) ? reviewPhotos : undefined,
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(review)
    } catch (error) {
        console.error('Error updating rig review:', error)
        return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }
}

// DELETE /api/rig-reviews?id=x
export async function DELETE(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
        return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
    }

    try {
        const existing = await prisma.rigReview.findUnique({ where: { id: parseInt(id) } })
        if (!existing) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }
        if (existing.userId !== parseInt(userId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.rigReview.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting rig review:', error)
        return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }
}
