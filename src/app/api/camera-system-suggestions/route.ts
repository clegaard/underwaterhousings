import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withBase } from '@/lib/images'

export const dynamic = 'force-dynamic'

function sumPhotos(rigs: Array<{ _count: { galleryPhotos: number } }>): number {
    return rigs.reduce((sum, r) => sum + r._count.galleryPhotos, 0)
}

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams
    const step = sp.get('step')
    const cameraId = sp.get('cameraId') ? parseInt(sp.get('cameraId')!) : null
    const cameraMountId = sp.get('cameraMountId') ? parseInt(sp.get('cameraMountId')!) : null
    const housingId = sp.get('housingId') ? parseInt(sp.get('housingId')!) : null
    const housingMountId = sp.get('housingMountId') ? parseInt(sp.get('housingMountId')!) : null

    try {
        // ── Cameras ───────────────────────────────────────────────────────────
        if (step === 'camera') {
            const rows = await prisma.camera.findMany({
                select: {
                    id: true,
                    name: true,
                    productPhotos: true,
                    interchangeableLens: true,
                    canBeUsedWithoutAHousing: true,
                    brand: { select: { name: true, slug: true } },
                    cameraSystems: { select: { _count: { select: { galleryPhotos: true } } } },
                },
            })
            const result = rows
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    brandName: c.brand.name,
                    brandSlug: c.brand.slug,
                    interchangeableLens: c.interchangeableLens,
                    canBeUsedWithoutAHousing: c.canBeUsedWithoutAHousing,
                    productPhoto: c.productPhotos[0] ? withBase(c.productPhotos[0]) : null,
                    photoCount: sumPhotos(c.cameraSystems),
                }))
                .sort((a, b) => b.photoCount - a.photoCount)
            return NextResponse.json(result)
        }

        // ── Lenses ────────────────────────────────────────────────────────────
        if (step === 'lens' && cameraMountId !== null) {
            const rows = await prisma.lens.findMany({
                where: { cameraMountId },
                select: {
                    id: true,
                    name: true,
                    focalLengthTele: true,
                    focalLengthWide: true,
                    productPhotos: true,
                    manufacturer: { select: { name: true } },
                    cameraSystems: {
                        where: cameraId !== null ? { cameraId } : undefined,
                        select: { _count: { select: { galleryPhotos: true } } },
                    },
                },
            })
            const result = rows
                .map(l => ({
                    id: l.id,
                    name: l.name,
                    focalLengthTele: l.focalLengthTele,
                    focalLengthWide: l.focalLengthWide,
                    manufacturerName: l.manufacturer?.name ?? null,
                    productPhoto: l.productPhotos[0] ? withBase(l.productPhotos[0]) : null,
                    photoCount: sumPhotos(l.cameraSystems),
                }))
                .sort((a, b) => b.photoCount - a.photoCount)
            return NextResponse.json(result)
        }

        // ── Housings ──────────────────────────────────────────────────────────
        if (step === 'housing' && cameraId !== null) {
            const rows = await prisma.housing.findMany({
                where: { cameras: { some: { id: cameraId } } },
                select: {
                    id: true,
                    name: true,
                    productPhotos: true,
                    priceAmount: true,
                    priceCurrency: true,
                    interchangeablePort: true,
                    housingMount: { select: { id: true } },
                    manufacturer: { select: { name: true, slug: true } },
                    cameraSystems: {
                        where: { cameraId },
                        select: { _count: { select: { galleryPhotos: true } } },
                    },
                },
            })
            const result = rows
                .map(h => ({
                    id: h.id,
                    name: h.name,
                    manufacturerName: h.manufacturer.name,
                    manufacturerSlug: h.manufacturer.slug,
                    interchangeablePort: h.interchangeablePort,
                    housingMountId: h.housingMount?.id ?? null,
                    productPhoto: h.productPhotos[0] ? withBase(h.productPhotos[0]) : null,
                    priceAmount: h.priceAmount !== null ? Number(h.priceAmount) : null,
                    priceCurrency: h.priceCurrency,
                    photoCount: sumPhotos(h.cameraSystems),
                }))
                .sort((a, b) => b.photoCount - a.photoCount)
            return NextResponse.json(result)
        }

        // ── Ports ─────────────────────────────────────────────────────────────
        if (step === 'port' && housingMountId !== null) {
            const rows = await prisma.port.findMany({
                where: { housingMountId },
                select: {
                    id: true,
                    name: true,
                    productPhotos: true,
                    priceAmount: true,
                    priceCurrency: true,
                    isFlatPort: true,
                    manufacturer: { select: { name: true, slug: true } },
                    cameraSystems: {
                        where: {
                            ...(cameraId !== null && { cameraId }),
                            ...(housingId !== null && { housingId }),
                        },
                        select: { _count: { select: { galleryPhotos: true } } },
                    },
                },
            })
            const result = rows
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    manufacturerName: p.manufacturer.name,
                    isFlatPort: p.isFlatPort,
                    productPhoto: p.productPhotos[0] ? withBase(p.productPhotos[0]) : null,
                    priceAmount: p.priceAmount !== null ? Number(p.priceAmount) : null,
                    priceCurrency: p.priceCurrency,
                    photoCount: sumPhotos(p.cameraSystems),
                }))
                .sort((a, b) => b.photoCount - a.photoCount)
            return NextResponse.json(result)
        }

        return NextResponse.json({ error: 'Invalid step or missing parameters' }, { status: 400 })
    } catch (err) {
        console.error('[camera-system-suggestions]', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
