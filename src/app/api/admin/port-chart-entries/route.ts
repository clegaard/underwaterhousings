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
    steps: {
        include: { extensionRing: true, portAdapter: true, gear: true },
        orderBy: { order: 'asc' as const },
    },
}

interface StepInput {
    extensionRingId?: number
    portAdapterId?: number
    gearId?: number
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
    const { manufacturerId, lensId, portId, steps, notes } = body

    if (!manufacturerId || !lensId) {
        return NextResponse.json({ error: 'manufacturerId and lensId are required' }, { status: 400 })
    }

    const entry = await prisma.portChartEntry.create({
        data: {
            manufacturerId,
            lensId,
            portId: portId || null,
            notes: notes || null,
            steps: {
                create: ((steps ?? []) as StepInput[]).map((s, idx) => ({
                    extensionRingId: s.extensionRingId ?? null,
                    portAdapterId: s.portAdapterId ?? null,
                    gearId: s.gearId ?? null,
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
    const { lensId, portId, steps, notes } = body

    await prisma.portChartEntryStep.deleteMany({ where: { portChartEntryId: id } })

    const entry = await prisma.portChartEntry.update({
        where: { id },
        data: {
            lensId,
            portId: portId || null,
            notes: notes || null,
            steps: {
                create: ((steps ?? []) as StepInput[]).map((s, idx) => ({
                    extensionRingId: s.extensionRingId ?? null,
                    portAdapterId: s.portAdapterId ?? null,
                    gearId: s.gearId ?? null,
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

export async function PATCH(req: NextRequest) {
    const session = await auth()
    const denied = requireSuperuser(session)
    if (denied) return denied

    const id = parseInt(req.nextUrl.searchParams.get('id') ?? '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await req.json()
    const { isRecommended } = body

    if (typeof isRecommended !== 'boolean') {
        return NextResponse.json({ error: 'isRecommended (boolean) required' }, { status: 400 })
    }

    if (isRecommended) {
        // Clear other recommended entries for the same manufacturer+lens
        const entry = await prisma.portChartEntry.findUnique({ where: { id }, select: { manufacturerId: true, lensId: true } })
        if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        await prisma.portChartEntry.updateMany({
            where: { manufacturerId: entry.manufacturerId, lensId: entry.lensId, isRecommended: true },
            data: { isRecommended: false },
        })
    }

    const updated = await prisma.portChartEntry.update({
        where: { id },
        data: { isRecommended },
        include,
    })
    return NextResponse.json(updated)
}
