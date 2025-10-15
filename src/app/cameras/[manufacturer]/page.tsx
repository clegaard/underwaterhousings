import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface CameraManufacturerPageProps {
    params: {
        manufacturer: string
    }
}

async function getCameraManufacturerCameras(manufacturerSlug: string) {
    try {
        const manufacturer = await prisma.cameraManufacturer.findUnique({
            where: {
                slug: manufacturerSlug,
                isActive: true
            },
            include: {
                cameras: {
                    include: {
                        housings: {
                            include: {
                                manufacturer: true
                            }
                        }
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
                            <div className="text-3xl font-bold text-blue-600">{manufacturer.cameras.length}</div>
                            <div className="text-sm text-gray-600">Camera{manufacturer.cameras.length !== 1 ? 's' : ''}</div>
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
                        href="/"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to Search
                    </Link>
                </div>

                {manufacturer.cameras.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {manufacturer.cameras.map((camera) => {
                            return (
                                <div
                                    key={camera.id}
                                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-lg font-semibold text-blue-900">
                                                {camera.name}
                                            </h3>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {manufacturer.name}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-800 mb-2">Available Housings:</h4>
                                            {camera.housings.length > 0 ? (
                                                <div className="space-y-2">
                                                    {camera.housings.map((housing) => (
                                                        <Link
                                                            key={housing.id}
                                                            href={`/housings/${housing.manufacturer.slug}/${housing.slug}`}
                                                            className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{housing.model}</div>
                                                                    <div className="text-sm text-gray-600">{housing.manufacturer.name}</div>
                                                                </div>
                                                                {housing.priceAmount && (
                                                                    <div className="text-sm font-medium text-green-600">
                                                                        ${Number(housing.priceAmount).toLocaleString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                                    No housings available for this camera model yet.
                                                </div>
                                            )}
                                        </div>

                                        {camera.housings.length > 0 && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <div className="text-xs text-gray-500">
                                                    {camera.housings.length} housing{camera.housings.length !== 1 ? 's' : ''} available
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <div className="text-6xl mb-4">📷</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras found</h3>
                        <p className="text-gray-600">
                            No camera models are currently available for {manufacturer.name}.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}