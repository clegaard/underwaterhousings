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

// GET - List all cameras
export async function GET() {
    try {
        const cameras = await prisma.camera.findMany({
            include: {
                brand: true
            },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(cameras)
    } catch (error) {
        console.error('Error fetching cameras:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cameras' },
            { status: 500 }
        )
    }
}

// POST - Create new camera
export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const body = await request.json()
        const { name, cameraManufacturerId, interchangeableLens, canBeUsedWithoutAHousing, cameraMountId, productPhotos, exifId } = body

        if (!name || !cameraManufacturerId) {
            return NextResponse.json(
                { error: 'Name and camera manufacturer are required' },
                { status: 400 }
            )
        }

        // Verify the manufacturer exists
        const manufacturer = await prisma.cameraManufacturer.findUnique({
            where: { id: cameraManufacturerId }
        })

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'Camera manufacturer not found' },
                { status: 404 }
            )
        }

        // Create slug from manufacturer name + camera name
        const slug = createSlug(`${manufacturer.name} ${name}`)

        // Check if camera with this slug already exists
        const existingCamera = await prisma.camera.findUnique({
            where: { slug }
        })

        if (existingCamera) {
            return NextResponse.json(
                { error: 'A camera with this name already exists for this manufacturer' },
                { status: 409 }
            )
        }

        const camera = await prisma.camera.create({
            data: {
                name,
                slug,
                cameraManufacturerId,
                interchangeableLens: interchangeableLens ?? true,
                canBeUsedWithoutAHousing: canBeUsedWithoutAHousing ?? false,
                cameraMountId: interchangeableLens && cameraMountId ? cameraMountId : null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                exifId: exifId?.trim() || null,
            },
            include: {
                brand: true
            }
        })

        return NextResponse.json(camera, { status: 201 })
    } catch (error) {
        console.error('Error creating camera:', error)
        return NextResponse.json(
            { error: 'Failed to create camera' },
            { status: 500 }
        )
    }
}

// PUT - Update camera
export async function PUT(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Camera ID is required' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { name, cameraManufacturerId, interchangeableLens, canBeUsedWithoutAHousing, cameraMountId, productPhotos, exifId } = body

        if (!name || !cameraManufacturerId) {
            return NextResponse.json(
                { error: 'Name and camera manufacturer are required' },
                { status: 400 }
            )
        }

        // Verify the manufacturer exists
        const manufacturer = await prisma.cameraManufacturer.findUnique({
            where: { id: cameraManufacturerId }
        })

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'Camera manufacturer not found' },
                { status: 404 }
            )
        }

        const slug = createSlug(`${manufacturer.name} ${name}`)

        // Check if camera with this slug already exists for this manufacturer (excluding current camera)
        const existingCamera = await prisma.camera.findFirst({
            where: {
                slug,
                cameraManufacturerId: cameraManufacturerId,
                NOT: { id: parseInt(id) }
            }
        })

        if (existingCamera) {
            return NextResponse.json(
                { error: 'A camera with this name already exists for this manufacturer' },
                { status: 409 }
            )
        }

        const camera = await prisma.camera.update({
            where: { id: parseInt(id) },
            data: {
                name,
                slug,
                cameraManufacturerId,
                interchangeableLens: interchangeableLens ?? true,
                canBeUsedWithoutAHousing: canBeUsedWithoutAHousing ?? false,
                cameraMountId: interchangeableLens && cameraMountId ? cameraMountId : null,
                productPhotos: Array.isArray(productPhotos) ? productPhotos : [],
                exifId: exifId?.trim() || null,
            },
            include: {
                brand: true
            }
        })

        return NextResponse.json(camera)
    } catch (error) {
        console.error('Error updating camera:', error)
        return NextResponse.json(
            { error: 'Failed to update camera' },
            { status: 500 }
        )
    }
}

// DELETE - Delete camera
export async function DELETE(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Camera ID is required' },
                { status: 400 }
            )
        }

        // Check if camera has any housings
        const housingCount = await prisma.housing.count({
            where: { cameraId: parseInt(id) }
        })

        if (housingCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete camera. There are ${housingCount} housings associated with this camera.` },
                { status: 409 }
            )
        }

        // Delete the camera
        await prisma.camera.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ message: 'Camera deleted successfully' })
    } catch (error) {
        console.error('Error deleting camera:', error)
        return NextResponse.json(
            { error: 'Failed to delete camera' },
            { status: 500 }
        )
    }
}