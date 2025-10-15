import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Function to create URL-friendly slugs
function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim()
}

// GET - List all camera manufacturers
export async function GET() {
    try {
        const manufacturers = await prisma.cameraManufacturer.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(manufacturers)
    } catch (error) {
        console.error('Error fetching camera manufacturers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch camera manufacturers' },
            { status: 500 }
        )
    }
}

// POST - Create new camera manufacturer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, isActive = true } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const slug = createSlug(name)

        // Check if manufacturer with this slug already exists
        const existingManufacturer = await prisma.cameraManufacturer.findUnique({
            where: { slug }
        })

        if (existingManufacturer) {
            return NextResponse.json(
                { error: 'A manufacturer with this name already exists' },
                { status: 409 }
            )
        }

        const manufacturer = await prisma.cameraManufacturer.create({
            data: {
                name,
                slug,
                isActive
            }
        })

        return NextResponse.json(manufacturer, { status: 201 })
    } catch (error) {
        console.error('Error creating camera manufacturer:', error)
        return NextResponse.json(
            { error: 'Failed to create camera manufacturer' },
            { status: 500 }
        )
    }
}

// DELETE - Delete camera manufacturer
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Manufacturer ID is required' },
                { status: 400 }
            )
        }

        // Check if manufacturer has any cameras
        const cameraCount = await prisma.camera.count({
            where: { cameraManufacturerId: id }
        })

        if (cameraCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete manufacturer. There are ${cameraCount} cameras associated with this manufacturer.` },
                { status: 409 }
            )
        }

        // Delete the manufacturer
        await prisma.cameraManufacturer.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Manufacturer deleted successfully' })
    } catch (error) {
        console.error('Error deleting camera manufacturer:', error)
        return NextResponse.json(
            { error: 'Failed to delete camera manufacturer' },
            { status: 500 }
        )
    }
}