import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { HousingImage } from '@/components/HousingImage'
import { getLensImagePathWithFallback, withBase } from '@/lib/images'

interface LensDetailPageProps {
    params: {
        manufacturer: string
        lens: string
    }
}

async function getLensDetail(manufacturerSlug: string, lensSlug: string) {
    try {
        return await prisma.lens.findFirst({
            where: {
                slug: lensSlug,
                manufacturer: { slug: manufacturerSlug },
            },
            include: {
                manufacturer: true,
                cameraMount: true,
                ports: {
                    include: { manufacturer: true },
                    orderBy: { name: 'asc' },
                },
            },
        })
    } catch (error) {
        console.error('Error fetching lens detail:', error)
        return null
    }
}

export async function generateMetadata({ params }: LensDetailPageProps) {
    const lens = await getLensDetail(params.manufacturer, params.lens)
    if (!lens) return {}
    return {
        title: `${lens.name} | Underwater Camera Housings`,
        description: lens.description ?? `Details and compatible ports for the ${lens.name}.`,
    }
}

export default async function LensDetailPage({ params }: LensDetailPageProps) {
    const [lens, galleryPhotos] = await Promise.all([
        getLensDetail(params.manufacturer, params.lens),
        prisma.galleryPhoto.findMany({
            where: {
                rig: { lens: { slug: params.lens } },
            },
            orderBy: { takenAt: 'desc' },
            take: 12,
        }),
    ])

    if (!lens) notFound()

    const imageInfo = getLensImagePathWithFallback(lens.productPhotos)
    const price = lens.priceAmount ? Number(lens.priceAmount) : null

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <span>→</span>
                        <Link href="/lenses" className="hover:text-blue-600 transition-colors">Lenses</Link>
                        <span>→</span>
                        <Link href={`/lenses/${params.manufacturer}`} className="hover:text-blue-600 transition-colors">
                            {lens.manufacturer?.name}
                        </Link>
                        <span>→</span>
                        <span className="text-gray-900 font-medium">{lens.name}</span>
                    </nav>

                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-blue-900 mb-2">{lens.name}</h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                {lens.manufacturer && (
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {lens.manufacturer.name}
                                    </span>
                                )}
                                {lens.cameraMount && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {lens.cameraMount.name} mount
                                    </span>
                                )}
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${lens.isZoomLens
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                    {lens.isZoomLens ? 'Zoom' : 'Prime'}
                                </span>
                            </div>
                        </div>
                        {price !== null && (
                            <div className="text-right shrink-0">
                                <div className="text-3xl font-bold text-green-600">${price.toLocaleString()}</div>
                                <div className="text-sm text-gray-500">{lens.priceCurrency ?? 'USD'}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Image + specs two-column */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Image */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="relative aspect-square bg-gray-50 p-6">
                            <HousingImage
                                src={imageInfo.src}
                                fallback={imageInfo.fallback}
                                alt={lens.name}
                                className="object-contain"
                            />
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
                        <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>

                        {/* Optics */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Optics</p>
                            <dl className="space-y-2.5 text-sm">
                                <div className="flex justify-between gap-4">
                                    <dt className="text-gray-500">Focal length</dt>
                                    <dd className="font-medium text-gray-900 text-right">
                                        {lens.isZoomLens && lens.focalLengthWide != null
                                            ? `${lens.focalLengthWide}–${lens.focalLengthTele} mm`
                                            : `${lens.focalLengthTele} mm`}
                                    </dd>
                                </div>
                                {lens.maximumMagnification != null && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Max magnification</dt>
                                        <dd className="font-medium text-gray-900 text-right">
                                            {lens.maximumMagnification.toFixed(2)}×
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Focus */}
                        {(lens.minimumFocusDistanceWide != null || lens.minimumFocusDistanceTele != null) && (
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Focus</p>
                                <dl className="space-y-2.5 text-sm">
                                    {lens.isZoomLens ? (
                                        <>
                                            {lens.minimumFocusDistanceWide != null && (
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-gray-500">Min. focus — wide</dt>
                                                    <dd className="font-medium text-gray-900 text-right">{lens.minimumFocusDistanceWide} m</dd>
                                                </div>
                                            )}
                                            {lens.minimumFocusDistanceTele != null && (
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-gray-500">Min. focus — tele</dt>
                                                    <dd className="font-medium text-gray-900 text-right">{lens.minimumFocusDistanceTele} m</dd>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500">Min. focus distance</dt>
                                            <dd className="font-medium text-gray-900 text-right">
                                                {(lens.minimumFocusDistanceWide ?? lens.minimumFocusDistanceTele)} m
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
                                {lens.cameraMount && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Mount</dt>
                                        <dd className="font-medium text-gray-900 text-right">{lens.cameraMount.name}</dd>
                                    </div>
                                )}
                                {lens.exifId && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">EXIF lens ID</dt>
                                        <dd className="font-medium text-gray-900 text-right font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{lens.exifId}</dd>
                                    </div>
                                )}
                                {price !== null && (
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Price</dt>
                                        <dd className="font-semibold text-green-600 text-right">
                                            ${price.toLocaleString()} <span className="text-xs font-normal text-gray-400">{lens.priceCurrency ?? 'USD'}</span>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
                            <Link
                                href={`/?lens=${encodeURIComponent(lens.name)}`}
                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                            >
                                Build a rig with this lens
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                href={`/lenses/${params.manufacturer}`}
                                className="flex items-center justify-center w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                            >
                                All {lens.manufacturer?.name} lenses
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {lens.description && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">About this lens</h2>
                        <p className="text-gray-700 leading-relaxed text-sm">{lens.description}</p>
                    </div>
                )}

                {/* Compatible ports */}
                {lens.ports.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Compatible Ports
                            <span className="ml-2 text-sm font-normal text-gray-400">({lens.ports.length})</span>
                        </h2>
                        <div className="divide-y divide-gray-100">
                            {lens.ports.map(port => (
                                <div key={port.id} className="py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{port.name}</p>
                                        {port.manufacturer && (
                                            <p className="text-xs text-gray-400">{port.manufacturer.name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {port.priceAmount && (
                                            <span className="text-sm font-medium text-gray-700">
                                                ${Number(port.priceAmount).toLocaleString()}
                                            </span>
                                        )}
                                        {port.depthRating && (
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                {port.depthRating} m
                                            </span>
                                        )}
                                        <Link
                                            href={`/ports/${port.manufacturer?.slug ?? ''}`}
                                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                                        >
                                            View →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gallery */}
                {galleryPhotos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Photos taken with this lens</h2>
                            <Link
                                href={`/gallery?lens=${lens.slug}`}
                                className="text-sm text-blue-500 hover:text-blue-700 transition-colors"
                            >
                                View all →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {galleryPhotos.map(photo => (
                                <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <Image
                                        src={withBase(photo.imagePath)}
                                        alt={photo.title ?? photo.description ?? 'Gallery photo'}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {(photo.title || photo.location) && (
                                        <div className="absolute inset-x-0 bottom-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 py-1.5">
                                            {photo.title && <p className="text-white text-xs font-medium truncate">{photo.title}</p>}
                                            {photo.location && <p className="text-gray-300 text-xs">📍 {photo.location}</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
