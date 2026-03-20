import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const rigs = await prisma.cameraRig.findMany({
            include: {
                camera: { include: { brand: true } },
                lens: true,
                housing: { include: { manufacturer: true } },
                port: true,
            },
            orderBy: { name: 'asc' },
        })
        return NextResponse.json({ success: true, data: rigs })
    } catch (error) {
        console.error('Error fetching camera rigs:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch camera rigs' }, { status: 500 })
    }
}
