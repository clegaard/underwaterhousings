import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

async function requireSuperuser() {
    const session = await auth()
    if (!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
}

function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

export async function GET() {
    try {
        const gears = await prisma.gear.findMany({
            include: { manufacturer: true, lenses: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(gears)
    } catch (error) {
        console.error('Error fetching gears:', error)
        return NextResponse.json({ error: 'Failed to fetch gears' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, sku, priceAmount, priceCurrency, productPhotos, lensIds } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.gear.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'A gear with this name already exists' }, { status: 409 })
        }

        const gear = await prisma.gear.create({
            data: {
                name,
                slug,
                manufacturerId,
                sku: sku || null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                lenses: Array.isArray(lensIds) && lensIds.length > 0
                    ? { connect: lensIds.map((id: number) => ({ id })) }
                    : undefined,
            },
            include: { manufacturer: true, lenses: { select: { id: true, name: true } } },
        })

        return NextResponse.json(gear, { status: 201 })
    } catch (error) {
        console.error('Error creating gear:', error)
        return NextResponse.json({ error: 'Failed to create gear' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Gear ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, sku, priceAmount, priceCurrency, productPhotos, lensIds } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.gear.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'A gear with this name already exists' }, { status: 409 })
        }

        const gear = await prisma.gear.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                sku: sku || null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                lenses: Array.isArray(lensIds)
                    ? { set: lensIds.map((id: number) => ({ id })) }
                    : undefined,
            },
            include: { manufacturer: true, lenses: { select: { id: true, name: true } } },
        })

        return NextResponse.json(gear)
    } catch (error) {
        console.error('Error updating gear:', error)
        return NextResponse.json({ error: 'Failed to update gear' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Gear ID is required' }, { status: 400 })

        await prisma.gear.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting gear:', error)
        return NextResponse.json({ error: 'Failed to delete gear' }, { status: 500 })
    }
}
