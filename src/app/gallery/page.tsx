import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import GalleryPageClient from '@/components/GalleryPageClient'
import { GalleryPhotoData } from '@/components/GalleryGrid'
import { withBase } from '@/lib/images'

export const metadata = {
    title: 'Gallery | Underwater Camera Housings',
    description: 'Photos taken with various underwater camera housing configurations',
}

export interface InitialFilterOptions {
    camera?: { slug: string; name: string }
    housing?: { slug: string; name: string }
    lens?: { slug: string; name: string }
    port?: { slug: string; name: string }
}

async function getGalleryPhotos(): Promise<GalleryPhotoData[]> {
    try {
        const photos = await prisma.galleryPhoto.findMany({
            orderBy: { takenAt: 'desc' },
            include: {
                rig: {
                    include: {
                        camera: { include: { brand: true } },
                        lens: true,
                        housing: { include: { manufacturer: true } },
                        port: true,
                    },
                },
                user: true,
            },
        })

        return photos.map((photo) => {
            const rig = photo.rig
            const parts = [
                rig?.camera ? `${rig.camera.brand.name} ${rig.camera.name}` : null,
                rig?.lens?.name ?? null,
                rig?.housing ? `${rig.housing.manufacturer.name} ${rig.housing.name}` : null,
                rig?.port?.name ?? null,
            ].filter(Boolean)

            return {
                src: withBase(photo.imagePath),
                width: photo.width,
                height: photo.height,
                title: photo.title ?? undefined,
                description: photo.description ?? undefined,
                location: photo.location ?? undefined,
                takenAt: photo.takenAt?.toISOString() ?? undefined,
                rigLabel: parts.length > 0 ? parts.join(' · ') : undefined,
                cameraName: rig?.camera
                    ? `${rig.camera.brand.name} ${rig.camera.name}`
                    : undefined,
                cameraSlug: rig?.camera?.slug ?? undefined,
                lensName: rig?.lens?.name ?? undefined,
                lensSlug: rig?.lens?.slug ?? undefined,
                housingName: rig?.housing
                    ? `${rig.housing.manufacturer.name} ${rig.housing.name}`
                    : undefined,
                housingSlug: rig?.housing?.slug ?? undefined,
                portName: rig?.port?.name ?? undefined,
                portSlug: rig?.port?.slug ?? undefined,
                focalLength: photo.focalLength ?? undefined,
                shutterSpeed: photo.shutterSpeed ?? undefined,
                aperture: photo.aperture ?? undefined,
                photoId: photo.id,
                userName: photo.user?.name ?? undefined,
                userId: photo.user?.id ?? undefined,
                userProfilePicture: photo.user?.profilePicture ? withBase(photo.user.profilePicture) : undefined,
            }
        })
    } catch (error) {
        console.error('Error fetching gallery photos:', error)
        return []
    }
}

export default async function GalleryPage({
    searchParams,
}: {
    searchParams?: { camera?: string; housing?: string; lens?: string; port?: string }
}) {
    const [photos, initialFilters] = await Promise.all([
        getGalleryPhotos(),
        (async (): Promise<InitialFilterOptions> => {
            const { camera: cameraSlug, housing: housingSlug, lens: lensSlug, port: portSlug } = searchParams ?? {}
            const [camera, housing, lens, port] = await Promise.all([
                cameraSlug
                    ? prisma.camera.findUnique({ where: { slug: cameraSlug }, include: { brand: true } })
                    : null,
                housingSlug
                    ? prisma.housing.findUnique({ where: { slug: housingSlug }, include: { manufacturer: true } })
                    : null,
                lensSlug
                    ? prisma.lens.findUnique({ where: { slug: lensSlug } })
                    : null,
                portSlug
                    ? prisma.port.findUnique({ where: { slug: portSlug } })
                    : null,
            ])
            return {
                camera: camera ? { slug: camera.slug, name: `${camera.brand.name} ${camera.name}` } : undefined,
                housing: housing ? { slug: housing.slug, name: `${housing.manufacturer.name} ${housing.name}` } : undefined,
                lens: lens ? { slug: lens.slug, name: lens.name } : undefined,
                port: port ? { slug: port.slug, name: port.name } : undefined,
            }
        })(),
    ])

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
                    <GalleryPageClient photos={photos} initialFilters={initialFilters} />
                </Suspense>
            </div>
        </main>
    )
}
