import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const rigInclude = {
    camera: { include: { brand: true } },
    lens: true,
    housing: { include: { manufacturer: true } },
    port: true,
}

export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        if (userId) {
            const [rigs, user] = await Promise.all([
                prisma.cameraRig.findMany({
                    where: { userId: parseInt(userId) },
                    include: rigInclude,
                    orderBy: { createdAt: 'asc' },
                }),
                prisma.user.findUnique({
                    where: { id: parseInt(userId) },
                    select: { defaultRigId: true },
                }),
            ])
            return NextResponse.json({ success: true, data: { rigs, defaultRigId: user?.defaultRigId ?? null } })
        }

        const [cameras, housings, lenses, ports] = await Promise.all([
            prisma.camera.findMany({
                include: { brand: true, cameraMount: true },
                orderBy: { name: 'asc' },
            }),
            prisma.housing.findMany({
                include: { manufacturer: true, housingMount: true },
                orderBy: { name: 'asc' },
            }),
            prisma.lens.findMany({
                include: { ports: true },
                orderBy: { name: 'asc' },
            }),
            prisma.port.findMany({
                include: { lens: true },
                orderBy: { name: 'asc' },
            }),
        ])
        return NextResponse.json({ success: true, data: { cameras, housings, lenses, ports } })
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
        const { name, cameraId, lensId, housingId, portId, imagePath } = body
        if (!name || !cameraId) {
            return NextResponse.json({ success: false, error: 'name and cameraId are required' }, { status: 400 })
        }
        const rig = await prisma.cameraRig.create({
            data: {
                name,
                userId,
                cameraId: parseInt(cameraId),
                lensId: lensId ? parseInt(lensId) : null,
                housingId: housingId ? parseInt(housingId) : null,
                portId: portId ? parseInt(portId) : null,
                imagePath: imagePath ?? null,
            },
            include: rigInclude,
        })
        // Auto-set as default if this is the user's first rig
        const rigCount = await prisma.cameraRig.count({ where: { userId } })
        if (rigCount === 1) {
            await prisma.user.update({ where: { id: userId }, data: { defaultRigId: rig.id } })
        }
        return NextResponse.json({ success: true, data: rig }, { status: 201 })
    } catch (error) {
        console.error('Error creating rig:', error)
        return NextResponse.json({ success: false, error: 'Failed to create rig' }, { status: 500 })
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
        const existing = await prisma.cameraRig.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        const body = await request.json()
        const { name, cameraId, lensId, housingId, portId, imagePath } = body
        const rig = await prisma.cameraRig.update({
            where: { id: parseInt(id) },
            data: {
                name,
                cameraId: cameraId ? parseInt(cameraId) : undefined,
                lensId: lensId ? parseInt(lensId) : null,
                housingId: housingId ? parseInt(housingId) : null,
                portId: portId ? parseInt(portId) : null,
                imagePath: imagePath !== undefined ? imagePath : undefined,
            },
            include: rigInclude,
        })
        return NextResponse.json({ success: true, data: rig })
    } catch (error) {
        console.error('Error updating rig:', error)
        return NextResponse.json({ success: false, error: 'Failed to update rig' }, { status: 500 })
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
        const existing = await prisma.cameraRig.findUnique({ where: { id: parseInt(id) } })
        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        await prisma.cameraRig.delete({ where: { id: parseInt(id) } })
        // Clear defaultRigId on the user if it pointed to this rig
        await prisma.user.updateMany({
            where: { id: userId, defaultRigId: parseInt(id) },
            data: { defaultRigId: null },
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting rig:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete rig' }, { status: 500 })
    }
}
