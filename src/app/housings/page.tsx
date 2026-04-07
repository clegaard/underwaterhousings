import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import HousingManufacturersClient from '@/components/HousingManufacturersClient'

export const metadata: Metadata = {
    title: 'Housings - UW Housings',
    description: 'Browse underwater camera housings by manufacturer',
}

export default async function HousingsPage() {
    const [manufacturers, cameras, session] = await Promise.all([
        prisma.manufacturer.findMany({
            include: {
                housings: {
                    include: { Camera: { include: { brand: true } } },
                    orderBy: { name: 'asc' },
                },
                housingMounts: { orderBy: { name: 'asc' } },
                _count: { select: { housings: true } },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const manufacturersData = manufacturers.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        logoPath: m.logoPath,
        _count: m._count,
        housingMounts: m.housingMounts.map(hm => ({ id: hm.id, name: hm.name, slug: hm.slug })),
        housings: m.housings.map(h => ({
            id: h.id,
            name: h.name,
            slug: h.slug,
            productPhotos: h.productPhotos,
            priceAmount: h.priceAmount ? parseFloat(h.priceAmount.toString()) : null,
            priceCurrency: h.priceCurrency,
            depthRating: h.depthRating,
            housingMountId: h.housingMountId,
            interchangeablePort: h.interchangeablePort,
            camera: h.Camera
                ? { id: h.Camera.id, name: h.Camera.name, brand: { name: h.Camera.brand.name } }
                : null,
        })),
    }))

    const camerasData = cameras.map(c => ({
        id: c.id,
        name: c.name,
        brand: { name: c.brand.name },
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-blue-900">Housings</h1>
                    <p className="text-gray-600 mt-1">Browse underwater camera housings by manufacturer</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <HousingManufacturersClient
                    manufacturers={manufacturersData}
                    cameras={camerasData}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
