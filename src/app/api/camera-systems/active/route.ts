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
        const updated = await prisma.cameraSystem.update({
            where: { id: cameraSystemId },
            data: { isActive: !cameraSystem.isActive },
        })
        return NextResponse.json({ success: true, isActive: updated.isActive })
    } catch (error) {
        console.error('Error toggling camera system active state:', error)
        return NextResponse.json({ success: false, error: 'Failed to update camera system' }, { status: 500 })
    }
}
