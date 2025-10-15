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

// GET - List all housing manufacturers
export async function GET() {
    try {
        const manufacturers = await prisma.housingManufacturer.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(manufacturers)
    } catch (error) {
        console.error('Error fetching housing manufacturers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch housing manufacturers' },
            { status: 500 }
        )
    }
}

// POST - Create new housing manufacturer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const slug = createSlug(name)

        // Check if manufacturer with this slug already exists
        const existingManufacturer = await prisma.housingManufacturer.findUnique({
            where: { slug }
        })

        if (existingManufacturer) {
            return NextResponse.json(
                { error: 'A manufacturer with this name already exists' },
                { status: 409 }
            )
        }

        const manufacturer = await prisma.housingManufacturer.create({
            data: {
                name,
                slug,
                description: description || null
            }
        })

        return NextResponse.json(manufacturer, { status: 201 })
    } catch (error) {
        console.error('Error creating housing manufacturer:', error)
        return NextResponse.json(
            { error: 'Failed to create housing manufacturer' },
            { status: 500 }
        )
    }
}

// PUT - Update housing manufacturer
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Manufacturer ID is required' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const slug = createSlug(name)

        // Check if manufacturer with this slug already exists (excluding current manufacturer)
        const existingManufacturer = await prisma.housingManufacturer.findFirst({
            where: {
                slug,
                NOT: { id }
            }
        })

        if (existingManufacturer) {
            return NextResponse.json(
                { error: 'A manufacturer with this name already exists' },
                { status: 409 }
            )
        }

        const manufacturer = await prisma.housingManufacturer.update({
            where: { id },
            data: {
                name,
                slug,
                description: description || null
            }
        })

        return NextResponse.json(manufacturer)
    } catch (error) {
        console.error('Error updating housing manufacturer:', error)
        return NextResponse.json(
            { error: 'Failed to update housing manufacturer' },
            { status: 500 }
        )
    }
}

// DELETE - Delete housing manufacturer
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

        // Check if manufacturer has any housings
        const housingCount = await prisma.housing.count({
            where: { housingManufacturerId: id }
        })

        if (housingCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete manufacturer. There are ${housingCount} housings associated with this manufacturer.` },
                { status: 409 }
            )
        }

        // Delete the manufacturer
        await prisma.housingManufacturer.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Manufacturer deleted successfully' })
    } catch (error) {
        console.error('Error deleting housing manufacturer:', error)
        return NextResponse.json(
            { error: 'Failed to delete housing manufacturer' },
            { status: 500 }
        )
    }
}