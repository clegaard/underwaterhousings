import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GalleryPhotoData } from '@/components/GalleryGrid'
import GalleryGrid from '@/components/GalleryGrid'
import { withBase } from '@/lib/images'
import { Suspense } from 'react'
import { auth } from '@/auth'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import CameraRigsSection from '@/components/CameraRigsSection'

interface UserProfilePageProps {
    params: Promise<{ userId: string }>
}

async function getUserWithPhotos(userId: number) {
    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            galleryPhotos: {
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
                },
            },
        },
    })
}

export async function generateMetadata({ params }: UserProfilePageProps) {
    const { userId } = await params
    const id = parseInt(userId, 10)
    if (isNaN(id)) return {}
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true } })
    return {
        title: user?.name ? `${user.name} | Underwater Camera Housings` : 'User Profile',
    }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
    const { userId } = await params
    const id = parseInt(userId, 10)
    if (isNaN(id)) notFound()

    const [user, session] = await Promise.all([
        getUserWithPhotos(id),
        auth(),
    ])
    if (!user) notFound()

    const isOwnProfile = session?.user?.id === String(id)

    const photos: GalleryPhotoData[] = user.galleryPhotos.map((photo) => {
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
            cameraName: rig?.camera ? `${rig.camera.brand.name} ${rig.camera.name}` : undefined,
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
            userName: user.name ?? undefined,
            userId: user.id,
            userProfilePicture: user.profilePicture ? withBase(user.profilePicture) : undefined,
        }
    })

    const displayName = user.name ?? user.email

    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Profile header */}
                <div className="flex items-center gap-5 mb-8">
                    <ProfilePictureUpload
                        userId={user.id}
                        isOwnProfile={isOwnProfile}
                        currentPicture={user.profilePicture}
                        displayName={displayName}
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900">{displayName}</h1>
                        {user.bio && (
                            <p className="text-gray-600 mt-1 max-w-xl">{user.bio}</p>
                        )}
                        <p className="text-gray-400 text-sm mt-1">
                            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                        </p>
                    </div>
                </div>

                {/* Camera Rigs */}
                <CameraRigsSection userId={user.id} isOwnProfile={isOwnProfile} />

                {/* Divider */}
                <hr className="my-10 border-blue-200" />

                {/* Gallery */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Photos</h2>
                    <Suspense>
                        <GalleryGrid photos={photos} />
                    </Suspense>
                </div>
            </div>
        </main>
    )
}
