import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getLensImagePathWithFallback } from '@/lib/images'
import LensManufacturerLensesClient from '@/components/LensManufacturerLensesClient'

interface LensManufacturerPageProps {
    params: { manufacturer: string }
}

async function getLensManufacturerLenses(manufacturerSlug: string) {
    try {
        return await prisma.manufacturer.findUnique({
            where: { slug: manufacturerSlug },
            include: {
                lenses: {
                    include: { cameraMount: true },
                    orderBy: { name: 'asc' },
                },
            },
        })
    } catch (error) {
        console.error('Error fetching lens manufacturer:', error)
        return null
    }
}

export default async function LensManufacturerPage({ params }: LensManufacturerPageProps) {
    const [manufacturer, session, cameraMounts] = await Promise.all([
        getLensManufacturerLenses(params.manufacturer),
        auth(),
        prisma.cameraMount.findMany({ orderBy: { name: 'asc' } }),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const lensesData = manufacturer.lenses.map(lens => ({
        id: lens.id,
        name: lens.name,
        slug: lens.slug,
        cameraMount: lens.cameraMount,
        exifId: lens.exifId ?? null,
        productPhotos: lens.productPhotos,
        productId: lens.productId ?? null,
        productUrl: lens.productUrl ?? null,
        imageInfo: getLensImagePathWithFallback(lens.productPhotos),
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{manufacturer.name} Lenses</h1>
                            <p className="text-xl text-gray-700">
                                Lens models from {manufacturer.name}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{lensesData.length}</div>
                            <div className="text-sm text-gray-600">Lens{lensesData.length !== 1 ? 'es' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <LensManufacturerLensesClient
                    lenses={lensesData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    cameraMounts={cameraMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
