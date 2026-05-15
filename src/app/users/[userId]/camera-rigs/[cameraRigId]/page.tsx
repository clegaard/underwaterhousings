import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import {
    getCameraImagePathWithFallback,
    getHousingImagePathWithFallback,
    getLensImagePathWithFallback,
    getPortImagePathWithFallback,
    withBase,
} from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'
import GalleryGrid, { GalleryPhotoData } from '@/components/GalleryGrid'

interface PageProps {
    params: Promise<{ userId: string; cameraRigId: string }>
}

export async function generateMetadata({ params }: PageProps) {
    const { userId, cameraRigId } = await params
    const uid = parseInt(userId, 10)
    const rigId = parseInt(cameraRigId, 10)
    if (isNaN(uid) || isNaN(rigId)) return {}
    const rig = await prisma.cameraRig.findUnique({
        where: { id: rigId },
        select: { name: true, userId: true, user: { select: { name: true } } },
    })
    if (!rig || rig.userId !== uid) return {}
    return {
        title: `${rig.name} · ${rig.user.name ?? 'User'} | Underwater Camera Housings`,
    }
}

export default async function CameraRigDetailPage({ params }: PageProps) {
    const { userId, cameraRigId } = await params
    const uid = parseInt(userId, 10)
    const rigId = parseInt(cameraRigId, 10)
    if (isNaN(uid) || isNaN(rigId)) notFound()

    const rig = await prisma.cameraRig.findUnique({
        where: { id: rigId },
        include: {
            camera: { include: { brand: true } },
            lens: { include: { manufacturer: true } },
            housing: { include: { manufacturer: true } },
            port: { include: { manufacturer: true } },
            portAdapter: {
                include: {
                    manufacturer: true,
                    inputHousingMount: true,
                    outputHousingMount: true,
                },
            },
            extensionRings: {
                include: { manufacturer: true, housingMount: true },
                orderBy: { lengthMm: 'asc' },
            },
            user: { select: { id: true, name: true, profilePicture: true } },
            galleryPhotos: {
                orderBy: { takenAt: 'desc' },
                take: 48,
                include: { user: { select: { id: true, name: true, profilePicture: true } } },
            },
        },
    })

    // The rig must exist and belong to the user in the URL
    if (!rig || rig.userId !== uid) notFound()

    // ── Image helpers ─────────────────────────────────────────────────────────
    const cameraImg = getCameraImagePathWithFallback(rig.camera.productPhotos ?? [])
    const lensImg = rig.lens ? getLensImagePathWithFallback(rig.lens.productPhotos ?? []) : null
    const housingImg = rig.housing ? getHousingImagePathWithFallback(rig.housing.productPhotos ?? []) : null
    const portImg = rig.port ? getPortImagePathWithFallback(rig.port.productPhotos ?? []) : null

    // ── Map gallery photos to GalleryPhotoData ────────────────────────────────
    const photos: GalleryPhotoData[] = rig.galleryPhotos.map(photo => ({
        src: withBase(photo.imagePath),
        width: photo.width,
        height: photo.height,
        title: photo.title ?? undefined,
        description: photo.description ?? undefined,
        location: photo.location ?? undefined,
        takenAt: photo.takenAt?.toISOString() ?? undefined,
        rigLabel: rig.name,
        cameraSlug: rig.camera.slug,
        housingSlug: rig.housing?.slug ?? undefined,
        lensSlug: rig.lens?.slug ?? undefined,
        portSlug: rig.port?.slug ?? undefined,
        focalLength: photo.focalLength ?? undefined,
        shutterSpeed: photo.shutterSpeed ? Number(photo.shutterSpeed) : undefined,
        aperture: photo.aperture ?? undefined,
        iso: photo.iso ?? undefined,
        photoId: photo.id,
        userName: photo.user?.name ?? undefined,
        userId: photo.user?.id ?? undefined,
        userProfilePicture: photo.user?.profilePicture ? withBase(photo.user.profilePicture) : undefined,
        rigId: rig.id,
    }))

    const userName = rig.user.name ?? 'User'

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
                    <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <span>›</span>
                    <Link href={`/users/${uid}`} className="hover:text-blue-600 transition-colors">{userName}</Link>
                    <span>›</span>
                    <span className="text-gray-900 font-medium">{rig.name}</span>
                </nav>

                {/* Header card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {rig.imagePath && (
                        <div className="relative w-full h-48 bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`/api/media${rig.imagePath}`}
                                alt={`${rig.name} assembled`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="px-6 py-5 flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">{rig.name}</h1>
                            <Link
                                href={`/users/${uid}`}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {userName}&apos;s profile
                            </Link>
                        </div>
                        <Link
                            href={`/rigs?${new URLSearchParams({
                                camera: rig.camera.slug,
                                ...(rig.housing ? { housing: rig.housing.slug } : {}),
                                ...(rig.lens ? { lens: rig.lens.slug } : {}),
                                ...(rig.port ? { port: rig.port.slug } : {}),
                            }).toString()}`}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            View rig specs →
                        </Link>
                    </div>
                </div>

                {/* Components */}
                <section>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Components</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

                        <ComponentCard
                            label="Camera"
                            name={`${rig.camera.brand.name} ${rig.camera.name}`}
                            img={cameraImg}
                            href={`/cameras/${rig.camera.brand.slug}`}
                        />

                        {rig.lens && lensImg && (
                            <ComponentCard
                                label="Lens"
                                name={rig.lens.name}
                                img={lensImg}
                            />
                        )}

                        {rig.housing && housingImg && (
                            <ComponentCard
                                label="Housing"
                                name={`${rig.housing.manufacturer.name} ${rig.housing.name}`}
                                img={housingImg}
                                href={`/gear/${rig.housing.manufacturer.slug}/housings/${rig.housing.slug}`}
                            />
                        )}

                        {rig.port && portImg && (
                            <ComponentCard
                                label="Port"
                                name={rig.port.name}
                                img={portImg}
                            />
                        )}

                        {rig.portAdapter && (
                            <ComponentCard
                                label="Port Adapter"
                                name={rig.portAdapter.name}
                                img={{ src: '/ports/fallback.png', fallback: '/ports/fallback.png' }}
                                detail={
                                    rig.portAdapter.inputHousingMount && rig.portAdapter.outputHousingMount
                                        ? `${rig.portAdapter.inputHousingMount.name} → ${rig.portAdapter.outputHousingMount.name}`
                                        : undefined
                                }
                            />
                        )}

                        {rig.extensionRings.map(ring => (
                            <ComponentCard
                                key={ring.id}
                                label="Extension Ring"
                                name={ring.name}
                                img={{
                                    src: ring.productPhotos[0] ? withBase(ring.productPhotos[0]) : '/ports/fallback.png',
                                    fallback: '/ports/fallback.png',
                                }}
                                detail={ring.lengthMm ? `${ring.lengthMm} mm` : undefined}
                            />
                        ))}
                    </div>
                </section>

                {/* Gallery */}
                {photos.length > 0 && (
                    <section>
                        <h2 className="text-base font-semibold text-gray-900 mb-4">
                            Photos taken with this rig
                            <span className="ml-2 text-sm font-normal text-gray-400">({photos.length})</span>
                        </h2>
                        <Suspense>
                            <GalleryGrid photos={photos} />
                        </Suspense>
                    </section>
                )}

                {photos.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
                        No photos uploaded with this rig yet.
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── ComponentCard ────────────────────────────────────────────────────────────

interface ComponentCardProps {
    label: string
    name: string
    img: { src: string; fallback: string }
    href?: string
    detail?: string
}

function ComponentCard({ label, name, img, href, detail }: ComponentCardProps) {
    const card = (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${href ? 'hover:shadow-md hover:border-blue-200 transition-all' : ''}`}>
            <div className="relative w-full aspect-square bg-gray-50">
                <HousingImage
                    src={img.src}
                    fallback={img.fallback}
                    alt={name}
                    className="object-contain p-3"
                />
            </div>
            <div className="px-3 py-2.5 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{name}</p>
                {detail && <p className="text-[10px] text-gray-400 mt-0.5">{detail}</p>}
            </div>
        </div>
    )

    return href ? <Link href={href}>{card}</Link> : card
}
