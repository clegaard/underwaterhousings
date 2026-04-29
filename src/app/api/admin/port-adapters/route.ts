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
        const adapters = await prisma.portAdapter.findMany({
            include: { manufacturer: true, inputHousingMount: true, outputHousingMount: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(adapters)
    } catch (error) {
        console.error('Error fetching port adapters:', error)
        return NextResponse.json({ error: 'Failed to fetch port adapters' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, inputHousingMountId, outputHousingMountId, priceAmount, priceCurrency, productPhotos, productId, productUrl } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.portAdapter.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'A port adapter with this name already exists' }, { status: 409 })
        }

        const adapter = await prisma.portAdapter.create({
            data: {
                name,
                slug,
                manufacturerId,
                inputHousingMountId: inputHousingMountId || null,
                outputHousingMountId: outputHousingMountId || null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                productId: productId?.trim() || null,
                productUrl: productUrl?.trim() || null,
            },
            include: { manufacturer: true, inputHousingMount: true, outputHousingMount: true },
        })

        return NextResponse.json(adapter, { status: 201 })
    } catch (error) {
        console.error('Error creating port adapter:', error)
        return NextResponse.json({ error: 'Failed to create port adapter' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Port adapter ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, inputHousingMountId, outputHousingMountId, priceAmount, priceCurrency, productPhotos, productId, productUrl } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.portAdapter.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'A port adapter with this name already exists' }, { status: 409 })
        }

        const adapter = await prisma.portAdapter.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                inputHousingMountId: inputHousingMountId || null,
                outputHousingMountId: outputHousingMountId || null,
                priceAmount: priceAmount || null,
                priceCurrency: priceCurrency || 'USD',
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                productId: productId?.trim() || null,
                productUrl: productUrl?.trim() || null,
            },
            include: { manufacturer: true, inputHousingMount: true, outputHousingMount: true },
        })

        return NextResponse.json(adapter)
    } catch (error) {
        console.error('Error updating port adapter:', error)
        return NextResponse.json({ error: 'Failed to update port adapter' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Port adapter ID is required' }, { status: 400 })

        await prisma.portAdapter.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting port adapter:', error)
        return NextResponse.json({ error: 'Failed to delete port adapter' }, { status: 500 })
    }
}
