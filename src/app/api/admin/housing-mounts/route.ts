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
        const mounts = await prisma.housingMount.findMany({
            include: { manufacturer: true },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json(mounts)
    } catch (error) {
        console.error('Error fetching housing mounts:', error)
        return NextResponse.json({ error: 'Failed to fetch housing mounts' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const body = await request.json()
        const { name, manufacturerId, description, innerDiameter } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.housingMount.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ error: 'A housing mount with this name already exists' }, { status: 409 })
        }

        const mount = await prisma.housingMount.create({
            data: {
                name,
                slug,
                manufacturerId,
                description: description || null,
                innerDiameter: innerDiameter ? parseFloat(innerDiameter) : null,
            },
            include: { manufacturer: true },
        })

        return NextResponse.json(mount, { status: 201 })
    } catch (error) {
        console.error('Error creating housing mount:', error)
        return NextResponse.json({ error: 'Failed to create housing mount' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Housing mount ID is required' }, { status: 400 })

        const body = await request.json()
        const { name, manufacturerId, description, innerDiameter } = body

        if (!name || !manufacturerId) {
            return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 })
        }

        const manufacturer = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } })
        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        const existing = await prisma.housingMount.findFirst({
            where: { slug, NOT: { id: parseInt(id) } },
        })
        if (existing) {
            return NextResponse.json({ error: 'A housing mount with this name already exists' }, { status: 409 })
        }

        const mount = await prisma.housingMount.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                manufacturerId,
                description: description || null,
                innerDiameter: innerDiameter ? parseFloat(innerDiameter) : null,
            },
            include: { manufacturer: true },
        })

        return NextResponse.json(mount)
    } catch (error) {
        console.error('Error updating housing mount:', error)
        return NextResponse.json({ error: 'Failed to update housing mount' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Housing mount ID is required' }, { status: 400 })

        await prisma.housingMount.delete({ where: { id: parseInt(id) } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting housing mount:', error)
        return NextResponse.json({ error: 'Failed to delete housing mount' }, { status: 500 })
    }
}
