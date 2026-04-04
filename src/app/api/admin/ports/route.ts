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
        const ports = await prisma.port.findMany({
            include: { manufacturer: true, housingMount: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(ports)
    } catch (error) {
        console.error('Error fetching ports:', error)
        return NextResponse.json({ error: 'Failed to fetch ports' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, housingMountId, productPhotos } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.port.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'A port with this name already exists for this manufacturer' }, { status: 409 })
        }

        const port = await prisma.port.create({
            data: {
                name,
                slug,
                manufacturerId,
                housingMountId: housingMountId || null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
            },
            include: { manufacturer: true, housingMount: true },
        })

        return NextResponse.json(port, { status: 201 })
    } catch (error) {
        console.error('Error creating port:', error)
        return NextResponse.json({ error: 'Failed to create port' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Port ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, housingMountId, productPhotos } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.port.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'A port with this name already exists' }, { status: 409 })
        }

        const port = await prisma.port.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                housingMountId: housingMountId || null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
            },
            include: { manufacturer: true, housingMount: true },
        })

        return NextResponse.json(port)
    } catch (error) {
        console.error('Error updating port:', error)
        return NextResponse.json({ error: 'Failed to update port' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Port ID is required' }, { status: 400 })

        await prisma.port.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting port:', error)
        return NextResponse.json({ error: 'Failed to delete port' }, { status: 500 })
    }
}
