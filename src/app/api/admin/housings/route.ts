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

// GET - List all housings
export async function GET() {
    try {
        const housings = await prisma.housing.findMany({
            include: {
                manufacturer: true,
                Camera: {
                    include: {
                        brand: true
                    }
                }
            },
            orderBy: { model: 'asc' }
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
    try {
        const body = await request.json()
        const {
            model,
            name,
            description,
            priceAmount,
            priceCurrency = 'USD',
            depthRating,
            material,
            housingManufacturerId,
            cameraId
        } = body

        if (!model || !name || !housingManufacturerId || !cameraId) {
            return NextResponse.json(
                { error: 'Model, name, housing manufacturer, and camera are required' },
                { status: 400 }
            )
        }

        // Verify the manufacturer and camera exist
        const [manufacturer, camera] = await Promise.all([
            prisma.housingManufacturer.findUnique({
                where: { id: housingManufacturerId }
            }),
            prisma.camera.findUnique({
                where: { id: cameraId },
                include: { brand: true }
            })
        ])

        if (!manufacturer) {
            return NextResponse.json(
                { error: 'Housing manufacturer not found' },
                { status: 404 }
            )
        }

        if (!camera) {
            return NextResponse.json(
                { error: 'Camera not found' },
                { status: 404 }
            )
        }

        const slug = createSlug(name)

        // Check if housing with this slug already exists for this manufacturer
        const existingHousing = await prisma.housing.findFirst({
            where: {
                slug,
                housingManufacturerId
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
                model,
                name,
                slug,
                description: description || null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                depthRating: depthRating ? parseInt(depthRating) : 0,
                material: material || null,
                housingManufacturerId,
                cameraId
            },
            include: {
                manufacturer: true,
                Camera: {
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

// DELETE - Delete housing
export async function DELETE(request: NextRequest) {
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
            where: { id }
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