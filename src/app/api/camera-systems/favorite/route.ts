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
        const cameraSystem = await prisma.cameraSystem.findUnique({ where: { id: cameraSystemId } })
        if (!cameraSystem || cameraSystem.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        await prisma.user.update({
            where: { id: userId },
            data: { defaultCameraSystemId: cameraSystemId },
        })
        return NextResponse.json({ success: true, defaultCameraSystemId: cameraSystemId })
    } catch (error) {
        console.error('Error setting default camera system:', error)
        return NextResponse.json({ success: false, error: 'Failed to set default camera system' }, { status: 500 })
    }
}
