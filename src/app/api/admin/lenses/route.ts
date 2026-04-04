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
        const lenses = await prisma.lens.findMany({
            include: { manufacturer: true, cameraMount: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(lenses)
    } catch (error) {
        console.error('Error fetching lenses:', error)
        return NextResponse.json({ error: 'Failed to fetch lenses' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, cameraMountId, exifId, productPhotos } = body

        if (!name || !manufacturerId || !cameraMountId) {
            return NextResponse.json({ error: 'Name, manufacturer and camera mount are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.lens.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'A lens with this name already exists for this manufacturer' }, { status: 409 })
        }

        const lens = await prisma.lens.create({
            data: {
                name,
                slug,
                manufacturerId,
                cameraMountId,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                exifId: exifId?.trim() || null,
            },
            include: { manufacturer: true, cameraMount: true },
        })

        return NextResponse.json(lens, { status: 201 })
    } catch (error) {
        console.error('Error creating lens:', error)
        return NextResponse.json({ error: 'Failed to create lens' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Lens ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, cameraMountId, exifId, productPhotos } = body

        if (!name || !manufacturerId || !cameraMountId) {
            return NextResponse.json({ error: 'Name, manufacturer and camera mount are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.lens.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'A lens with this name already exists' }, { status: 409 })
        }

        const lens = await prisma.lens.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                cameraMountId,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                exifId: exifId?.trim() || null,
            },
            include: { manufacturer: true, cameraMount: true },
        })

        return NextResponse.json(lens)
    } catch (error) {
        console.error('Error updating lens:', error)
        return NextResponse.json({ error: 'Failed to update lens' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Lens ID is required' }, { status: 400 })

        await prisma.lens.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting lens:', error)
        return NextResponse.json({ error: 'Failed to delete lens' }, { status: 500 })
    }
}
