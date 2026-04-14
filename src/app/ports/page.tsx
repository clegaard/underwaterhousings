import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import PortManufacturersClient from '@/components/PortManufacturersClient'

export const metadata: Metadata = {
    title: 'Ports - UW Housings',
    description: 'Browse ports by manufacturer',
}

export default async function PortsPage() {
    const [manufacturers, housingMounts, session] = await Promise.all([
        prisma.manufacturer.findMany({
            include: {
                ports: {
                    include: { housingMount: true },
                    orderBy: { name: 'asc' },
                },
                extensionRings: {
                    include: { housingMount: true },
                    orderBy: { name: 'asc' },
                },
                portAdapters: {
                    include: { inputHousingMount: true, outputHousingMount: true },
                    orderBy: { name: 'asc' },
                },
                _count: { select: { ports: true, extensionRings: true, portAdapters: true } },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const manufacturersData = manufacturers.map(m => ({
        ...m,
        ports: m.ports.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            productPhotos: p.productPhotos,
            priceAmount: p.priceAmount ? parseFloat(p.priceAmount.toString()) : null,
            priceCurrency: p.priceCurrency,
            housingMount: p.housingMount,
        })),
        extensionRings: m.extensionRings.map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            productPhotos: r.productPhotos,
            priceAmount: r.priceAmount ? parseFloat(r.priceAmount.toString()) : null,
            priceCurrency: r.priceCurrency,
            lengthMm: r.lengthMm,
            housingMount: r.housingMount,
        })),
        portAdapters: m.portAdapters.map(a => ({
            id: a.id,
            name: a.name,
            slug: a.slug,
            productPhotos: a.productPhotos,
            priceAmount: a.priceAmount ? parseFloat(a.priceAmount.toString()) : null,
            priceCurrency: a.priceCurrency,
            inputHousingMount: a.inputHousingMount,
            outputHousingMount: a.outputHousingMount,
        })),
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-blue-900">Ports</h1>
                    <p className="text-gray-600 mt-1">Browse ports by manufacturer</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <PortManufacturersClient
                    manufacturers={manufacturersData}
                    housingMounts={housingMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
