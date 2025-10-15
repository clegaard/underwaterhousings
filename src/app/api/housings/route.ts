import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const manufacturer = searchParams.get('manufacturer')
        const category = searchParams.get('category')
        const inStock = searchParams.get('inStock')
        const maxPrice = searchParams.get('maxPrice')

        const where: any = {
            isActive: true
        }

        if (manufacturer) {
            where.manufacturer = {
                slug: manufacturer
            }
        }

        if (category) {
            where.category = category
        }

        if (inStock === 'true') {
            where.inStock = true
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
                compatibility: {
                    include: {
                        cameraModel: {
                            include: {
                                brand: true
                            }
                        }
                    }
                },
                reviews: {
                    select: {
                        rating: true
                    }
                }
            },
            orderBy: [
                { manufacturer: { name: 'asc' } },
                { name: 'asc' }
            ]
        })

        // Calculate average ratings
        const housingsWithRatings = housings.map((housing: any) => {
            const ratings = housing.reviews.map((r: any) => r.rating)
            const averageRating = ratings.length > 0
                ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
                : null

            return {
                ...housing,
                averageRating,
                reviewCount: ratings.length
            }
        })

        return NextResponse.json({
            success: true,
            data: housingsWithRatings,
            count: housingsWithRatings.length,
            filters: {
                manufacturer,
                category,
                inStock,
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