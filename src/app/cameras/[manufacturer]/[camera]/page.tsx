import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
                lens: true
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

    const imageInfo = getCameraImagePathWithFallback(params.manufacturer, params.camera)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
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

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{camera.name}</h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {camera.brand.name}
                                </span>
                                {camera.cameraMount && (
                                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {camera.cameraMount.name} mount
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{camera.housings.length}</div>
                            <div className="text-sm text-gray-600">Housing{camera.housings.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Camera Image */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="relative w-full h-72 bg-gray-100">
                                <HousingImage
                                    src={imageInfo.src}
                                    fallback={imageInfo.fallback}
                                    alt={camera.name}
                                    className="object-contain p-6"
                                />
                            </div>
                        </div>

                        {/* Specifications */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Specifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Manufacturer</h4>
                                        <p className="text-gray-700">{camera.brand.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Model</h4>
                                        <p className="text-gray-700">{camera.name}</p>
                                    </div>
                                    {camera.cameraMount && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Lens Mount</h4>
                                            <p className="text-gray-700">{camera.cameraMount.name}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Available Housings</h4>
                                        <p className="text-gray-700">{camera.housings.length}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Compatible Lenses</h4>
                                        <p className="text-gray-700">{camera.lens.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href="/cameras"
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                                >
                                    ← Back to Cameras
                                </Link>
                                <Link
                                    href={`/cameras/${params.manufacturer}`}
                                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block"
                                >
                                    All {camera.brand.name} Cameras
                                </Link>
                                <Link
                                    href={`/gallery?camera=${params.camera}`}
                                    className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-center block"
                                >
                                    📷 View Photos
                                </Link>
                            </div>
                        </div>

                        {/* Compatible Housings */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Compatible Housings</h3>
                            {camera.housings.length > 0 ? (
                                <div className="space-y-2">
                                    {camera.housings.map((housing) => (
                                        <Link
                                            key={housing.id}
                                            href={`/housings/${housing.manufacturer.slug}/${housing.slug}`}
                                            className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="font-medium text-gray-900 text-sm">{housing.name}</div>
                                            <div className="text-xs text-gray-500">{housing.manufacturer.name}</div>
                                            {housing.priceAmount && (
                                                <div className="text-xs font-medium text-green-600 mt-1">
                                                    ${Number(housing.priceAmount).toLocaleString()}
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No housings available yet.</p>
                            )}
                        </div>

                        {/* Compatible Lenses */}
                        {camera.lens.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Compatible Lenses</h3>
                                <div className="space-y-2">
                                    {camera.lens.map((lens) => (
                                        <div key={lens.id} className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                                            <span className="text-sm text-gray-700">{lens.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
