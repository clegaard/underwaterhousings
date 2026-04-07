import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import CameraManufacturersClient from '@/components/CameraManufacturersClient'

export const metadata: Metadata = {
    title: 'Cameras - UW Housings',
    description: 'Browse cameras by manufacturer and find compatible underwater housings',
}

async function getCameraManufacturers() {
    try {
        const manufacturers = await prisma.manufacturer.findMany({
            include: {
                cameras: {
                    include: {
                        housings: true,
                        cameraMount: true,
                    },
                    orderBy: { name: 'asc' },
                },
                _count: {
                    select: { cameras: true }
                }
            },
            orderBy: { name: 'asc' }
        })
        return manufacturers
    } catch (error) {
        console.error('Error fetching camera manufacturers:', error)
        return []
    }
}

async function getCameraMounts() {
    try {
        return await prisma.cameraMount.findMany({ orderBy: { name: 'asc' } })
    } catch {
        return []
    }
}

export default async function CamerasPage() {
    const [manufacturers, cameraMounts, session] = await Promise.all([
        getCameraManufacturers(),
        getCameraMounts(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser
    const totalCameras = manufacturers.reduce((s, m) => s + m._count.cameras, 0)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Cameras</h1>
                            <p className="text-xl text-gray-700">
                                Browse cameras by manufacturer and find compatible underwater housings
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{totalCameras}</div>
                            <div className="text-sm text-gray-600">Camera{totalCameras !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <CameraManufacturersClient
                    manufacturers={manufacturers.map(m => ({
                        ...m,
                        cameras: m.cameras.map(c => ({
                            ...c,
                            priceAmount: c.priceAmount ? Number(c.priceAmount) : null,
                        }))
                    }))}
                    cameraMounts={cameraMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}