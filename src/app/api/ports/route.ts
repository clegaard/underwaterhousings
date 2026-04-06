import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const simple = searchParams.get('simple') === 'true'

        if (simple) {
            // Only manufacturers with at least one port
            const manufacturers = await prisma.manufacturer.findMany({
                where: { ports: { some: {} } },
                select: { id: true, name: true, slug: true },
                orderBy: { name: 'asc' },
            })
            return NextResponse.json(manufacturers)
        }

        const manufacturers = await prisma.manufacturer.findMany({
            include: {
                ports: true,
                _count: { select: { ports: true } },
            },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ success: true, data: manufacturers, count: manufacturers.length })
    } catch (error) {
        console.error('Error fetching port manufacturers:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch port manufacturers' }, { status: 500 })
    }
}
