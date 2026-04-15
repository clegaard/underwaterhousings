import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getHousingImagePathWithFallback, getPortImagePathWithFallback } from '@/lib/images'
import HousingManufacturerHousingsClient from '@/components/HousingManufacturerHousingsClient'
import PortManufacturerPortsClient from '@/components/PortManufacturerPortsClient'
import ExtensionRingsClient from '@/components/ExtensionRingsClient'
import PortAdaptersClient from '@/components/PortAdaptersClient'

interface GearManufacturerPageProps {
    params: { manufacturer: string }
}

async function getData(slug: string) {
    const [manufacturer, allCameras, allHousingMounts] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                housings: {
                    include: { Camera: { include: { brand: true } } },
                    orderBy: { name: 'asc' },
                },
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
                housingMounts: { orderBy: { name: 'asc' } },
                _count: { select: { housings: true, ports: true, extensionRings: true, portAdapters: true } },
            },
        }),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
    ])
    return { manufacturer, allCameras, allHousingMounts }
}

export async function generateMetadata({ params }: GearManufacturerPageProps) {
    const { manufacturer } = await getData(params.manufacturer)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} - Housings, Ports & Accessories`,
        description: manufacturer.description ?? `Browse ${manufacturer.name} underwater camera housings, ports, and accessories`,
    }
}

export default async function GearManufacturerPage({ params }: GearManufacturerPageProps) {
    const [{ manufacturer, allCameras, allHousingMounts }, session] = await Promise.all([
        getData(params.manufacturer),
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
        camera: h.Camera
            ? { id: h.Camera.id, name: h.Camera.name, brand: { name: h.Camera.brand.name } }
            : null,
        imageInfo: getHousingImagePathWithFallback(h.productPhotos),
    }))

    const portsData = manufacturer.ports.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        housingMount: p.housingMount,
        productPhotos: p.productPhotos,
        imageInfo: getPortImagePathWithFallback(p.productPhotos),
    }))

    const extensionRingsData = manufacturer.extensionRings.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        productPhotos: r.productPhotos,
        priceAmount: r.priceAmount ? parseFloat(r.priceAmount.toString()) : null,
        priceCurrency: r.priceCurrency,
        lengthMm: r.lengthMm,
        housingMount: r.housingMount,
        imageInfo: getPortImagePathWithFallback(r.productPhotos),
    }))

    const portAdaptersData = manufacturer.portAdapters.map(a => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        productPhotos: a.productPhotos,
        priceAmount: a.priceAmount ? parseFloat(a.priceAmount.toString()) : null,
        priceCurrency: a.priceCurrency,
        inputHousingMount: a.inputHousingMount,
        outputHousingMount: a.outputHousingMount,
        imageInfo: getPortImagePathWithFallback(a.productPhotos),
    }))

    const cameras = allCameras.map(c => ({ id: c.id, name: c.name, brand: { name: c.brand.name } }))
    const housingMounts = manufacturer.housingMounts.map(m => ({ id: m.id, name: m.name, slug: m.slug }))

    const tabs = [
        { id: 'housings', label: 'Housings', count: manufacturer._count.housings },
        { id: 'ports', label: 'Ports', count: manufacturer._count.ports },
        { id: 'rings', label: 'Extension Rings', count: manufacturer._count.extensionRings },
        { id: 'adapters', label: 'Port Adapters', count: manufacturer._count.portAdapters },
    ].filter(t => t.count > 0 || isSuperuser)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        {' / '}
                        <Link href="/gear" className="hover:text-blue-600">Housings, Ports &amp; Accessories</Link>
                        {' / '}
                        <span className="text-gray-700">{manufacturer.name}</span>
                    </nav>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-1">{manufacturer.name}</h1>
                            <p className="text-gray-600">
                                {manufacturer.description ?? `Underwater camera gear from ${manufacturer.name}`}
                            </p>
                            <Link
                                href={`/gear/${manufacturer.slug}/port-chart`}
                                className="inline-flex items-center gap-1.5 mt-3 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View Port Chart
                            </Link>
                        </div>
                        <div className="flex gap-4 text-center">
                            {manufacturer._count.housings > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{manufacturer._count.housings}</div>
                                    <div className="text-xs text-gray-500">Housing{manufacturer._count.housings !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                            {manufacturer._count.ports > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-emerald-600">{manufacturer._count.ports}</div>
                                    <div className="text-xs text-gray-500">Port{manufacturer._count.ports !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                            {manufacturer._count.extensionRings > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">{manufacturer._count.extensionRings}</div>
                                    <div className="text-xs text-gray-500">Ring{manufacturer._count.extensionRings !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                            {manufacturer._count.portAdapters > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-amber-600">{manufacturer._count.portAdapters}</div>
                                    <div className="text-xs text-gray-500">Adapter{manufacturer._count.portAdapters !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section anchor tabs */}
                {tabs.length > 1 && (
                    <div className="border-t border-gray-100">
                        <div className="max-w-7xl mx-auto px-4">
                            <nav className="flex gap-1 py-2">
                                {tabs.map(t => (
                                    <a
                                        key={t.id}
                                        href={`#${t.id}`}
                                        className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        {t.label}
                                        <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-16">
                {/* Housings section */}
                {(housingsData.length > 0 || isSuperuser) && (
                    <section id="housings">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Housings</h2>
                        <HousingManufacturerHousingsClient
                            housings={housingsData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            housingMounts={housingMounts}
                            cameras={cameras}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

                {/* Ports section */}
                {(portsData.length > 0 || isSuperuser) && (
                    <section id="ports">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Ports</h2>
                        <PortManufacturerPortsClient
                            ports={portsData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            housingMounts={allHousingMounts}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

                {/* Extension Rings section */}
                {(extensionRingsData.length > 0 || isSuperuser) && (
                    <section id="rings">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Extension Rings</h2>
                        <ExtensionRingsClient
                            rings={extensionRingsData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            housingMounts={allHousingMounts}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

                {/* Port Adapters section */}
                {(portAdaptersData.length > 0 || isSuperuser) && (
                    <section id="adapters">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Port Adapters</h2>
                        <PortAdaptersClient
                            adapters={portAdaptersData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            housingMounts={allHousingMounts}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}
            </div>
        </div>
    )
}
