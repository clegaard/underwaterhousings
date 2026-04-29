import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

async function requireSuperuser() {
    const session = await auth()
    if (!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
}

// Function to create URL-friendly slugs
function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim()
}

// GET - List all housings
export async function GET() {
    try {
        const housings = await prisma.housing.findMany({
            include: {
                manufacturer: true,
                cameras: {
                    include: {
                        brand: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(housings)
    } catch (error) {
        console.error('Error fetching housings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch housings' },
            { status: 500 }
        )
    }
}

// POST - Create new housing
export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const body = await request.json()
        const {
            name,
            description,
            priceAmount,
            priceCurrency = 'USD',
            depthRating,
            material,
            manufacturerId,
            cameraIds,
            housingMountId,
            productPhotos,
            interchangeablePort = true,
            productId,
            productUrl,
        } = body

        if (!name || !manufacturerId || !cameraIds?.length) {
            return NextResponse.json(
                { error: 'Model, name, housing manufacturer, and at least one camera are required' },
                { status: 400 }
            )
        }

        // Verify the manufacturer and cameras exist
        const [manufacturer, cameras] = await Promise.all([
            prisma.manufacturer.findUnique({
                where: { id: manufacturerId }
            }),
            prisma.camera.findMany({
                where: { id: { in: cameraIds } },
                include: { brand: true }
            })
        ])

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'Housing manufacturer not found' },
                { status: 404 }
            )
        }

        if (cameras.length !== cameraIds.length) {
            return NextResponse.json(
                { error: 'One or more cameras more cameras not found' },
                { status: 404 }
            )
        }

        const slug = createSlug(name)

        // Check if housing with this slug already exists for this manufacturer
        const existingHousing = await prisma.housing.findFirst({
            where: {
                slug,
                manufacturerId
            }
        })

        if (existingHousing) {
            return NextResponse.json(
                { error: 'A housing with this name already exists for this manufacturer' },
                { status: 409 }
            )
        }

        const housing = await prisma.housing.create({
            data: {
                name,
                slug,
                description: description || null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                depthRating: depthRating ? parseInt(depthRating) : 0,
                material: material || null,
                manufacturerId,
                cameras: { connect: cameraIds.map((id: number) => ({ id })) },
                housingMountId: housingMountId ?? null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                interchangeablePort,
                productId: productId?.trim() || null,
                productUrl: productUrl?.trim() || null,
            },
            include: {
                manufacturer: true,
                cameras: {
                    include: {
                        brand: true
                    }
                }
            }
        })

        return NextResponse.json(housing, { status: 201 })
    } catch (error) {
        console.error('Error creating housing:', error)
        return NextResponse.json(
            { error: 'Failed to create housing' },
            { status: 500 }
        )
    }
}

// PUT - Update housing
export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Housing ID is required' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const {
            name,
            description,
            priceAmount,
            priceCurrency = 'USD',
            depthRating,
            material,
            manufacturerId,
            cameraIds,
            housingMountId,
            productPhotos,
            interchangeablePort = true,
            productId,
            productUrl,
        } = body

        // Validate required fields
        if (!name || !manufacturerId || !cameraIds?.length) {
            return NextResponse.json(
                { error: 'Model, name, housing manufacturer, and at least one camera are required' },
                { status: 400 }
            )
        }

        // Check if manufacturer and cameras exist
        const [manufacturer, cameras] = await Promise.all([
            prisma.manufacturer.findUnique({ where: { id: manufacturerId } }),
            prisma.camera.findMany({ where: { id: { in: cameraIds } } })
        ])

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'Housing manufacturer not found' },
                { status: 404 }
            )
        }

        if (cameras.length !== cameraIds.length) {
            return NextResponse.json(
                { error: 'One or more cameras not found' },
                { status: 404 }
            )
        }

        const slug = createSlug(name)

        // Check if housing with this slug already exists for this manufacturer (excluding current housing)
        const existingHousing = await prisma.housing.findFirst({
            where: {
                slug,
                manufacturerId,
                NOT: { id: parseInt(id) }
            }
        })

        if (existingHousing) {
            return NextResponse.json(
                { error: 'A housing with this name already exists for this manufacturer' },
                { status: 409 }
            )
        }

        const housing = await prisma.housing.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                description: description || null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                depthRating: depthRating ? parseInt(depthRating) : 0,
                material: material || null,
                manufacturerId,
                cameras: { set: cameraIds.map((id: number) => ({ id })) },
                housingMountId: housingMountId ?? null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                interchangeablePort,
                productId: productId?.trim() || null,
                productUrl: productUrl?.trim() || null,
            },
            include: {
                manufacturer: true,
                cameras: {
                    include: {
                        brand: true
                    }
                }
            }
        })

        return NextResponse.json(housing)
    } catch (error) {
        console.error('Error updating housing:', error)
        return NextResponse.json(
            { error: 'Failed to update housing' },
            { status: 500 }
        )
    }
}

// DELETE - Delete housing
export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Housing ID is required' },
                { status: 400 }
            )
        }

        // Delete the housing (no dependent checks needed as housing is typically a leaf entity)
        await prisma.housing.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ message: 'Housing deleted successfully' })
    } catch (error) {
        console.error('Error deleting housing:', error)
        return NextResponse.json(
            { error: 'Failed to delete housing' },
            { status: 500 }
        )
    }
}