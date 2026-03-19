import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getHousingImagePathWithFallback, getCameraImagePathWithFallback, getLensImagePathWithFallback, getPortImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'

interface CombinationPageProps {
    params: {
        camera: string
        lens: string
        housing: string
        port?: string[]
    }
}

async function getCombinationData(camera: string, lens: string, housing: string, portId?: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const url = new URL(`${baseUrl}/api/combinations`)
    url.searchParams.set('camera', camera)
    url.searchParams.set('lens', lens)
    url.searchParams.set('housing', housing)
    if (portId) {
        url.searchParams.set('port', portId)
    }

    const res = await fetch(url.toString(), { cache: 'no-store' })

    if (!res.ok) {
        return null
    }

    const data = await res.json()
    return data.success ? data.combination : null
}

export default async function CombinationPage({ params }: CombinationPageProps) {
    const { camera, lens, housing, port } = params
    const portId = port?.[0]

    const combination = await getCombinationData(camera, lens, housing, portId)

    if (!combination) {
        notFound()
    }

    const housingImageInfo = getHousingImagePathWithFallback(
        combination.housing.manufacturerSlug,
        combination.housing.slug
    )
    const cameraImageInfo = getCameraImagePathWithFallback(
        combination.camera.brandSlug,
        combination.camera.slug
    )
    const lensImageInfo = getLensImagePathWithFallback(combination.lens.slug)
    const portImageInfo = combination.port
        ? getPortImagePathWithFallback(
            combination.port.name,
            combination.housing.manufacturerSlug
        )
        : { src: '/ports/fallback.png', fallback: '/ports/fallback.png' }

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
                    Back to combinations
                </Link>

                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Complete Underwater Setup</h1>
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                            ✓ Verified Compatible
                        </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Images Grid */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-2">
                                {/* Camera Image */}
                                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={cameraImageInfo.src}
                                        fallback={cameraImageInfo.fallback}
                                        alt={`${combination.camera.brand} ${combination.camera.name}`}
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                        <span className="text-white text-xs font-medium">📷 Camera</span>
                                    </div>
                                </div>

                                {/* Lens Image */}
                                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={lensImageInfo.src}
                                        fallback={lensImageInfo.fallback}
                                        alt={combination.lens.name}
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                        <span className="text-white text-xs font-medium">🔍 Lens</span>
                                    </div>
                                </div>

                                {/* Housing Image */}
                                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={housingImageInfo.src}
                                        fallback={housingImageInfo.fallback}
                                        alt={combination.housing.name}
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                        <span className="text-white text-xs font-medium">🏠 Housing</span>
                                    </div>
                                </div>

                                {/* Port Image */}
                                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <HousingImage
                                        src={portImageInfo.src}
                                        fallback={portImageInfo.fallback}
                                        alt={combination.port?.name || 'Port'}
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                        <span className="text-white text-xs font-medium">🔌 Port</span>
                                    </div>
                                </div>
                            </div>

                            {/* Larger housing image */}
                            <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                                <HousingImage
                                    src={housingImageInfo.src}
                                    fallback={housingImageInfo.fallback}
                                    alt={combination.housing.name}
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* Components Details */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipment Setup</h2>

                                <div className="space-y-4">
                                    {/* Camera */}
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">📷 Camera Body</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {combination.camera.brand} {combination.camera.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Mount: {combination.camera.mount}
                                        </div>
                                    </div>

                                    {/* Lens */}
                                    <div className="border-l-4 border-green-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">🔍 Lens</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {combination.lens.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Mount: {combination.lens.mount}
                                        </div>
                                    </div>

                                    {/* Housing */}
                                    <div className="border-l-4 border-purple-500 pl-4">
                                        <div className="text-sm text-gray-600 mb-1">🏠 Underwater Housing</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {combination.housing.manufacturer} {combination.housing.name}
                                        </div>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <span className="text-gray-600">
                                                Depth: <span className="font-medium text-green-700">{combination.housing.depthRating}m</span>
                                            </span>
                                            {combination.housing.material && (
                                                <span className="text-gray-600">
                                                    Material: <span className="font-medium">{combination.housing.material}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Port */}
                                    {combination.port && (
                                        <div className="border-l-4 border-orange-500 pl-4">
                                            <div className="text-sm text-gray-600 mb-1">🔌 Port</div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {combination.port.name}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Housing:</span>
                                        <span className="font-medium">
                                            ${combination.pricing.housing.toLocaleString()} {combination.pricing.currency}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                                        <span className="text-gray-900">Total Setup:</span>
                                        <span className="text-green-600">
                                            ${combination.pricing.total.toLocaleString()} {combination.pricing.currency}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    * Housing price only. Camera and lens prices not included.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {combination.housing.description && (
                        <div className="mt-8 border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Setup</h3>
                            <p className="text-gray-700 leading-relaxed">
                                {combination.housing.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Sample Gallery Section */}
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Sample Photos with This Setup</h2>

                    {combination.gallery && combination.gallery.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {combination.gallery.map((photo: any) => (
                                <div key={photo.id} className="group relative">
                                    <div className="relative h-64 bg-gray-200 rounded-lg overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center text-gray-500">
                                                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <p className="text-sm">Sample Photo Placeholder</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-700 font-medium">{photo.caption}</p>
                                        {photo.photographer && (
                                            <p className="text-xs text-gray-500 mt-1">By {photo.photographer}</p>
                                        )}
                                        {photo.location && (
                                            <p className="text-xs text-gray-500">📍 {photo.location}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>No sample photos available yet for this combination.</p>
                            <p className="text-sm mt-2">Be the first to contribute photos!</p>
                        </div>
                    )}
                </div>

                {/* Compatibility Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">✓ Compatibility Verified</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-blue-800">Camera Mount:</span>
                            <span className="ml-2 text-gray-700">{combination.compatibility.cameraMount}</span>
                        </div>
                        <div>
                            <span className="font-medium text-blue-800">Housing Mount:</span>
                            <span className="ml-2 text-gray-700">{combination.compatibility.housingMount}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                        This combination has been verified for compatibility. All components work together seamlessly.
                    </p>
                </div>
            </div>
        </div>
    )
}
