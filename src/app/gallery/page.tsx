import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import GalleryPageClient from '@/components/GalleryPageClient'
import { GalleryPhotoData } from '@/components/GalleryGrid'

export const metadata = {
    title: 'Gallery | Underwater Camera Housings',
    description: 'Photos taken with various underwater camera housing configurations',
}

async function getGalleryPhotos(): Promise<GalleryPhotoData[]> {
    try {
        const photos = await prisma.galleryPhoto.findMany({
            orderBy: { takenAt: 'desc' },
            include: {
                camera: { include: { brand: true } },
                lens: true,
                housing: { include: { manufacturer: true } },
                port: true,
            },
        })

        return photos.map((photo) => ({
            src: photo.imagePath,
            width: photo.width,
            height: photo.height,
            title: photo.title ?? undefined,
            description: photo.description ?? undefined,
            location: photo.location ?? undefined,
            takenAt: photo.takenAt?.toISOString() ?? undefined,
            cameraName: photo.camera
                ? `${photo.camera.brand.name} ${photo.camera.name}`
                : undefined,
            cameraSlug: photo.camera?.slug ?? undefined,
            lensName: photo.lens?.name ?? undefined,
            lensSlug: photo.lens?.slug ?? undefined,
            housingName: photo.housing
                ? `${photo.housing.manufacturer.name} ${photo.housing.name}`
                : undefined,
            housingSlug: photo.housing?.slug ?? undefined,
            portName: photo.port?.name ?? undefined,
            focalLength: photo.focalLength ?? undefined,
            shutterSpeed: photo.shutterSpeed ?? undefined,
            aperture: photo.aperture ?? undefined,
        }))
    } catch (error) {
        console.error('Error fetching gallery photos:', error)
        return []
    }
}

export default async function GalleryPage() {
    const photos = await getGalleryPhotos()

    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">Gallery</h1>
                    <p className="text-gray-600 text-sm">
                        Photos taken with different combinations of camera bodies, lenses, housings, and ports.
                    </p>
                </div>
                <Suspense>
                    <GalleryPageClient photos={photos} />
                </Suspense>
            </div>
        </main>
    )
}
