import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const [cameras, housings, lenses, ports] = await Promise.all([
            prisma.camera.findMany({
                include: { brand: true },
                orderBy: { name: 'asc' },
            }),
            prisma.housing.findMany({
                include: { manufacturer: true },
                orderBy: { name: 'asc' },
            }),
            prisma.lens.findMany({ orderBy: { name: 'asc' } }),
            prisma.port.findMany({ orderBy: { name: 'asc' } }),
        ])
        return NextResponse.json({ success: true, data: { cameras, housings, lenses, ports } })
    } catch (error) {
        console.error('Error fetching equipment:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch equipment' }, { status: 500 })
    }
}
