import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

function requireSuperuser(session: Awaited<ReturnType<typeof auth>>) {
    if (!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
}

const include = {
    lens: { include: { manufacturer: true, cameraMount: true } },
    port: true,
    rings: {
        include: { extensionRing: true },
        orderBy: { order: 'asc' as const },
    },
}

export async function GET(req: NextRequest) {
    const manufacturerId = req.nextUrl.searchParams.get('manufacturerId')
    if (!manufacturerId) {
        return NextResponse.json({ error: 'manufacturerId required' }, { status: 400 })
    }
    const entries = await prisma.portChartEntry.findMany({
        where: { manufacturerId: parseInt(manufacturerId) },
        include,
        orderBy: [{ lens: { name: 'asc' } }, { id: 'asc' }],
    })
    return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
    const session = await auth()
    const denied = requireSuperuser(session)
    if (denied) return denied

    const body = await req.json()
    const { manufacturerId, lensId, portId, ringIds, notes } = body

    if (!manufacturerId || !lensId) {
        return NextResponse.json({ error: 'manufacturerId and lensId are required' }, { status: 400 })
    }

    const entry = await prisma.portChartEntry.create({
        data: {
            manufacturerId,
            lensId,
            portId: portId || null,
            notes: notes || null,
            rings: {
                create: (ringIds as number[] ?? []).map((id: number, idx: number) => ({
                    extensionRingId: id,
                    order: idx,
                })),
            },
        },
        include,
    })
    return NextResponse.json(entry, { status: 201 })
}

export async function PUT(req: NextRequest) {
    const session = await auth()
    const denied = requireSuperuser(session)
    if (denied) return denied

    const id = parseInt(req.nextUrl.searchParams.get('id') ?? '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json()
    const { lensId, portId, ringIds, notes } = body

    // Delete existing rings then recreate in correct order
    await prisma.portChartEntryRing.deleteMany({ where: { portChartEntryId: id } })

    const entry = await prisma.portChartEntry.update({
        where: { id },
        data: {
            lensId,
            portId: portId || null,
            notes: notes || null,
            rings: {
                create: (ringIds as number[] ?? []).map((rid: number, idx: number) => ({
                    extensionRingId: rid,
                    order: idx,
                })),
            },
        },
        include,
    })
    return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
    const session = await auth()
    const denied = requireSuperuser(session)
    if (denied) return denied

    const id = parseInt(req.nextUrl.searchParams.get('id') ?? '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.portChartEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
