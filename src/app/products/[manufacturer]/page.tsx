import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { withBase, getHousingImagePathWithFallback, getPortImagePathWithFallback, getCameraImagePathWithFallback, getLensImagePathWithFallback } from '@/lib/images'
import CameraManufacturerCamerasClient from '@/components/CameraManufacturerCamerasClient'
import LensManufacturerLensesClient from '@/components/LensManufacturerLensesClient'
import HousingManufacturerHousingsClient from '@/components/HousingManufacturerHousingsClient'
import HousingMountsClient from '@/components/HousingMountsClient'
import PortManufacturerPortsClient from '@/components/PortManufacturerPortsClient'
import ExtensionRingsClient from '@/components/ExtensionRingsClient'
import PortAdaptersClient from '@/components/PortAdaptersClient'
import GearsClient from '@/components/GearsClient'

interface ProductsManufacturerPageProps {
    params: Promise<{ manufacturer: string }>
}

async function getData(slug: string) {
    const [manufacturer, allCameras, allHousingMounts, allLenses, cameraMounts] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                cameras: {
                    include: {
                        housings: { include: { manufacturer: true } },
                        cameraMount: true,
                    },
                    orderBy: { name: 'asc' },
                },
                lenses: {
                    include: { cameraMount: true },
                    orderBy: { name: 'asc' },
                },
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
                _count: {
                    select: {
                        cameras: true,
                        lenses: true,
                        housings: true,
                        ports: true,
                        extensionRings: true,
                        portAdapters: true,
                        gears: true,
                    },
                },
            },
        }),
        prisma.camera.findMany({ include: { brand: true }, orderBy: { name: 'asc' } }),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
        prisma.lens.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.cameraMount.findMany({ orderBy: { name: 'asc' } }),
    ])
    return { manufacturer, allCameras, allHousingMounts, allLenses, cameraMounts }
}

export async function generateMetadata({ params }: ProductsManufacturerPageProps) {
    const { manufacturer: mSlug } = await params
    const { manufacturer } = await getData(mSlug)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} - Products`,
        description: manufacturer.description ?? `Browse all products from ${manufacturer.name}`,
    }
}

export default async function ProductsManufacturerPage({ params }: ProductsManufacturerPageProps) {
    const { manufacturer: mSlug } = await params
    const [{ manufacturer, allCameras, allHousingMounts, allLenses, cameraMounts }, session] = await Promise.all([
        getData(mSlug),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    // Cameras
    const camerasData = manufacturer.cameras.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? null,
        housings: c.housings,
        cameraMount: c.cameraMount,
        interchangeableLens: c.interchangeableLens,
        canBeUsedWithoutAHousing: c.canBeUsedWithoutAHousing,
        exifId: c.exifId ?? null,
        productPhotos: c.productPhotos,
        imageInfo: getCameraImagePathWithFallback(c.productPhotos),
        priceAmount: c.priceAmount ? c.priceAmount.toString() : null,
        priceCurrency: c.priceCurrency ?? null,
        sensorWidth: c.sensorWidth ?? null,
        sensorHeight: c.sensorHeight ?? null,
        megapixels: c.megapixels ?? null,
        isZoomLens: c.isZoomLens,
        focalLengthTele: c.focalLengthTele ?? null,
        focalLengthWide: c.focalLengthWide ?? null,
        minimumFocusDistanceTele: c.minimumFocusDistanceTele ?? null,
        minimumFocusDistanceWide: c.minimumFocusDistanceWide ?? null,
        maximumMagnification: c.maximumMagnificationTele ?? null,
        depthRating: c.depthRating ?? null,
        productId: c.productId ?? null,
        productUrl: c.productUrl ?? null,
    }))

    // Lenses
    const lensesData = manufacturer.lenses.map(l => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        cameraMount: l.cameraMount,
        exifId: l.exifId ?? null,
        productPhotos: l.productPhotos,
        productId: l.productId ?? null,
        productUrl: l.productUrl ?? null,
        imageInfo: getLensImagePathWithFallback(l.productPhotos),
        isZoomLens: l.isZoomLens,
        focalLengthTele: l.focalLengthTele,
        focalLengthWide: l.focalLengthWide ?? null,
        minimumFocusDistanceTele: l.minimumFocusDistanceTele ?? null,
        minimumFocusDistanceWide: l.minimumFocusDistanceWide ?? null,
        maximumMagnificationTele: l.maximumMagnificationTele ?? null,
        maximumMagnificationWide: l.maximumMagnificationWide ?? null,
        entrancePupilDistanceTele: l.entrancePupilDistanceTele ?? null,
        entrancePupilDistanceWide: l.entrancePupilDistanceWide ?? null,
    }))

    // Housings
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

    // Ports
    const portsData = manufacturer.ports.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        housingMount: p.housingMount,
        productPhotos: p.productPhotos,
        imageInfo: getPortImagePathWithFallback(p.productPhotos),
        productId: p.productId ?? null,
        productUrl: p.productUrl ?? null,
        isFlatPort: p.isFlatPort,
        portRadius: p.portRadius ?? null,
        portDepth: p.portDepth ?? null,
        radiusOfCurvature: p.radiusOfCurvature ?? null,
        depthRating: p.depthRating ?? null,
    }))

    // Extension Rings
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

    // Port Adapters
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

    // Gears
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
        { id: 'cameras', label: 'Cameras', count: manufacturer._count.cameras },
        { id: 'lenses', label: 'Lenses', count: manufacturer._count.lenses },
        { id: 'housings', label: 'Housings', count: manufacturer._count.housings },
        { id: 'ports', label: 'Ports', count: manufacturer._count.ports },
        { id: 'rings', label: 'Extension Rings', count: manufacturer._count.extensionRings },
        { id: 'adapters', label: 'Port Adapters', count: manufacturer._count.portAdapters },
        { id: 'gears', label: 'Gears', count: manufacturer._count.gears },
    ].filter(t => t.count > 0 || isSuperuser)

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        {' / '}
                        <Link href="/products" className="hover:text-blue-600">Products</Link>
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
                                {manufacturer.description ?? `Products from ${manufacturer.name}`}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-center justify-end">
                            {manufacturer._count.cameras > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-sky-600">{manufacturer._count.cameras}</div>
                                    <div className="text-xs text-gray-500">Camera{manufacturer._count.cameras !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                            {manufacturer._count.lenses > 0 && (
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">{manufacturer._count.lenses}</div>
                                    <div className="text-xs text-gray-500">Lens{manufacturer._count.lenses !== 1 ? 'es' : ''}</div>
                                </div>
                            )}
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
                            <nav className="flex flex-wrap gap-1 py-2">
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
                {/* Housing Mounts section (superuser only) */}
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

                {/* Cameras section */}
                {(camerasData.length > 0 || isSuperuser) && (
                    <section id="cameras">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Cameras</h2>
                        <CameraManufacturerCamerasClient
                            cameras={camerasData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            cameraMounts={cameraMounts}
                            isSuperuser={isSuperuser}
                        />
                    </section>
                )}

                {/* Lenses section */}
                {(lensesData.length > 0 || isSuperuser) && (
                    <section id="lenses">
                        <h2 className="text-2xl font-bold text-blue-900 mb-6">Lenses</h2>
                        <LensManufacturerLensesClient
                            lenses={lensesData}
                            manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                            cameraMounts={cameraMounts}
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
