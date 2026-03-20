import { notFound } from 'next/navigation'
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

    const lens = lensSlug
        ? await prisma.lens.findUnique({ where: { slug: lensSlug }, include: { cameraMount: true } })
        : null

    const port = portSlug
        ? await prisma.port.findUnique({ where: { slug: portSlug } })
        : null

    return { camera, housing, lens, port }
}

export default async function RigBuilderPage({ searchParams }: RigBuilderPageProps) {
    const { camera: cameraSlug, housing: housingSlug, lens: lensSlug, port: portSlug } = searchParams

    if (!cameraSlug || !housingSlug) notFound()

    const components = await getRigComponents(cameraSlug, housingSlug, lensSlug, portSlug)
    if (!components) notFound()

    const { camera, housing, lens, port } = components

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
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <Link
                    href="/"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to builder
                </Link>

                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Complete Underwater Setup</h1>
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                            ✓ Compatible
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">{title}</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Images */}
                        <div className="space-y-4">
                            {/* Thumbnail strip */}
                            <div className="flex gap-2">
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
                            <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                                <HousingImage
                                    src={housingImageInfo.src}
                                    fallback={housingImageInfo.fallback}
                                    alt={housing.name}
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* Equipment details */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipment Setup</h2>
                                <div className="space-y-4">
                                    {/* Camera */}
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">📷 Camera Body</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {camera.brand.name} {camera.name}
                                        </div>
                                        {camera.cameraMount && (
                                            <div className="text-sm text-gray-500">Mount: {camera.cameraMount.name}</div>
                                        )}
                                        {!camera.interchangeableLens && (
                                            <div className="text-xs text-amber-600 mt-1">Fixed lens camera</div>
                                        )}
                                    </div>

                                    {/* Lens */}
                                    {lens ? (
                                        <div className="border-l-4 border-green-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🔍 Lens</div>
                                            <div className="text-lg font-semibold text-gray-900">{lens.name}</div>
                                            {lens.cameraMount && (
                                                <div className="text-sm text-gray-500">Mount: {lens.cameraMount.name}</div>
                                            )}
                                        </div>
                                    ) : camera.interchangeableLens ? (
                                        <div className="border-l-4 border-green-200 pl-4">
                                            <div className="text-sm text-gray-400 mb-1">🔍 Lens</div>
                                            <div className="text-sm text-gray-400 italic">No lens specified</div>
                                        </div>
                                    ) : null}

                                    {/* Housing */}
                                    <div className="border-l-4 border-purple-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">🏠 Underwater Housing</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {housing.manufacturer.name} {housing.name}
                                        </div>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <span className="text-gray-600">
                                                Depth: <span className="font-medium text-green-700">{housing.depthRating}m</span>
                                            </span>
                                            {housing.material && (
                                                <span className="text-gray-600">
                                                    Material: <span className="font-medium">{housing.material}</span>
                                                </span>
                                            )}
                                        </div>
                                        {!housing.interchangeablePort && (
                                            <div className="text-xs text-amber-600 mt-1">Fixed port housing</div>
                                        )}
                                    </div>

                                    {/* Port */}
                                    {port ? (
                                        <div className="border-l-4 border-orange-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🔌 Port</div>
                                            <div className="text-lg font-semibold text-gray-900">{port.name}</div>
                                        </div>
                                    ) : housing.interchangeablePort ? (
                                        <div className="border-l-4 border-orange-200 pl-4">
                                            <div className="text-sm text-gray-400 mb-1">🔌 Port</div>
                                            <div className="text-sm text-gray-400 italic">No port specified</div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Pricing */}
                            {housingPrice !== null && (
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Housing:</span>
                                            <span className="font-medium">
                                                ${housingPrice.toLocaleString()} {currency}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">
                                        * Housing price only. Camera and lens prices not included.
                                    </p>
                                </div>
                            )}

                            {/* Compatibility info */}
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

                            {housing.description && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Housing</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">{housing.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
