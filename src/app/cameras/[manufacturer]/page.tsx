import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getCameraImagePathWithFallback } from '@/lib/images'
import CameraManufacturerCamerasClient from '@/components/CameraManufacturerCamerasClient'

interface CameraManufacturerPageProps {
    params: {
        manufacturer: string
    }
}

async function getCameraManufacturerCameras(manufacturerSlug: string) {
    try {
        const manufacturer = await prisma.manufacturer.findUnique({
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
    const [manufacturer, session, cameraMounts] = await Promise.all([
        getCameraManufacturerCameras(params.manufacturer),
        auth(),
        prisma.cameraMount.findMany({ orderBy: { name: 'asc' } }),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    if (!manufacturer) {
        notFound()
    }

    const camerasData = manufacturer.cameras.map(camera => ({
        id: camera.id,
        name: camera.name,
        slug: camera.slug,
        description: camera.description ?? null,
        housings: camera.housings,
        cameraMount: camera.cameraMount,
        interchangeableLens: camera.interchangeableLens,
        canBeUsedWithoutAHousing: camera.canBeUsedWithoutAHousing,
        exifId: camera.exifId ?? null,
        productPhotos: camera.productPhotos,
        imageInfo: getCameraImagePathWithFallback(camera.productPhotos),
        priceAmount: camera.priceAmount ? camera.priceAmount.toString() : null,
        priceCurrency: camera.priceCurrency ?? null,
        sensorWidth: camera.sensorWidth ?? null,
        sensorHeight: camera.sensorHeight ?? null,
        megapixels: camera.megapixels ?? null,
        isZoomLens: camera.isZoomLens,
        focalLengthTele: camera.focalLengthTele ?? null,
        focalLengthWide: camera.focalLengthWide ?? null,
        minimumFocusDistanceTele: camera.minimumFocusDistanceTele ?? null,
        minimumFocusDistanceWide: camera.minimumFocusDistanceWide ?? null,
        maximumMagnification: camera.maximumMagnification ?? null,
        depthRating: camera.depthRating ?? null,
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
                <CameraManufacturerCamerasClient
                    cameras={camerasData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    cameraMounts={cameraMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}