import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import GalleryPageClient from '@/components/GalleryPageClient'
import { GalleryPhotoData } from '@/components/GalleryGrid'
import { withBase } from '@/lib/images'

export const metadata = {
    title: 'Gallery | Underwater Camera Housings',
    description: 'Photos taken with various underwater camera housing configurations',
}

async function getGalleryPhotos(currentUserId?: number): Promise<GalleryPhotoData[]> {
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
                _count: { select: { likes: true, comments: true } },
                ...(currentUserId
                    ? { likes: { where: { userId: currentUserId }, select: { userId: true } } }
                    : {}),
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
                caption: photo.caption ?? undefined,
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
                shutterSpeed: photo.shutterSpeed ? Number(photo.shutterSpeed) : undefined,
                aperture: photo.aperture ?? undefined,
                iso: photo.iso ?? undefined,
                photoId: photo.id,
                userName: photo.user?.name ?? undefined,
                userId: photo.user?.id ?? undefined,
                userProfilePicture: photo.user?.profilePicture ? withBase(photo.user.profilePicture) : undefined,
                likeCount: photo._count.likes,
                commentCount: photo._count.comments,
                likedByMe: currentUserId
                    ? (photo as { likes?: { userId: number }[] }).likes?.some(l => l.userId === currentUserId) ?? false
                    : false,
                rigId: rig?.id ?? undefined,
                allowFullResDownload: photo.user?.allowFullResDownload ?? true,
            }
        })
    } catch (error) {
        console.error('Error fetching gallery photos:', error)
        return []
    }
}

export default async function GalleryPage() {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const photos = await getGalleryPhotos(currentUserId)

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto px-4 py-6">

                <Suspense>
                    <GalleryPageClient photos={photos} />
                </Suspense>
            </div>
        </main>
    )
}
