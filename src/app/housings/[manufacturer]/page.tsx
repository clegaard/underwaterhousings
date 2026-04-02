import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getHousingImagePathWithFallback } from '@/lib/images'
import { auth } from '@/auth'
import HousingManufacturerHousingsClient from '@/components/HousingManufacturerHousingsClient'

interface ManufacturerPageProps {
    params: {
        manufacturer: string
    }
}

async function getManufacturerHousings(manufacturerSlug: string) {
    try {
        const manufacturer = await prisma.housingManufacturer.findUnique({
            where: { slug: manufacturerSlug },
            include: {
                housings: {
                    include: {
                        Camera: { include: { brand: true } }
                    },
                    orderBy: { name: 'asc' }
                },
                housingMounts: { orderBy: { name: 'asc' } }
            }
        })
        return manufacturer
    } catch (error) {
        console.error('Error fetching manufacturer housings:', error)
        return null
    }
}

export default async function ManufacturerPage({ params }: ManufacturerPageProps) {
    const [manufacturer, session, allCameras] = await Promise.all([
        getManufacturerHousings(params.manufacturer),
        auth(),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
    ])

    if (!manufacturer) {
        notFound()
    }

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const housingsData = manufacturer.housings.map(housing => ({
        id: housing.id,
        name: housing.name,
        slug: housing.slug,
        description: housing.description,
        material: housing.material,
        housingMountId: housing.housingMountId,
        depthRating: housing.depthRating,
        priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null,
        priceCurrency: housing.priceCurrency,
        productPhotos: housing.productPhotos,
        interchangeablePort: housing.interchangeablePort,
        camera: housing.Camera
            ? { id: housing.Camera.id, name: housing.Camera.name, brand: { name: housing.Camera.brand.name } }
            : null,
        imageInfo: getHousingImagePathWithFallback(housing.productPhotos),
    }))

    const cameras = allCameras.map(c => ({
        id: c.id,
        name: c.name,
        brand: { name: c.brand.name },
    }))

    const housingMounts = manufacturer.housingMounts.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{manufacturer.name}</h1>
                            <p className="text-xl text-gray-700">
                                {manufacturer.description || `Professional underwater camera housings from ${manufacturer.name}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{housingsData.length}</div>
                            <div className="text-sm text-gray-600">Housing{housingsData.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <HousingManufacturerHousingsClient
                    housings={housingsData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    housingMounts={housingMounts}
                    cameras={cameras}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}