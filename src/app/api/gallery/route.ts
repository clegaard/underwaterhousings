import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cameraSlug = searchParams.get('camera')
    const userIdParam = searchParams.get('userId')

    // If userId is provided (for the review photo picker), return the user's photos
    if (userIdParam && !cameraSlug) {
        try {
            const session = await auth()
            const sessionUserId = (session?.user as { id?: string } | undefined)?.id
            const requestedUserId = parseInt(userIdParam)

            // Only allow fetching your own photos or if no session (public gallery)
            if (sessionUserId && parseInt(sessionUserId) !== requestedUserId) {
                return NextResponse.json({ photos: [] })
            }

            // Optional filtering — by camera system ID (preferred) or individual component IDs
            const cameraSystemId = searchParams.get('cameraSystemId')
            const cameraId = searchParams.get('cameraId')
            const lensId = searchParams.get('lensId')
            const housingId = searchParams.get('housingId')
            const portId = searchParams.get('portId')

            const photoWhere: Record<string, unknown> = { userId: requestedUserId }

            if (cameraSystemId) {
                photoWhere.cameraSystemId = parseInt(cameraSystemId)
            } else if (cameraId || lensId || housingId || portId) {
                // Build camera system filter for components
                const csWhere: Record<string, unknown> = {}
                if (cameraId) csWhere.cameraId = parseInt(cameraId)
                if (lensId) csWhere.lensId = parseInt(lensId)
                if (housingId) csWhere.housingId = parseInt(housingId)
                if (portId) csWhere.portId = parseInt(portId)

                // Find matching camera systems
                const matchingSystems = await prisma.cameraSystem.findMany({
                    where: csWhere,
                    select: { id: true },
                })

                if (matchingSystems.length === 0) {
                    return NextResponse.json({ photos: [] })
                }

                photoWhere.cameraSystemId = {
                    in: matchingSystems.map(cs => cs.id),
                }
            }

            const photos = await prisma.galleryPhoto.findMany({
                where: photoWhere,
                orderBy: { createdAt: 'desc' },
                take: 30,
                select: {
                    id: true,
                    imagePath: true,
                    caption: true,
                    location: true,
                },
            })

            return NextResponse.json({
                photos: photos.map(p => ({
                    id: p.id,
                    src: withBase(p.imagePath),
                    caption: p.caption,
                    location: p.location,
                })),
            })
        } catch {
            return NextResponse.json({ photos: [] })
        }
    }

    if (!cameraSlug) {
        return NextResponse.json({ photos: [] })
    }

    try {
        const camera = await prisma.camera.findUnique({
            where: { slug: cameraSlug },
            select: { id: true },
        })
        if (!camera) return NextResponse.json({ photos: [] })

        const housingSlug = searchParams.get('housing')
        let housingId: number | undefined
        if (housingSlug) {
            const housing = await prisma.housing.findUnique({
                where: { slug: housingSlug },
                select: { id: true },
            })
            housingId = housing?.id
        }

        const cameraSystemWhere: Record<string, unknown> = { cameraId: camera.id }
        if (housingId !== undefined) cameraSystemWhere.housingId = housingId

        const photos = await prisma.galleryPhoto.findMany({
            where: { cameraSystem: cameraSystemWhere },
            orderBy: { takenAt: 'desc' },
            take: 8,
            select: {
                id: true,
                imagePath: true,
                caption: true,
                location: true,
            },
        })

        return NextResponse.json({
            photos: photos.map(p => ({
                id: p.id,
                src: withBase(p.imagePath),
                caption: p.caption,
                location: p.location,
            })),
        })
    } catch {
        return NextResponse.json({ photos: [] })
    }
}
