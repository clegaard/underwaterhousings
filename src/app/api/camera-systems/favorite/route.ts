import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
        const userId = parseInt(session.user.id)
        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
        }
        const cameraSystemId = parseInt(id)

        // Verify the camera system belongs to the authenticated user
        const cameraSystem = await prisma.cameraSystem.findUnique({ where: { id: cameraSystemId } })
        if (!cameraSystem || cameraSystem.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }

        // Toggle: if already favorite, clear it; otherwise set it
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultCameraSystemId: true } })
        const newDefaultId = user?.defaultCameraSystemId === cameraSystemId ? null : cameraSystemId

        await prisma.user.update({
            where: { id: userId },
            data: { defaultCameraSystemId: newDefaultId },
        })

        return NextResponse.json({ success: true, defaultCameraSystemId: newDefaultId })
    } catch (error) {
        console.error('Error setting favorite camera system:', error)
        return NextResponse.json({ success: false, error: 'Failed to set favorite' }, { status: 500 })
    }
}
