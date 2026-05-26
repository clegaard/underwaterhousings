import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/linked-services/[service] — disconnect a linked service
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ service: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { service } = await params

    const existing = await prisma.linkedService.findUnique({
        where: { userId_service: { userId, service } },
    })
    if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.linkedService.delete({
        where: { userId_service: { userId, service } },
    })

    return NextResponse.json({ success: true })
}
