import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { withBase, getHousingImagePathWithFallback, getPortImagePathWithFallback } from '@/lib/images'
import HousingManufacturerHousingsClient from '@/components/HousingManufacturerHousingsClient'
import HousingMountsClient from '@/components/HousingMountsClient'
import PortManufacturerPortsClient from '@/components/PortManufacturerPortsClient'
import ExtensionRingsClient from '@/components/ExtensionRingsClient'
import PortAdaptersClient from '@/components/PortAdaptersClient'
import GearsClient from '@/components/GearsClient'

interface GearManufacturerPageProps {
    params: { manufacturer: string }
}

async function getData(slug: string) {
    const [manufacturer, allCameras, allHousingMounts, allLenses] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                housings: {
                    include: { cameras: { include: { brand: true } } },
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
                gears: {
                    include: { lenses: { select: { id: true, name: true } } },
                    orderBy: { name: 'asc' },
                },
                housingMounts: { orderBy: { name: 'asc' } },
                _count: { select: { housings: true, ports: true, extensionRings: true, portAdapters: true, gears: true } },
            },
        }),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
        prisma.lens.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ])
    return { manufacturer, allCameras, allHousingMounts, allLenses }
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
    const [{ manufacturer, allCameras, allHousingMounts, allLenses }, session] = await Promise.all([
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
        cameras: h.cameras.map(c => ({ id: c.id, name: c.name, brand: { name: c.brand.name } })),
        imageInfo: getHousingImagePathWithFallback(h.productPhotos),
        productId: h.productId ?? null,
        productUrl: h.productUrl ?? null,
    }))

    const portsData = manufacturer.ports.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        housingMount: p.housingMount,
        productPhotos: p.productPhotos,
        imageInfo: getPortImagePathWithFallback(p.productPhotos),
        productId: p.productId ?? null,
        productUrl: p.productUrl ?? null,
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
        productId: r.productId ?? null,
        productUrl: r.productUrl ?? null,
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
        productId: a.productId ?? null,
        productUrl: a.productUrl ?? null,
    }))

    const gearsData = manufacturer.gears.map(g => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        priceAmount: g.priceAmount ? parseFloat(g.priceAmount.toString()) : null,
        priceCurrency: g.priceCurrency,
        productPhotos: g.productPhotos,
        imageInfo: getPortImagePathWithFallback(g.productPhotos),
        lenses: g.lenses,
        productId: g.productId ?? null,
        productUrl: g.productUrl ?? null,
    }))

    const cameras = allCameras.map(c => ({ id: c.id, name: c.name, brand: { name: c.brand.name } }))
    const housingMounts = manufacturer.housingMounts.map(m => ({ id: m.id, name: m.name, slug: m.slug }))
    const housingMountsData = manufacturer.housingMounts.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        innerDiameter: m.innerDiameter,
    }))

    const tabs = [
        ...(isSuperuser ? [{ id: 'mounts', label: 'Housing Mounts', count: manufacturer.housingMounts.length }] : []),
        { id: 'housings', label: 'Housings', count: manufacturer._count.housings },
        { id: 'ports', label: 'Ports', count: manufacturer._count.ports },
        { id: 'rings', label: 'Extension Rings', count: manufacturer._count.extensionRings },
        { id: 'adapters', label: 'Port Adapters', count: manufacturer._count.portAdapters },
        { id: 'gears', label: 'Gears', count: manufacturer._count.gears },
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
                            {manufacturer.logoPath ? (
                                <img
                                    src={withBase(manufacturer.logoPath)}
                                    alt={`${manufacturer.name} logo`}
                                    className="h-16 object-contain mb-1"
                                />
                            ) : (
                                <h1 className="text-4xl font-bold text-blue-900 mb-1">{manufacturer.name}</h1>
                            )}
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
                            {manufacturer._count.gears > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-teal-600">{manufacturer._count.gears}</div>
                                    <div className="text-xs text-gray-500">Gear{manufacturer._count.gears !== 1 ? 's' : ''}</div>
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
                {/* Housing Mounts section */}
                {isSuperuser && (
                    <section id="mounts">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Housing Mounts</h2>
                        <HousingMountsClient
                            mounts={housingMountsData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

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
                            housingMounts={housingMounts}
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
                            housingMounts={housingMounts}
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
                            housingMounts={housingMounts}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

                {/* Gears section */}
                {(gearsData.length > 0 || isSuperuser) && (
                    <section id="gears">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Gears</h2>
                        <GearsClient
                            gears={gearsData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            allLenses={allLenses}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}
            </div>
        </div>
    )
}
