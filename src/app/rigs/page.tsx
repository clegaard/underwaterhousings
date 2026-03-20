import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { HousingImage } from '@/components/HousingImage'
import {
    getHousingImagePathWithFallback,
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

interface RigBuilderPageProps {
    searchParams: {
        camera?: string
        housing?: string
        lens?: string
        port?: string
    }
}

async function getRigComponents(cameraSlug: string, housingSlug: string, lensSlug?: string, portSlug?: string) {
    const [camera, housing] = await Promise.all([
        prisma.camera.findUnique({
            where: { slug: cameraSlug },
            include: { brand: true, cameraMount: true },
        }),
        prisma.housing.findUnique({
            where: { slug: housingSlug },
            include: {
                manufacturer: true,
                housingMount: true,
            },
        }),
    ])

    if (!camera || !housing) return null

    const [lens, port] = await Promise.all([
        lensSlug
            ? prisma.lens.findUnique({ where: { slug: lensSlug }, include: { cameraMount: true } })
            : Promise.resolve(null),
        portSlug
            ? prisma.port.findUnique({ where: { slug: portSlug } })
            : Promise.resolve(null),
    ])

    // Fetch gallery photos that belong to these components
    const galleryPhotos = await prisma.galleryPhoto.findMany({
        where: {
            cameraId: camera.id,
            housingId: housing.id,
            lensId: lens?.id ?? null,
            portId: port?.id ?? null,
        },
        orderBy: { takenAt: 'desc' },
    })

    return { camera, housing, lens, port, galleryPhotos }
}

export default async function RigBuilderPage({ searchParams }: RigBuilderPageProps) {
    const { camera: cameraSlug, housing: housingSlug, lens: lensSlug, port: portSlug } = searchParams

    if (!cameraSlug || !housingSlug) notFound()

    const components = await getRigComponents(cameraSlug, housingSlug, lensSlug, portSlug)
    if (!components) notFound()

    const { camera, housing, lens, port, galleryPhotos } = components

    const cameraImageInfo = getCameraImagePathWithFallback(camera.productPhotos ?? [])
    const housingImageInfo = getHousingImagePathWithFallback(housing.productPhotos ?? [])
    const lensImageInfo = lens ? getLensImagePathWithFallback(lens.productPhotos ?? []) : null
    const portImageInfo = port ? getPortImagePathWithFallback(port.productPhotos ?? []) : null

    const housingPrice = housing.priceAmount ? Number(housing.priceAmount) : null
    const currency = housing.priceCurrency ?? 'USD'

    const title = [
        `${camera.brand.name} ${camera.name}`,
        lens?.name,
        `${housing.manufacturer.name} ${housing.name}`,
        port?.name,
    ]
        .filter(Boolean)
        .join(' + ')

    return (
        <>
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                            <span>→</span>
                            <span className="text-gray-900 font-medium">Rig Details</span>
                        </nav>
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Complete Underwater Setup</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {camera.brand.name} {camera.name}
                                </span>
                                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {housing.manufacturer.name} {housing.name}
                                </span>
                                {lens && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {lens.name}
                                    </span>
                                )}
                                {port && (
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {port.name}
                                    </span>
                                )}
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ✓ Compatible
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Images card */}
                            <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4">
                                {/* Thumbnail strip */}
                                <div className="flex gap-2 mb-4">
                                    <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <HousingImage
                                            src={cameraImageInfo.src}
                                            fallback={cameraImageInfo.fallback}
                                            alt={`${camera.brand.name} ${camera.name}`}
                                            className="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                            <span className="text-white text-xs font-medium">📷 Camera</span>
                                        </div>
                                    </div>
                                    {lensImageInfo && (
                                        <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                            <HousingImage
                                                src={lensImageInfo.src}
                                                fallback={lensImageInfo.fallback}
                                                alt={lens!.name}
                                                className="object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                                <span className="text-white text-xs font-medium">🔍 Lens</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <HousingImage
                                            src={housingImageInfo.src}
                                            fallback={housingImageInfo.fallback}
                                            alt={housing.name}
                                            className="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                            <span className="text-white text-xs font-medium">🏠 Housing</span>
                                        </div>
                                    </div>
                                    {portImageInfo && (
                                        <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                            <HousingImage
                                                src={portImageInfo.src}
                                                fallback={portImageInfo.fallback}
                                                alt={port!.name}
                                                className="object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                                <span className="text-white text-xs font-medium">🔌 Port</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Larger housing image */}
                                <div className="relative h-72 bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={housingImageInfo.src}
                                        fallback={housingImageInfo.fallback}
                                        alt={housing.name}
                                        className="object-cover"
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            {housingPrice !== null && (
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Housing:</span>
                                            <span className="font-medium">${housingPrice.toLocaleString()} {currency}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">
                                        * Housing price only. Camera and lens prices not included.
                                    </p>
                                </div>
                            )}

                            {/* Description */}
                            {housing.description && (
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Housing</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">{housing.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Actions */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                    <Link
                                        href="/"
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                                    >
                                        ← Back to Builder
                                    </Link>
                                    <Link
                                        href={`/cameras/${camera.brand.slug}/${camera.slug}`}
                                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block"
                                    >
                                        View Camera Details
                                    </Link>
                                    <Link
                                        href={`/housings/${housing.manufacturer.slug}/${housing.slug}`}
                                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block"
                                    >
                                        View Housing Details
                                    </Link>
                                </div>
                            </div>

                            {/* Equipment Setup */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Equipment Setup</h3>
                                <div className="space-y-4">
                                    <div className="border-l-4 border-blue-500 pl-3">
                                        <div className="text-xs text-gray-500 mb-0.5">📷 Camera</div>
                                        <div className="font-medium text-gray-900 text-sm">{camera.brand.name} {camera.name}</div>
                                        {camera.cameraMount && <div className="text-xs text-gray-500">Mount: {camera.cameraMount.name}</div>}
                                        {!camera.interchangeableLens && <div className="text-xs text-amber-600 mt-0.5">Fixed lens</div>}
                                    </div>
                                    {lens ? (
                                        <div className="border-l-4 border-green-500 pl-3">
                                            <div className="text-xs text-gray-500 mb-0.5">🔍 Lens</div>
                                            <div className="font-medium text-gray-900 text-sm">{lens.name}</div>
                                            {lens.cameraMount && <div className="text-xs text-gray-500">Mount: {lens.cameraMount.name}</div>}
                                        </div>
                                    ) : camera.interchangeableLens ? (
                                        <div className="border-l-4 border-green-200 pl-3">
                                            <div className="text-xs text-gray-400 mb-0.5">🔍 Lens</div>
                                            <div className="text-xs text-gray-400 italic">No lens specified</div>
                                        </div>
                                    ) : null}
                                    <div className="border-l-4 border-purple-500 pl-3">
                                        <div className="text-xs text-gray-500 mb-0.5">🏠 Housing</div>
                                        <div className="font-medium text-gray-900 text-sm">{housing.manufacturer.name} {housing.name}</div>
                                        <div className="text-xs text-gray-500">
                                            Depth: {housing.depthRating}m{housing.material ? ` · ${housing.material}` : ''}
                                        </div>
                                        {!housing.interchangeablePort && <div className="text-xs text-amber-600 mt-0.5">Fixed port</div>}
                                    </div>
                                    {port ? (
                                        <div className="border-l-4 border-orange-500 pl-3">
                                            <div className="text-xs text-gray-500 mb-0.5">🔌 Port</div>
                                            <div className="font-medium text-gray-900 text-sm">{port.name}</div>
                                        </div>
                                    ) : housing.interchangeablePort ? (
                                        <div className="border-l-4 border-orange-200 pl-3">
                                            <div className="text-xs text-gray-400 mb-0.5">🔌 Port</div>
                                            <div className="text-xs text-gray-400 italic">No port specified</div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Compatibility */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-blue-900 mb-2">✓ Compatibility</h3>
                                <div className="space-y-1 text-sm">
                                    {camera.cameraMount && (
                                        <div>
                                            <span className="font-medium text-blue-800">Camera Mount:</span>
                                            <span className="ml-2 text-gray-700">{camera.cameraMount.name}</span>
                                        </div>
                                    )}
                                    {housing.housingMount && (
                                        <div>
                                            <span className="font-medium text-blue-800">Port Mount:</span>
                                            <span className="ml-2 text-gray-700">{housing.housingMount.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            {galleryPhotos.length > 0 && (
                <div className="max-w-4xl mx-auto px-4 pb-8">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Photos taken with this setup</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {galleryPhotos.map((photo) => (
                                <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <Image
                                        src={photo.imagePath}
                                        alt={photo.title ?? photo.description ?? 'Gallery photo'}
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {(photo.title || photo.location) && (
                                        <div className="absolute inset-x-0 bottom-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 py-1.5">
                                            {photo.title && (
                                                <p className="text-white text-xs font-medium truncate">{photo.title}</p>
                                            )}
                                            {photo.location && (
                                                <p className="text-gray-300 text-xs">📍 {photo.location}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-right">
                            <Link href={`/gallery?camera=${camera.slug}`} className="text-sm text-blue-600 hover:text-blue-800">
                                View all photos in gallery →
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
