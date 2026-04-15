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
        const rings = await prisma.extensionRing.findMany({
            include: { manufacturer: true, housingMount: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(rings)
    } catch (error) {
        console.error('Error fetching extension rings:', error)
        return NextResponse.json({ error: 'Failed to fetch extension rings' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, housingMountId, lengthMm, priceAmount, priceCurrency, productPhotos } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.extensionRing.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'An extension ring with this name already exists' }, { status: 409 })
        }

        const ring = await prisma.extensionRing.create({
            data: {
                name,
                slug,
                manufacturerId,
                housingMountId: housingMountId || null,
                lengthMm: lengthMm ? parseInt(lengthMm) : null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
            },
            include: { manufacturer: true, housingMount: true },
        })

        return NextResponse.json(ring, { status: 201 })
    } catch (error) {
        console.error('Error creating extension ring:', error)
        return NextResponse.json({ error: 'Failed to create extension ring' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Extension ring ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, housingMountId, lengthMm, priceAmount, priceCurrency, productPhotos } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.extensionRing.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'An extension ring with this name already exists' }, { status: 409 })
        }

        const ring = await prisma.extensionRing.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                housingMountId: housingMountId || null,
                lengthMm: lengthMm ? parseInt(lengthMm) : null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
            },
            include: { manufacturer: true, housingMount: true },
        })

        return NextResponse.json(ring)
    } catch (error) {
        console.error('Error updating extension ring:', error)
        return NextResponse.json({ error: 'Failed to update extension ring' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Extension ring ID is required' }, { status: 400 })

        await prisma.extensionRing.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting extension ring:', error)
        return NextResponse.json({ error: 'Failed to delete extension ring' }, { status: 500 })
    }
}
