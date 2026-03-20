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

interface RigPageProps {
    params: { id: string }
}

async function getRig(id: number) {
    return prisma.cameraRig.findUnique({
        where: { id },
        include: {
            camera: { include: { brand: true, cameraMount: true } },
            lens: { include: { cameraMount: true } },
            housing: { include: { manufacturer: true, housingMount: true } },
            port: true,
            galleryPhotos: { orderBy: { takenAt: 'desc' } },
        },
    })
}

export default async function RigPage({ params }: RigPageProps) {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) notFound()

    const rig = await getRig(id)
    if (!rig) notFound()

    const cameraImageInfo = getCameraImagePathWithFallback(rig.camera.productPhotos ?? [])
    const housingImageInfo = rig.housing
        ? getHousingImagePathWithFallback(rig.housing.productPhotos ?? [])
        : null
    const lensImageInfo = rig.lens
        ? getLensImagePathWithFallback(rig.lens.productPhotos ?? [])
        : null
    const portImageInfo = rig.port
        ? getPortImagePathWithFallback(rig.port.productPhotos ?? [])
        : null

    const housingPrice = rig.housing?.priceAmount ? Number(rig.housing.priceAmount) : null
    const currency = rig.housing?.priceCurrency ?? 'USD'

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
                    Back
                </Link>

                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{rig.name}</h1>
                        <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                            Camera Rig
                        </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Images */}
                        <div className="space-y-4">
                            {/* Thumbnail strip */}
                            <div className="flex gap-2">
                                {/* Camera */}
                                <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={cameraImageInfo.src}
                                        fallback={cameraImageInfo.fallback}
                                        alt={`${rig.camera.brand.name} ${rig.camera.name}`}
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                        <span className="text-white text-xs font-medium">📷 Camera</span>
                                    </div>
                                </div>

                                {/* Lens */}
                                {lensImageInfo && (
                                    <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <HousingImage
                                            src={lensImageInfo.src}
                                            fallback={lensImageInfo.fallback}
                                            alt={rig.lens!.name}
                                            className="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                            <span className="text-white text-xs font-medium">🔍 Lens</span>
                                        </div>
                                    </div>
                                )}

                                {/* Housing */}
                                {housingImageInfo && (
                                    <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <HousingImage
                                            src={housingImageInfo.src}
                                            fallback={housingImageInfo.fallback}
                                            alt={rig.housing!.name}
                                            className="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                            <span className="text-white text-xs font-medium">🏠 Housing</span>
                                        </div>
                                    </div>
                                )}

                                {/* Port */}
                                {portImageInfo && (
                                    <div className="relative flex-1 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <HousingImage
                                            src={portImageInfo.src}
                                            fallback={portImageInfo.fallback}
                                            alt={rig.port!.name}
                                            className="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                            <span className="text-white text-xs font-medium">🔌 Port</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Larger housing image */}
                            {housingImageInfo && (
                                <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={housingImageInfo.src}
                                        fallback={housingImageInfo.fallback}
                                        alt={rig.housing!.name}
                                        className="object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Equipment details */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipment</h2>
                                <div className="space-y-4">
                                    {/* Camera */}
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">📷 Camera Body</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {rig.camera.brand.name} {rig.camera.name}
                                        </div>
                                        {rig.camera.cameraMount && (
                                            <div className="text-sm text-gray-500">
                                                Mount: {rig.camera.cameraMount.name}
                                            </div>
                                        )}
                                        {!rig.camera.interchangeableLens && (
                                            <div className="text-xs text-amber-600 mt-1">Fixed lens — no interchangeable lens</div>
                                        )}
                                    </div>

                                    {/* Lens */}
                                    {rig.lens ? (
                                        <div className="border-l-4 border-green-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🔍 Lens</div>
                                            <div className="text-lg font-semibold text-gray-900">{rig.lens.name}</div>
                                            {rig.lens.cameraMount && (
                                                <div className="text-sm text-gray-500">
                                                    Mount: {rig.lens.cameraMount.name}
                                                </div>
                                            )}
                                        </div>
                                    ) : !rig.camera.interchangeableLens ? null : (
                                        <div className="border-l-4 border-green-200 pl-4">
                                            <div className="text-sm text-gray-400 mb-1">🔍 Lens</div>
                                            <div className="text-sm text-gray-400 italic">No lens specified</div>
                                        </div>
                                    )}

                                    {/* Housing */}
                                    {rig.housing ? (
                                        <div className="border-l-4 border-purple-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🏠 Underwater Housing</div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {rig.housing.manufacturer.name} {rig.housing.name}
                                            </div>
                                            <div className="flex gap-4 mt-2 text-sm">
                                                <span className="text-gray-600">
                                                    Depth: <span className="font-medium text-green-700">{rig.housing.depthRating}m</span>
                                                </span>
                                                {rig.housing.material && (
                                                    <span className="text-gray-600">
                                                        Material: <span className="font-medium">{rig.housing.material}</span>
                                                    </span>
                                                )}
                                            </div>
                                            {!rig.housing.interchangeablePort && (
                                                <div className="text-xs text-amber-600 mt-1">Fixed port — no interchangeable port</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="border-l-4 border-purple-200 pl-4">
                                            <div className="text-sm text-gray-400 mb-1">🏠 Housing</div>
                                            <div className="text-sm text-gray-400 italic">No housing specified</div>
                                        </div>
                                    )}

                                    {/* Port */}
                                    {rig.port ? (
                                        <div className="border-l-4 border-orange-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🔌 Port</div>
                                            <div className="text-lg font-semibold text-gray-900">{rig.port.name}</div>
                                        </div>
                                    ) : rig.housing && !rig.housing.interchangeablePort ? null : rig.housing ? (
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

                            {/* Housing description */}
                            {rig.housing?.description && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Setup</h3>
                                    <p className="text-gray-700 leading-relaxed text-sm">{rig.housing.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Gallery */}
                {rig.galleryPhotos.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Photos taken with this rig</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {rig.galleryPhotos.map((photo) => (
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
                            <Link href={`/gallery?camera=${rig.camera.slug}`} className="text-sm text-blue-600 hover:text-blue-800">
                                View all photos in gallery →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
