import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import CameraManufacturersClient from '@/components/CameraManufacturersClient'

export const metadata: Metadata = {
    title: 'Camera Manufacturers - UW Housings',
    description: 'Browse cameras by manufacturer and find compatible underwater housings',
}

async function getCameraManufacturers() {
    try {
        const manufacturers = await prisma.manufacturer.findMany({
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
    const [manufacturers, session] = await Promise.all([
        getCameraManufacturers(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser
    const camerasCount = manufacturers.filter(m => m._count.cameras > 0).length

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
                            <div className="text-3xl font-bold text-blue-600">{camerasCount}</div>
                            <div className="text-sm text-gray-600">Manufacturer{camerasCount !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <CameraManufacturersClient manufacturers={manufacturers} isSuperuser={isSuperuser} />
            </div>
        </div>
    )
}