import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { HousingImage } from '@/components/HousingImage'
import PriceTag from '@/components/PriceTag'
import {
    getHousingImagePathWithFallback,
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

interface CameraSystemBuilderPageProps {
    searchParams: {
        camera?: string
        housing?: string
        lens?: string
        port?: string
    }
}

async function getCameraSystemComponents(cameraSlug: string, housingSlug: string, lensSlug?: string, portSlug?: string) {
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
            cameraSystem: {
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



async function getCameraOnly(cameraSlug: string) {
    const camera = await prisma.camera.findUnique({
        where: { slug: cameraSlug },
        include: { brand: true, cameraMount: true },
    })
    return camera ?? null
}



export default async function CameraSystemBuilderPage({ searchParams }: CameraSystemBuilderPageProps) {
    const { camera: cameraSlug, housing: housingSlug, lens: lensSlug, port: portSlug } = searchParams

    if (!cameraSlug) notFound()

    // Camera-only path (no housing)
    if (!housingSlug) {
        const [camera, session] = await Promise.all([getCameraOnly(cameraSlug), auth()])
        if (!camera || !camera.canBeUsedWithoutAHousing) notFound()

        const userId = (session?.user as { id?: string } | undefined)?.id ?? null
        const cameraImageInfo = getCameraImagePathWithFallback(camera.productPhotos ?? [])
        const title = `${camera.brand.name} ${camera.name} — No Housing`

        return (
            <>
                <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
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
                                        <span className="font-medium"><PriceTag amount={camera.priceAmount ? Number(camera.priceAmount) : null} currency={camera.priceCurrency} /></span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-4">
                                This camera is rated waterproof and can be used without a housing. Adding a compatible housing can increase the maximum depth rating.
                            </p>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    const [components, session] = await Promise.all([
        getCameraSystemComponents(cameraSlug, housingSlug, lensSlug, portSlug),
        auth(),
    ])
    if (!components) notFound()

    const { camera, housing, lens, port, galleryPhotos } = components


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
            <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
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
        </>
    )
}
