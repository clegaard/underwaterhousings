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
        const rigId = parseInt(id)
        const rig = await prisma.cameraRig.findUnique({ where: { id: rigId } })
        if (!rig || rig.userId !== userId) {
            return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 403 })
        }
        await prisma.user.update({
            where: { id: userId },
            data: { defaultRigId: rigId },
        })
        return NextResponse.json({ success: true, defaultRigId: rigId })
    } catch (error) {
        console.error('Error setting default rig:', error)
        return NextResponse.json({ success: false, error: 'Failed to set default rig' }, { status: 500 })
    }
}
