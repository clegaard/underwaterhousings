import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const manufacturer = searchParams.get('manufacturer')
        const maxPrice = searchParams.get('maxPrice')

        const where: any = {}

        if (manufacturer) {
            where.manufacturer = {
                name: manufacturer
            }
        }

        if (maxPrice) {
            where.priceAmount = {
                lte: parseFloat(maxPrice)
            }
        }

        const housings = await prisma.housing.findMany({
            where,
            include: {
                manufacturer: true,
                Camera: {
                    include: {
                        brand: true
                    }
                }
            },
            orderBy: [
                { manufacturer: { name: 'asc' } },
                { name: 'asc' }
            ]
        })

        return NextResponse.json({
            success: true,
            data: housings,
            count: housings.length,
            filters: {
                manufacturer,
                maxPrice
            }
        })
    } catch (error) {
        console.error('Error fetching housings:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch housings',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}