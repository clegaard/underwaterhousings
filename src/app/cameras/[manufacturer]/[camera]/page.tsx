import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { HousingImage } from '@/components/HousingImage'
import { getCameraImagePathWithFallback } from '@/lib/images'

interface CameraDetailPageProps {
    params: {
        manufacturer: string
        camera: string
    }
}

async function getCameraDetail(manufacturerSlug: string, cameraSlug: string) {
    try {
        const camera = await prisma.camera.findFirst({
            where: {
                AND: [
                    { slug: cameraSlug },
                    { brand: { slug: manufacturerSlug } }
                ]
            },
            include: {
                brand: true,
                cameraMount: true,
                housings: {
                    include: {
                        manufacturer: true
                    }
                },
                lens: {
                    include: {
                        manufacturer: true
                    }
                }
            }
        })

        return camera
    } catch (error) {
        console.error('Error fetching camera detail:', error)
        return null
    }
}

export default async function CameraDetailPage({ params }: CameraDetailPageProps) {
    const camera = await getCameraDetail(params.manufacturer, params.camera)

    if (!camera) {
        notFound()
    }

    const imageInfo = getCameraImagePathWithFallback(camera.productPhotos)
    const price = camera.priceAmount ? Number(camera.priceAmount) : null
    const cropFactor =
        camera.sensorWidth && camera.sensorHeight
            ? parseFloat((43.27 / Math.sqrt(camera.sensorWidth ** 2 + camera.sensorHeight ** 2)).toFixed(2))
            : null

    const galleryPhotos = await prisma.galleryPhoto.findMany({
        where: { cameraId: camera.id },
        orderBy: { takenAt: 'desc' },
        take: 12,
    })

    const hasSensorData = camera.sensorWidth || camera.sensorHeight || camera.megapixels != null
    const hasFixedLensOptics = !camera.interchangeableLens && camera.focalLengthTele != null
    const hasFixedLensFocus =
        !camera.interchangeableLens &&
        (camera.minimumFocusDistanceWide != null || camera.minimumFocusDistanceTele != null)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                        <Link href="/cameras" className="hover:text-blue-600 transition-colors">
                            Cameras
                        </Link>
                        <span>→</span>
                        <Link
                            href={`/cameras/${params.manufacturer}`}
                            className="hover:text-blue-600 transition-colors"
                        >
                            {camera.brand.name}
                        </Link>
                        <span>→</span>
                        <span className="text-gray-900 font-medium">{camera.name}</span>
                    </nav>

                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-900 mb-2">{camera.name}</h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {camera.brand.name}
                                </span>
                                {camera.cameraMount && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {camera.cameraMount.name} mount
                                    </span>
                                )}
                                {!camera.interchangeableLens && (
                                    <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {camera.isZoomLens ? 'Fixed Zoom' : 'Fixed Prime'}
                                    </span>
                                )}
                                {camera.canBeUsedWithoutAHousing && (
                                    <span className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {camera.depthRating ? `Waterproof to ${camera.depthRating} m` : 'Waterproof'}
                                    </span>
                                )}
                            </div>
                        </div>
                        {price !== null && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-2xl font-bold text-green-600">${price.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">{camera.priceCurrency ?? 'USD'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* Image + Specs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Image */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="relative w-full h-80 bg-gray-50">
                            <HousingImage
                                src={imageInfo.src}
                                fallback={imageInfo.fallback}
                                alt={camera.name}
                                className="object-contain p-8"
                            />
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
                        <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>

                        {/* Sensor */}
                        {hasSensorData && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Sensor</p>
                                <dl className="space-y-2.5 text-sm">
                                    {camera.sensorWidth && camera.sensorHeight && (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Dimensions</dt>
                                            <dd className="font-medium text-gray-900 text-right">
                                                {camera.sensorWidth} × {camera.sensorHeight} mm
                                            </dd>
                                        </div>
                                    )}
                                    {cropFactor !== null && (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Crop factor</dt>
                                            <dd className="font-medium text-gray-900 text-right">{cropFactor}×</dd>
                                        </div>
                                    )}
                                    {camera.megapixels != null && (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Megapixels</dt>
                                            <dd className="font-medium text-gray-900 text-right">{camera.megapixels} MP</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {/* Fixed-lens optics */}
                        {hasFixedLensOptics && (
                            <div className={hasSensorData ? 'border-t border-gray-100 pt-4' : ''}>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Optics</p>
                                <dl className="space-y-2.5 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Focal length</dt>
                                        <dd className="font-medium text-gray-900 text-right">
                                            {camera.isZoomLens && camera.focalLengthWide != null
                                                ? `${camera.focalLengthWide}–${camera.focalLengthTele} mm`
                                                : `${camera.focalLengthTele} mm`}
                                        </dd>
                                    </div>
                                    {camera.maximumMagnification != null && (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Max magnification</dt>
                                            <dd className="font-medium text-gray-900 text-right">
                                                {camera.maximumMagnification.toFixed(2)}×
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {/* Fixed-lens focus */}
                        {hasFixedLensFocus && (
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Focus</p>
                                <dl className="space-y-2.5 text-sm">
                                    {camera.isZoomLens ? (
                                        <>
                                            {camera.minimumFocusDistanceWide != null && (
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-gray-500">Min. focus — wide</dt>
                                                    <dd className="font-medium text-gray-900 text-right">{camera.minimumFocusDistanceWide} m</dd>
                                                </div>
                                            )}
                                            {camera.minimumFocusDistanceTele != null && (
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-gray-500">Min. focus — tele</dt>
                                                    <dd className="font-medium text-gray-900 text-right">{camera.minimumFocusDistanceTele} m</dd>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Min. focus distance</dt>
                                            <dd className="font-medium text-gray-900 text-right">
                                                {(camera.minimumFocusDistanceWide ?? camera.minimumFocusDistanceTele)} m
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {/* Technical */}
                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Technical</p>
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Lens system</dt>
                                    <dd className="font-medium text-gray-900 text-right">
                                        {camera.interchangeableLens ? 'Interchangeable' : 'Fixed'}
                                    </dd>
                                </div>
                                {camera.cameraMount && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Mount</dt>
                                        <dd className="font-medium text-gray-900 text-right">{camera.cameraMount.name}</dd>
                                    </div>
                                )}
                                {camera.canBeUsedWithoutAHousing && camera.depthRating != null && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Depth rating</dt>
                                        <dd className="font-medium text-gray-900 text-right">{camera.depthRating} m</dd>
                                    </div>
                                )}
                                {camera.exifId && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">EXIF camera ID</dt>
                                        <dd className="font-medium text-gray-900 text-right font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{camera.exifId}</dd>
                                    </div>
                                )}
                                {price !== null && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Price</dt>
                                        <dd className="font-semibold text-green-600 text-right">
                                            ${price.toLocaleString()}{' '}
                                            <span className="text-xs font-normal text-gray-400">{camera.priceCurrency ?? 'USD'}</span>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
                            <Link
                                href={`/cameras/${params.manufacturer}`}
                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                            >
                                All {camera.brand.name} cameras
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                href={`/gallery?camera=${camera.slug}`}
                                className="flex items-center justify-center w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                            >
                                View gallery photos
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {camera.description && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                        <p className="text-gray-600 leading-relaxed">{camera.description}</p>
                    </div>
                )}

                {/* Compatible Housings */}
                {camera.housings.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Compatible Housings
                            <span className="ml-2 text-sm font-normal text-gray-400">({camera.housings.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {camera.housings.map((housing) => (
                                <Link
                                    key={housing.id}
                                    href={`/housings/${housing.manufacturer.slug}/${housing.slug}`}
                                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700">{housing.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{housing.manufacturer.name}</p>
                                        <p className="text-xs text-cyan-600 mt-0.5">Rated to {housing.depthRating} m</p>
                                    </div>
                                    {housing.priceAmount && (
                                        <span className="text-sm font-semibold text-green-600 ml-4 flex-shrink-0">
                                            ${Number(housing.priceAmount).toLocaleString()}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compatible Lenses */}
                {camera.lens.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Compatible Lenses
                            <span className="ml-2 text-sm font-normal text-gray-400">({camera.lens.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {camera.lens.map((lens) => (
                                <Link
                                    key={lens.id}
                                    href={`/lenses/${lens.manufacturer.slug}/${lens.slug}`}
                                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700">{lens.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{lens.manufacturer.name}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                                        {lens.isZoomLens && lens.focalLengthWide != null
                                            ? `${lens.focalLengthWide}–${lens.focalLengthTele} mm`
                                            : `${lens.focalLengthTele} mm`}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gallery */}
                {galleryPhotos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos taken with this camera</h2>
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
                )}
            </div>
        </div>
    )
}
