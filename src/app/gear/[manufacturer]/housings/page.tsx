import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getHousingImagePathWithFallback } from '@/lib/images'
import HousingManufacturerHousingsClient from '@/components/HousingManufacturerHousingsClient'

interface Props {
    params: Promise<{ manufacturer: string }>
}

async function getData(slug: string) {
    const [manufacturer, allCameras, allHousingMounts] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                housings: {
                    include: { cameras: { include: { brand: true } } },
                    orderBy: { name: 'asc' },
                },
                housingMounts: { orderBy: { name: 'asc' } },
                _count: { select: { housings: true } },
            },
        }),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
    ])
    return { manufacturer, allCameras, allHousingMounts }
}

export async function generateMetadata({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const { manufacturer } = await getData(mSlug)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Housings`,
        description: `Browse all ${manufacturer._count.housings} housings from ${manufacturer.name}`,
    }
}

export default async function HousingsListingPage({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const [{ manufacturer, allCameras, allHousingMounts }, session] = await Promise.all([
        getData(mSlug),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const housingsData = manufacturer.housings.map(h => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        material: h.material,
        housingMountId: h.housingMountId,
        depthRating: h.depthRating,
        priceAmount: h.priceAmount ? Number(h.priceAmount) : null,
        priceCurrency: h.priceCurrency,
        productPhotos: h.productPhotos,
        interchangeablePort: h.interchangeablePort,
        cameras: h.cameras.map(c => ({ id: c.id, name: c.name, brand: { name: c.brand.name } })),
        imageInfo: getHousingImagePathWithFallback(h.productPhotos),
        productId: h.productId ?? null,
        productUrl: h.productUrl ?? null,
        cameraMountRecession: h.cameraMountRecession ?? null,
    }))

    const cameras = allCameras.map(c => ({ id: c.id, name: c.name, brand: { name: c.brand.name } }))
    const housingMounts = allHousingMounts.map(m => ({ id: m.id, name: m.name, slug: m.slug }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        {' / '}
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        {' / '}
                        <Link href={`/gear/${mSlug}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        {' / '}
                        <span className="text-gray-700">Housings</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Housings</h1>
                    <p className="text-gray-500 mt-1">
                        {manufacturer._count.housings} housing{manufacturer._count.housings !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
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
