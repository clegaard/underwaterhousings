import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const simple = searchParams.get('simple') === 'true'

        if (simple) {
            // Return simplified data for navigation
            const manufacturers = await prisma.cameraManufacturer.findMany({
                select: {
                    id: true,
                    name: true,
                    slug: true
                },
                where: {
                    isActive: true
                },
                orderBy: {
                    name: 'asc'
                }
            })

            return NextResponse.json(manufacturers)
        }

        // Return full data with cameras for other uses
        const manufacturers = await prisma.cameraManufacturer.findMany({
            include: {
                cameras: {
                    orderBy: {
                        name: 'asc'
                    }
                },
                _count: {
                    select: {
                        cameras: true
                    }
                }
            },
            where: {
                isActive: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json({
            success: true,
            data: manufacturers,
            count: manufacturers.length
        })
    } catch (error) {
        console.error('Error fetching camera manufacturers:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch camera manufacturers',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}