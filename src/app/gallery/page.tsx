import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import GalleryPageClient from '@/components/GalleryPageClient'
import { GalleryPhotoData } from '@/components/GalleryGrid'
import { withBase } from '@/lib/images'
import type { SuggestionPool } from '@/components/GallerySearchBar'

export const metadata = {
    title: 'Gallery | Underwater Camera Housings',
    description: 'Photos taken with various underwater camera housing configurations',
}

interface GalleryFilters {
    camera?: string
    lens?: string
    housing?: string
    port?: string
    user?: string
}

interface FilterIds {
    cameraId?: number
    lensId?: number
    housingId?: number
    portId?: number
    userId?: number
}

/** Lightweight query — only fetches slug/name data to populate the search bar autocomplete. */
async function getFilterPool(): Promise<SuggestionPool> {
    const rows = await prisma.galleryPhoto.findMany({
        select: {
            userId: true,
            user: { select: { name: true } },
            rig: {
                select: {
                    camera: { select: { slug: true, name: true, brand: { select: { name: true } } } },
                    lens: { select: { slug: true, name: true } },
                    housing: { select: { slug: true, name: true, manufacturer: { select: { name: true } } } },
                    port: { select: { slug: true, name: true } },
                },
            },
        },
    })

    const cameras = new Map<string, string>()
    const lenses = new Map<string, string>()
    const housings = new Map<string, string>()
    const ports = new Map<string, string>()
    const users = new Map<string, string>()

    for (const row of rows) {
        const rig = row.rig
        if (rig?.camera) cameras.set(rig.camera.slug, `${rig.camera.brand.name} ${rig.camera.name}`)
        if (rig?.lens) lenses.set(rig.lens.slug, rig.lens.name)
        if (rig?.housing) housings.set(rig.housing.slug, `${rig.housing.manufacturer.name} ${rig.housing.name}`)
        if (rig?.port) ports.set(rig.port.slug, rig.port.name)
        if (row.userId != null && row.user?.name) users.set(String(row.userId), row.user.name)
    }

    return {
        cameras: Array.from(cameras.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        lenses: Array.from(lenses.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        housings: Array.from(housings.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        ports: Array.from(ports.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        users: Array.from(users.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    }
}

/** Translates URL slugs to Prisma IDs so they can be used in a WHERE clause. */
async function resolveFilterIds(filters: GalleryFilters): Promise<FilterIds> {
    const [camera, lens, housing, port] = await Promise.all([
        filters.camera ? prisma.camera.findUnique({ where: { slug: filters.camera }, select: { id: true } }) : null,
        filters.lens ? prisma.lens.findUnique({ where: { slug: filters.lens }, select: { id: true } }) : null,
        filters.housing ? prisma.housing.findUnique({ where: { slug: filters.housing }, select: { id: true } }) : null,
        filters.port ? prisma.port.findUnique({ where: { slug: filters.port }, select: { id: true } }) : null,
    ])
    return {
        cameraId: camera?.id,
        lensId: lens?.id,
        housingId: housing?.id,
        portId: port?.id,
        userId: filters.user ? parseInt(filters.user) : undefined,
    }
}

async function getGalleryPhotos(currentUserId: number | undefined, filterIds: FilterIds): Promise<GalleryPhotoData[]> {
    try {
        const photos = await prisma.galleryPhoto.findMany({
            orderBy: { takenAt: 'desc' },
            where: {
                userId: filterIds.userId,
                rig: {
                    cameraId: filterIds.cameraId,
                    lensId: filterIds.lensId,
                    housingId: filterIds.housingId,
                    portId: filterIds.portId,
                },
            },
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

export default async function GalleryPage({
    searchParams,
}: {
    searchParams: Promise<{ camera?: string; lens?: string; housing?: string; port?: string; user?: string }>
}) {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const filters = await searchParams

    // Pool and filter resolution run in parallel — photos wait on filter IDs only.
    const [filterIds, pool] = await Promise.all([
        resolveFilterIds(filters),
        getFilterPool(),
    ])

    const photos = await getGalleryPhotos(currentUserId, filterIds)

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-7xl mx-auto px-4 py-6">

                <Suspense>
                    <GalleryPageClient photos={photos} pool={pool} />
                </Suspense>
            </div>
        </main>
    )
}
