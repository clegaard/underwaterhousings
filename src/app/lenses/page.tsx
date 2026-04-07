import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import LensManufacturersClient from '@/components/LensManufacturersClient'

export const metadata: Metadata = {
    title: 'Lenses - UW Housings',
    description: 'Browse lenses by manufacturer',
}

export default async function LensesPage() {
    const [manufacturers, cameraMounts, session] = await Promise.all([
        prisma.manufacturer.findMany({
            include: {
                lenses: {
                    include: { cameraMount: true },
                    orderBy: { name: 'asc' },
                },
                _count: { select: { lenses: true } },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.cameraMount.findMany({ orderBy: { name: 'asc' } }),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const manufacturersData = manufacturers.map(m => ({
        ...m,
        lenses: m.lenses.map(l => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            productPhotos: l.productPhotos,
            priceAmount: l.priceAmount ? parseFloat(l.priceAmount.toString()) : null,
            priceCurrency: l.priceCurrency,
            cameraMount: l.cameraMount,
            exifId: l.exifId,
            isZoomLens: l.isZoomLens,
            focalLengthTele: l.focalLengthTele,
            focalLengthWide: l.focalLengthWide ?? null,
        })),
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-blue-900">Lenses</h1>
                    <p className="text-gray-600 mt-1">Browse lenses by manufacturer</p>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <LensManufacturersClient
                    manufacturers={manufacturersData}
                    cameraMounts={cameraMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
