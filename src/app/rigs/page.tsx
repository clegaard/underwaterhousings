import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { HousingImage } from '@/components/HousingImage'
import RigReviewsSection, { type RigReviewData } from '@/components/RigReviewsSection'
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
            rig: {
                cameraId: camera.id,
                housingId: housing.id,
                lensId: lens?.id ?? null,
                portId: port?.id ?? null,
            },
        },
        orderBy: { takenAt: 'desc' },
    })

    return { camera, housing, lens, port, galleryPhotos }
}

async function getRigReviews(
    cameraId: number,
    housingId: number,
    lensId: number | null,
    portId: number | null,
): Promise<RigReviewData[]> {
    const reviews = await prisma.rigReview.findMany({
        where: { cameraId, housingId, lensId, portId },
        include: { user: { select: { id: true, name: true, profilePicture: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return reviews.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
    }))
}

async function getCameraOnly(cameraSlug: string) {
    const camera = await prisma.camera.findUnique({
        where: { slug: cameraSlug },
        include: { brand: true, cameraMount: true },
    })
    return camera ?? null
}

async function getCameraOnlyReviews(cameraId: number): Promise<RigReviewData[]> {
    const reviews = await prisma.rigReview.findMany({
        where: { cameraId, housingId: null, lensId: null, portId: null },
        include: { user: { select: { id: true, name: true, profilePicture: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export default async function RigBuilderPage({ searchParams }: RigBuilderPageProps) {
    const { camera: cameraSlug, housing: housingSlug, lens: lensSlug, port: portSlug } = searchParams

    if (!cameraSlug) notFound()

    // Camera-only path (no housing)
    if (!housingSlug) {
        const [camera, session] = await Promise.all([getCameraOnly(cameraSlug), auth()])
        if (!camera || !camera.canBeUsedWithoutAHousing) notFound()

        const reviews = await getCameraOnlyReviews(camera.id)
        const userId = (session?.user as { id?: string } | undefined)?.id ?? null
        const cameraImageInfo = getCameraImagePathWithFallback(camera.productPhotos ?? [])
        const title = `${camera.brand.name} ${camera.name} — No Housing`

        return (
            <>
                <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
                    <div className="bg-white shadow-sm border-b">
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                                <span>→</span>
                                <span className="text-gray-900 font-medium">Rig Details</span>
                            </nav>
                            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                        {/* Image */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1 max-w-xs aspect-square bg-gray-100 rounded-lg overflow-hidden">
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
                            </div>
                        </div>

                        {/* Camera specs */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                            <div className="space-y-2 text-sm">
                                {camera.depthRating && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Depth rating (without housing)</span>
                                        <span className="font-medium">{camera.depthRating} m</span>
                                    </div>
                                )}
                                {camera.priceAmount && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Camera price</span>
                                        <span className="font-medium">${Number(camera.priceAmount).toLocaleString()} {camera.priceCurrency ?? 'USD'}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-4">
                                This camera is rated waterproof and can be used without a housing. Adding a compatible housing can increase the maximum depth rating.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 pb-8">
                    <RigReviewsSection
                        reviews={reviews}
                        cameraId={camera.id}
                        housingId={0}
                        lensId={null}
                        portId={null}
                        userId={userId}
                    />
                </div>
            </>
        )
    }

    const [components, session] = await Promise.all([
        getRigComponents(cameraSlug, housingSlug, lensSlug, portSlug),
        auth(),
    ])
    if (!components) notFound()

    const { camera, housing, lens, port, galleryPhotos } = components

    const reviews = await getRigReviews(
        camera.id, housing.id, lens?.id ?? null, port?.id ?? null
    )

    const userId = (session?.user as { id?: string } | undefined)?.id ?? null

    const cameraImageInfo = getCameraImagePathWithFallback(camera.productPhotos ?? [])
    const housingImageInfo = getHousingImagePathWithFallback(housing.productPhotos ?? [])
    const lensImageInfo = lens ? getLensImagePathWithFallback(lens.productPhotos ?? []) : null
    const portImageInfo = port ? getPortImagePathWithFallback(port.productPhotos ?? []) : null

    const housingPrice = housing.priceAmount ? Number(housing.priceAmount) : null
    const currency = housing.priceCurrency ?? 'USD'

    const galleryParams = new URLSearchParams({ camera: camera.slug, housing: housing.slug })
    if (lens) galleryParams.set('lens', lens.slug)
    if (port) galleryParams.set('port', port.slug)
    const galleryUrl = `/gallery?${galleryParams.toString()}`

    const title = [
        `${camera.brand.name} ${camera.name}`,
        lens?.name,
        `${housing.manufacturer.name} ${housing.name}`,
        port?.name,
    ]
        .filter(Boolean)
        .join(' · ')

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
                        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="space-y-6">
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
                </div>
            </div>

            {/* Reviews */}
            <div className="max-w-4xl mx-auto px-4 pb-8">
                <RigReviewsSection
                    reviews={reviews}
                    cameraId={camera.id}
                    housingId={housing.id}
                    lensId={lens?.id ?? null}
                    portId={port?.id ?? null}
                    userId={userId}
                />
            </div>

            {/* Gallery */}
            <div className="max-w-4xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Photos taken with this setup</h2>
                        {galleryPhotos.length > 0 && (
                            <Link href={galleryUrl} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                View all →
                            </Link>
                        )}
                    </div>
                    {galleryPhotos.length > 0 ? (
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
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 font-medium mb-1">No photos yet</p>
                            <p className="text-gray-400 text-sm mb-4">Be the first to share a photo taken with this setup</p>
                            <Link
                                href={galleryUrl}
                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Upload a photo
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
