import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import PortChartClient from '@/components/PortChartClient'
import { getPortImagePathWithFallback } from '@/lib/images'

interface PageProps {
    params: { manufacturer: string }
}

async function getData(slug: string) {
    const [manufacturer, allLenses, allExtensionRings, allPortAdapters] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                ports: { include: { housingMount: true }, orderBy: { name: 'asc' } },
                extensionRings: { include: { housingMount: true }, orderBy: [{ housingMount: { name: 'asc' } }, { lengthMm: 'asc' }] },
                portChartEntries: {
                    include: {
                        lens: { include: { manufacturer: true, cameraMount: true } },
                        port: true,
                        steps: {
                            include: { extensionRing: true, portAdapter: true },
                            orderBy: { order: 'asc' },
                        },
                    },
                    orderBy: [{ lens: { name: 'asc' } }, { id: 'asc' }],
                },
            },
        }),
        prisma.lens.findMany({
            include: { manufacturer: true, cameraMount: true },
            orderBy: [{ manufacturer: { name: 'asc' } }, { name: 'asc' }],
        }),
        prisma.extensionRing.findMany({
            include: { housingMount: true },
            orderBy: [{ housingMount: { name: 'asc' } }, { lengthMm: 'asc' }],
        }),
        prisma.portAdapter.findMany({
            include: { inputHousingMount: true, outputHousingMount: true },
            orderBy: { name: 'asc' },
        }),
    ])
    return { manufacturer, allLenses, allExtensionRings, allPortAdapters }
}

export async function generateMetadata({ params }: PageProps) {
    const { manufacturer } = await getData(params.manufacturer)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Port Chart`,
        description: `Lens, extension ring and port combinations for ${manufacturer.name} underwater housings`,
    }
}

export default async function PortChartPage({ params }: PageProps) {
    const [{ manufacturer, allLenses, allExtensionRings, allPortAdapters }, session] = await Promise.all([
        getData(params.manufacturer),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const entries = manufacturer.portChartEntries.map(e => ({
        id: e.id,
        lens: {
            id: e.lens.id,
            name: e.lens.name,
            slug: e.lens.slug,
            manufacturer: { name: e.lens.manufacturer?.name ?? '', slug: e.lens.manufacturer?.slug ?? '' },
            cameraMount: { name: e.lens.cameraMount?.name ?? '' },
            focalLengthTele: e.lens.focalLengthTele,
            focalLengthWide: e.lens.focalLengthWide,
            isZoomLens: e.lens.isZoomLens,
            productPhotos: e.lens.productPhotos,
            imageInfo: getPortImagePathWithFallback(e.lens.productPhotos),
        },
        port: e.port ? {
            id: e.port.id,
            name: e.port.name,
            slug: e.port.slug,
            isFlatPort: e.port.isFlatPort,
            productPhotos: e.port.productPhotos,
            imageInfo: getPortImagePathWithFallback(e.port.productPhotos),
        } : null,
        steps: e.steps.map(s => ({
            id: s.id,
            order: s.order,
            extensionRing: s.extensionRing ? {
                id: s.extensionRing.id,
                name: s.extensionRing.name,
                slug: s.extensionRing.slug,
                lengthMm: s.extensionRing.lengthMm,
            } : null,
            portAdapter: s.portAdapter ? {
                id: s.portAdapter.id,
                name: s.portAdapter.name,
                slug: s.portAdapter.slug,
            } : null,
        })),
        notes: e.notes,
        isRecommended: e.isRecommended,
    }))

    const portsData = manufacturer.ports.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        isFlatPort: p.isFlatPort,
        productPhotos: p.productPhotos,
        housingMount: p.housingMount,
        imageInfo: getPortImagePathWithFallback(p.productPhotos),
    }))

    const extensionRingsData = allExtensionRings.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        lengthMm: r.lengthMm,
        housingMount: r.housingMount,
        imageInfo: getPortImagePathWithFallback(r.productPhotos ?? []),
    }))

    const portAdaptersData = allPortAdapters.map(a => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        inputHousingMount: a.inputHousingMount,
        outputHousingMount: a.outputHousingMount,
        imageInfo: getPortImagePathWithFallback(a.productPhotos ?? []),
    }))

    const lensesData = allLenses.map(l => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        manufacturer: { name: l.manufacturer?.name ?? '', slug: l.manufacturer?.slug ?? '' },
        cameraMount: { name: l.cameraMount?.name ?? '' },
        focalLengthTele: l.focalLengthTele,
        focalLengthWide: l.focalLengthWide,
        isZoomLens: l.isZoomLens,
        productPhotos: l.productPhotos,
        imageInfo: getPortImagePathWithFallback(l.productPhotos),
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        {' / '}
                        <Link href="/gear" className="hover:text-blue-600">Gear</Link>
                        {' / '}
                        <Link href={`/gear/${manufacturer.slug}`} className="hover:text-blue-600">{manufacturer.name}</Link>
                        {' / '}
                        <span className="text-gray-700">Port Chart</span>
                    </nav>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Port Chart</h1>
                            <p className="text-gray-600 mt-1">Valid lens, extension ring and port combinations</p>
                        </div>
                        <Link
                            href={`/gear/${manufacturer.slug}`}
                            className="shrink-0 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            ← Back to {manufacturer.name}
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <PortChartClient
                    manufacturerId={manufacturer.id}
                    manufacturerSlug={manufacturer.slug}
                    manufacturerName={manufacturer.name}
                    entries={entries}
                    allLenses={lensesData}
                    allPorts={portsData}
                    allExtensionRings={extensionRingsData}
                    allPortAdapters={portAdaptersData}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
