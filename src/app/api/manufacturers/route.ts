import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const manufacturers = await prisma.housingManufacturer.findMany({
            include: {
                housings: {
                    include: {
                        Camera: {
                            include: {
                                brand: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        housings: true
                    }
                }
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
        console.error('Error fetching manufacturers:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch manufacturers',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}