import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCameraImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'

interface CameraManufacturerPageProps {
    params: {
        manufacturer: string
    }
}

async function getCameraManufacturerCameras(manufacturerSlug: string) {
    try {
        const manufacturer = await prisma.cameraManufacturer.findUnique({
            where: {
                slug: manufacturerSlug
            },
            include: {
                cameras: {
                    include: {
                        housings: {
                            include: {
                                manufacturer: true
                            }
                        },
                        cameraMount: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                }
            }
        })

        return manufacturer
    } catch (error) {
        console.error('Error fetching camera manufacturer cameras:', error)
        return null
    }
}

export default async function CameraManufacturerPage({ params }: CameraManufacturerPageProps) {
    const manufacturer = await getCameraManufacturerCameras(params.manufacturer)

    if (!manufacturer) {
        notFound()
    }

    const camerasData = manufacturer.cameras.map(camera => ({
        ...camera,
        imageInfo: getCameraImagePathWithFallback(camera.productPhotos)
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{manufacturer.name} Cameras</h1>
                            <p className="text-xl text-gray-700">
                                Camera models from {manufacturer.name} with available underwater housings
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{camerasData.length}</div>
                            <div className="text-sm text-gray-600">Camera{camerasData.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        All {manufacturer.name} Camera Models
                    </h2>
                    <Link
                        href="/cameras"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to Cameras
                    </Link>
                </div>

                {camerasData.length > 0 ? (
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl">
                            {camerasData.map((camera) => (
                                <Link
                                    key={camera.id}
                                    href={`/cameras/${params.manufacturer}/${camera.slug}`}
                                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group overflow-hidden"
                                >
                                    {/* Camera Image */}
                                    <div className="relative w-full h-48 bg-gray-100">
                                        <HousingImage
                                            src={camera.imageInfo.src}
                                            fallback={camera.imageInfo.fallback}
                                            alt={camera.name}
                                            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>

                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                {camera.name}
                                            </h3>
                                            {camera.cameraMount && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0 ml-2">
                                                    {camera.cameraMount.slug.toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1 text-sm mb-4">
                                            {camera.cameraMount && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Mount:</span>
                                                    <span className="font-medium">{camera.cameraMount.name}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Housings:</span>
                                                <span className="font-medium text-green-700">{camera.housings.length} available</span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                <span>View details</span>
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <div className="text-6xl mb-4">📷</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras found</h3>
                        <p className="text-gray-600 mb-4">
                            No camera models are currently available for {manufacturer.name}.
                        </p>
                        <Link
                            href="/cameras"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse all manufacturers
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}