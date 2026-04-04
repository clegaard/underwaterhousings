import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withBase } from '@/lib/images'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cameraSlug = searchParams.get('camera')

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

        const where: Record<string, unknown> = { cameraId: camera.id }
        if (housingId !== undefined) where.housingId = housingId

        const photos = await prisma.galleryPhoto.findMany({
            where,
            orderBy: { takenAt: 'desc' },
            take: 8,
            select: {
                id: true,
                imagePath: true,
                title: true,
                location: true,
            },
        })

        return NextResponse.json({
            photos: photos.map(p => ({
                id: p.id,
                src: withBase(p.imagePath),
                title: p.title,
                location: p.location,
            })),
        })
    } catch {
        return NextResponse.json({ photos: [] })
    }
}
