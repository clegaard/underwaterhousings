import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const cameraSystemInclude = {
    camera: { include: { brand: true } },
    lens: true,
    housing: { include: { manufacturer: true } },
    portAdapter: { include: { manufacturer: true, inputHousingMount: true, outputHousingMount: true } },
    extensionRings: { include: { manufacturer: true } },
    port: true,
    _count: { select: { galleryPhotos: true } },
}

export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        if (userId) {
            const [cameraSystems, user] = await Promise.all([
                prisma.cameraSystem.findMany({
                    where: { userId: parseInt(userId) },
                    include: cameraSystemInclude,
                    orderBy: { createdAt: 'asc' },
                }),
                prisma.user.findUnique({
                    where: { id: parseInt(userId) },
                    select: { defaultCameraSystemId: true },
                }),
            ])
            return NextResponse.json({ success: true, data: { cameraSystems, defaultCameraSystemId: user?.defaultCameraSystemId ?? null } })
        }

        const [cameras, housings, lenses, ports, portAdapters, extensionRings] = await Promise.all([
            prisma.camera.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    manufacturerId: true, interchangeableLens: true,
                    canBeUsedWithoutAHousing: true, exifId: true,
                    brand: { select: { id: true, name: true, slug: true } },
                    cameraMount: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.housing.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    interchangeablePort: true,
                    cameras: { select: { id: true } },
                    housingMount: { select: { id: true, name: true, slug: true } },
                    manufacturer: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.lens.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    cameraMountId: true, exifId: true,
                    ports: { select: { id: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.port.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    housingMountId: true,
                    lens: { select: { id: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.portAdapter.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    inputHousingMountId: true, outputHousingMountId: true,
                    inputHousingMount: { select: { id: true, name: true, slug: true } },
                    outputHousingMount: { select: { id: true, name: true, slug: true } },
                    manufacturer: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.extensionRing.findMany({
                select: {
                    id: true, name: true, slug: true, productPhotos: true,
                    housingMountId: true, lengthMm: true,
                    manufacturer: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { name: 'asc' },
            }),
        ])
        return NextResponse.json({ success: true, data: { cameras, housings, lenses, ports, portAdapters, extensionRings } })
    } catch (error) {
        console.error('Error fetching equipment:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch equipment' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        const userId = parseInt(session.user.id)
        const body = await request.json()
        const { name, cameraId, lensId, housingId, portAdapterId, extensionRingIds, portId, imagePath } = body
        if (!name || !cameraId) {
            return NextResponse.json({ success: false, error: 'name and cameraId are required' }, { status: 400 })
        }
        const cameraSystem = await prisma.cameraSystem.create({
            data: {
                name,
                userId,
                cameraId: parseInt(cameraId),
                lensId: lensId ? parseInt(lensId) : null,
                housingId: housingId ? parseInt(housingId) : null,
                portAdapterId: portAdapterId ? parseInt(portAdapterId) : null,
                extensionRings: Array.isArray(extensionRingIds) && extensionRingIds.length > 0
                    ? { connect: extensionRingIds.map((id: number) => ({ id })) }
                    : undefined,
                portId: portId ? parseInt(portId) : null,
                imagePath: imagePath ?? null,
            },
            include: cameraSystemInclude,
        })
        // Auto-set as default if this is the user's first camera system
        const cameraSystemCount = await prisma.cameraSystem.count({ where: { userId } })
        if (cameraSystemCount === 1) {
            await prisma.user.update({ where: { id: userId }, data: { defaultCameraSystemId: cameraSystem.id } })
        }
        return NextResponse.json({ success: true, data: cameraSystem }, { status: 201 })
    } catch (error) {
        console.error('Error creating camera system:', error)
        return NextResponse.json({ success: false, error: 'Failed to create camera system' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
        }
        const userId = parseInt(session.user.id)
        const existing = await prisma.cameraSystem.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        const body = await request.json()
        const { name, cameraId, lensId, housingId, portAdapterId, extensionRingIds, portId, imagePath } = body
        const cameraSystem = await prisma.cameraSystem.update({
            where: { id: parseInt(id) },
            data: {
                name,
                cameraId: cameraId ? parseInt(cameraId) : undefined,
                lensId: lensId ? parseInt(lensId) : null,
                housingId: housingId ? parseInt(housingId) : null,
                portAdapterId: portAdapterId ? parseInt(portAdapterId) : null,
                extensionRings: Array.isArray(extensionRingIds)
                    ? { set: extensionRingIds.map((id: number) => ({ id })) }
                    : undefined,
                portId: portId ? parseInt(portId) : null,
                imagePath: imagePath !== undefined ? imagePath : undefined,
            },
            include: cameraSystemInclude,
        })
        return NextResponse.json({ success: true, data: cameraSystem })
    } catch (error) {
        console.error('Error updating camera system:', error)
        return NextResponse.json({ success: false, error: 'Failed to update camera system' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
        }
        const userId = parseInt(session.user.id)
        const existing = await prisma.cameraSystem.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        const photoCount = await prisma.galleryPhoto.count({ where: { cameraSystemId: parseInt(id) } })
        if (photoCount > 0) {
            return NextResponse.json(
                { success: false, error: `This camera system has ${photoCount} gallery photo${photoCount === 1 ? '' : 's'} and cannot be deleted.` },
                { status: 409 }
            )
        }
        await prisma.cameraSystem.delete({ where: { id: parseInt(id) } })
        // Clear defaultCameraSystemId on the user if it pointed to this camera system
        await prisma.user.updateMany({
            where: { id: userId, defaultCameraSystemId: parseInt(id) },
            data: { defaultCameraSystemId: null },
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting camera system:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete camera system' }, { status: 500 })
    }
}
