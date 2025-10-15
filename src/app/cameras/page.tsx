import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Camera Manufacturers - UW Housings',
    description: 'Browse cameras by manufacturer and find compatible underwater housings',
}

async function getCameraManufacturers() {
    try {
        const manufacturers = await prisma.cameraManufacturer.findMany({
            include: {
                cameras: {
                    include: {
                        housings: true
                    }
                },
                _count: {
                    select: {
                        cameras: true
                    }
                }
            },
            where: {
                isActive: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return manufacturers
    } catch (error) {
        console.error('Error fetching camera manufacturers:', error)
        return []
    }
}

export default async function CamerasPage() {
    const manufacturers = await getCameraManufacturers()

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Camera Manufacturers</h1>
                            <p className="text-xl text-gray-700">
                                Browse cameras by manufacturer and find compatible underwater housings
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{manufacturers.length}</div>
                            <div className="text-sm text-gray-600">Manufacturer{manufacturers.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        All Camera Manufacturers
                    </h2>
                    <Link
                        href="/"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to Search
                    </Link>
                </div>

                {manufacturers.length > 0 ? (
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl">
                            {manufacturers.map((manufacturer) => {
                                const totalHousings = manufacturer.cameras.reduce((acc, camera) => acc + camera.housings.length, 0)

                                return (
                                    <Link
                                        key={manufacturer.id}
                                        href={`/cameras/${manufacturer.slug}`}
                                        className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group"
                                    >
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                    {manufacturer.name}
                                                </h3>
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    Cameras
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Camera Models:</span>
                                                    <span className="font-medium text-blue-800">{manufacturer._count.cameras}</span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Available Housings:</span>
                                                    <span className="font-medium text-green-700">{totalHousings}</span>
                                                </div>
                                            </div>

                                            {/* Click indicator */}
                                            <div className="mt-4 pt-3 border-t border-gray-100">
                                                <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                    <span>View cameras</span>
                                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm max-w-md">
                            <div className="text-6xl mb-4">📷</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No camera manufacturers found</h3>
                            <p className="text-gray-600">
                                No camera manufacturers are currently available.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}