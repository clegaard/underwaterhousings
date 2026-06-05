import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withBase } from '@/lib/images'

/** Parse focal length hints from a free-text query.
 *  Examples:
 *   "24-70mm"  → { wide: 24, tele: 70 }
 *   "90mm"     → { wide: null, tele: 90 }
 *   "24-70"    → { wide: 24, tele: 70 }
 */
function parseFocalLength(q: string): { wide: number | null; tele: number | null } | null {
    const rangeMatch = q.match(/(\d+)\s*[-–]\s*(\d+)\s*mm?/i)
    if (rangeMatch) {
        return { wide: parseInt(rangeMatch[1]), tele: parseInt(rangeMatch[2]) }
    }
    const singleMatch = q.match(/(\d+)\s*mm/i)
    if (singleMatch) {
        return { wide: null, tele: parseInt(singleMatch[1]) }
    }
    return null
}

/**
 * Build a Prisma where clause that requires every token in the query to appear
 * in at least one of the provided field conditions.
 *
 * e.g. "Sony A7V" splits into ["Sony", "A7V"]. For each token we emit an OR
 * over the candidate fields, then AND all those ORs together. This means
 * "Sony" can match the brand name while "A7V" matches the camera name.
 */
function tokenAnd(
    tokens: string[],
    fields: (token: string) => object[]
): object {
    return {
        AND: tokens.map(token => ({
            OR: fields(token),
        })),
    }
}

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
        return NextResponse.json(
            { cameras: [], lenses: [], housings: [], manufacturers: [], ports: [], portAdapters: [], gears: [] },
            { status: 200 }
        )
    }

    // Split into tokens; filter out empty strings from multiple spaces
    const tokens = q.split(/\s+/).filter(Boolean)

    const fl = parseFocalLength(q)

    // Lens where: token-AND match OR focal length range match
    const lensTokenClause = tokenAnd(tokens, token => [
        { name: { contains: token, mode: 'insensitive' } },
        { manufacturer: { name: { contains: token, mode: 'insensitive' } } },
    ])
    const lensWhere: any = { OR: [lensTokenClause] }
    if (fl) {
        if (fl.wide !== null && fl.tele !== null) {
            lensWhere.OR.push({
                focalLengthWide: { lte: fl.wide + 5, gte: fl.wide - 5 },
                focalLengthTele: { lte: fl.tele + 5, gte: fl.tele - 5 },
            })
        } else if (fl.tele !== null) {
            lensWhere.OR.push({ focalLengthTele: { lte: fl.tele + 5, gte: fl.tele - 5 } })
        }
    }

    const [cameras, lenses, housings, manufacturers, ports, portAdapters, gears] = await Promise.all([
        prisma.camera.findMany({
            where: tokenAnd(tokens, token => [
                { name: { contains: token, mode: 'insensitive' } },
                { brand: { name: { contains: token, mode: 'insensitive' } } },
            ]),
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                brand: { select: { name: true, slug: true } },
            },
            take: 5,
            orderBy: { name: 'asc' },
        }),
        prisma.lens.findMany({
            where: lensWhere,
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                manufacturer: { select: { name: true, slug: true } },
            },
            take: 5,
            orderBy: { name: 'asc' },
        }),
        prisma.housing.findMany({
            where: tokenAnd(tokens, token => [
                { name: { contains: token, mode: 'insensitive' } },
                { manufacturer: { name: { contains: token, mode: 'insensitive' } } },
            ]),
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                manufacturer: { select: { name: true, slug: true } },
            },
            take: 5,
            orderBy: { name: 'asc' },
        }),
        prisma.manufacturer.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: {
                id: true, name: true, slug: true, logoPath: true,
                _count: { select: { housings: true, cameras: true } },
            },
            take: 4,
            orderBy: { name: 'asc' },
        }),
        prisma.port.findMany({
            where: tokenAnd(tokens, token => [
                { name: { contains: token, mode: 'insensitive' } },
                { manufacturer: { name: { contains: token, mode: 'insensitive' } } },
            ]),
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                manufacturer: { select: { name: true, slug: true } },
            },
            take: 4,
            orderBy: { name: 'asc' },
        }),
        prisma.portAdapter.findMany({
            where: tokenAnd(tokens, token => [
                { name: { contains: token, mode: 'insensitive' } },
                { manufacturer: { name: { contains: token, mode: 'insensitive' } } },
            ]),
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                manufacturer: { select: { name: true, slug: true } },
            },
            take: 4,
            orderBy: { name: 'asc' },
        }),
        prisma.gear.findMany({
            where: tokenAnd(tokens, token => [
                { name: { contains: token, mode: 'insensitive' } },
                { manufacturer: { name: { contains: token, mode: 'insensitive' } } },
            ]),
            select: {
                id: true, name: true, slug: true, productPhotos: true,
                manufacturer: { select: { name: true, slug: true } },
            },
            take: 4,
            orderBy: { name: 'asc' },
        }),
    ])

    return NextResponse.json({
        cameras: cameras.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            type: 'camera',
            subtitle: c.brand.name,
            imageUrl: c.productPhotos[0] ? withBase(c.productPhotos[0]) : null,
            href: `/products/${c.brand.slug}/cameras/${c.slug}`,
        })),
        lenses: lenses.map(l => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            type: 'lens',
            subtitle: l.manufacturer?.name ?? '',
            imageUrl: l.productPhotos[0] ? withBase(l.productPhotos[0]) : null,
            href: l.manufacturer?.slug ? `/products/${l.manufacturer.slug}/lenses/${l.slug}` : `/products`,
        })),
        housings: housings.map(h => ({
            id: h.id,
            name: h.name,
            slug: h.slug,
            type: 'housing',
            subtitle: h.manufacturer.name,
            imageUrl: h.productPhotos[0] ? withBase(h.productPhotos[0]) : null,
            href: `/products/${h.manufacturer.slug}/housings/${h.slug}`,
        })),
        manufacturers: manufacturers.map(m => ({
            id: m.id,
            name: m.name,
            slug: m.slug,
            type: 'manufacturer',
            subtitle: [
                m._count.housings > 0 ? `${m._count.housings} housing${m._count.housings !== 1 ? 's' : ''}` : null,
                m._count.cameras > 0 ? `${m._count.cameras} camera${m._count.cameras !== 1 ? 's' : ''}` : null,
            ].filter(Boolean).join(' · '),
            imageUrl: m.logoPath ? withBase(m.logoPath) : null,
            href: `/products/${m.slug}`,
        })),
        ports: ports.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            type: 'port',
            subtitle: p.manufacturer.name,
            imageUrl: p.productPhotos[0] ? withBase(p.productPhotos[0]) : null,
            href: `/products/${p.manufacturer.slug}/ports/${p.slug}`,
        })),
        portAdapters: portAdapters.map(a => ({
            id: a.id,
            name: a.name,
            slug: a.slug,
            type: 'portAdapter',
            subtitle: a.manufacturer.name,
            imageUrl: a.productPhotos[0] ? withBase(a.productPhotos[0]) : null,
            href: a.manufacturer ? `/products/${a.manufacturer.slug}/port-adapters/${a.slug}` : `/products`,
        })),
        gears: gears.map(g => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            type: 'gear',
            subtitle: g.manufacturer?.name ?? '',
            imageUrl: g.productPhotos[0] ? withBase(g.productPhotos[0]) : null,
            href: g.manufacturer ? `/products/${g.manufacturer.slug}/gears/${g.slug}` : `/products`,
        })),
    })
}
