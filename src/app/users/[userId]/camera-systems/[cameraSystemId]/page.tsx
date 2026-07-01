import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import {
    getCameraImagePathWithFallback,
    getHousingImagePathWithFallback,
    getLensImagePathWithFallback,
    getPortImagePathWithFallback,
    withBase,
} from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'
import GalleryPhotoGrid from '@/components/GalleryPhotoGrid'

interface PageProps {
    params: Promise<{ userId: string; cameraSystemId: string }>
}

export async function generateMetadata({ params }: PageProps) {
    const { userId, cameraSystemId: csIdStr } = await params
    const uid = parseInt(userId, 10)
    const csId = parseInt(csIdStr, 10)
    if (isNaN(uid) || isNaN(csId)) return {}
    const cameraSystem = await prisma.cameraSystem.findUnique({
        where: { id: csId },
        select: { name: true, userId: true, user: { select: { name: true } } },
    })
    if (!cameraSystem || cameraSystem.userId !== uid) return {}
    return {
        title: `${cameraSystem.name} · ${cameraSystem.user.name ?? 'User'} | Underwater Camera Housings`,
    }
}

export default async function CameraSystemDetailPage({ params }: PageProps) {
    const { userId, cameraSystemId: csIdStr } = await params
    const uid = parseInt(userId, 10)
    const csId = parseInt(csIdStr, 10)
    if (isNaN(uid) || isNaN(csId)) notFound()

    const cameraSystem = await prisma.cameraSystem.findUnique({
        where: { id: csId },
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

    // The camera system must exist and belong to the user in the URL
    if (!cameraSystem || cameraSystem.userId !== uid) notFound()
    const cameraImg = getCameraImagePathWithFallback(cameraSystem.camera.productPhotos ?? [])
    const lensImg = cameraSystem.lens ? getLensImagePathWithFallback(cameraSystem.lens.productPhotos ?? []) : null
    const housingImg = cameraSystem.housing ? getHousingImagePathWithFallback(cameraSystem.housing.productPhotos ?? []) : null
    const portImg = cameraSystem.port ? getPortImagePathWithFallback(cameraSystem.port.productPhotos ?? []) : null

    const userName = cameraSystem.user.name ?? 'User'

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
                    <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <span>›</span>
                    <Link href={`/users/${uid}`} className="hover:text-blue-600 transition-colors">{userName}</Link>
                    <span>›</span>
                    <span className="text-gray-900 font-medium">{cameraSystem.name}</span>
                </nav>

                {/* Header card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {cameraSystem.imagePath && (
                        <div className="relative w-full h-48 bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`/api/media${cameraSystem.imagePath}`}
                                alt={`${cameraSystem.name} assembled`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="px-6 py-5 flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">{cameraSystem.name}</h1>
                            <Link
                                href={`/users/${uid}`}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {userName}&apos;s profile
                            </Link>
                        </div>
                        <Link
                            href={`/camera-systems?${new URLSearchParams({
                                camera: cameraSystem.camera.slug,
                                ...(cameraSystem.housing ? { housing: cameraSystem.housing.slug } : {}),
                                ...(cameraSystem.lens ? { lens: cameraSystem.lens.slug } : {}),
                                ...(cameraSystem.port ? { port: cameraSystem.port.slug } : {}),
                            }).toString()}`}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            View camera system specs →
                        </Link>
                    </div>
                </div>

                {/* Components */}
                <section>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Components</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

                        <ComponentCard
                            label="Camera"
                            name={`${cameraSystem.camera.brand.name} ${cameraSystem.camera.name}`}
                            img={cameraImg}
                            href={`/cameras/${cameraSystem.camera.brand.slug}`}
                        />

                        {cameraSystem.lens && lensImg && (
                            <ComponentCard
                                label="Lens"
                                name={cameraSystem.lens.name}
                                img={lensImg}
                            />
                        )}

                        {cameraSystem.housing && housingImg && (
                            <ComponentCard
                                label="Housing"
                                name={`${cameraSystem.housing.manufacturer.name} ${cameraSystem.housing.name}`}
                                img={housingImg}
                                href={`/gear/${cameraSystem.housing.manufacturer.slug}/housings/${cameraSystem.housing.slug}`}
                            />
                        )}

                        {cameraSystem.port && portImg && (
                            <ComponentCard
                                label="Port"
                                name={cameraSystem.port.name}
                                img={portImg}
                            />
                        )}

                        {cameraSystem.portAdapter && (
                            <ComponentCard
                                label="Port Adapter"
                                name={cameraSystem.portAdapter.name}
                                img={{ src: '/ports/fallback.png', fallback: '/ports/fallback.png' }}
                                detail={
                                    cameraSystem.portAdapter.inputHousingMount && cameraSystem.portAdapter.outputHousingMount
                                        ? `${cameraSystem.portAdapter.inputHousingMount.name} → ${cameraSystem.portAdapter.outputHousingMount.name}`
                                        : undefined
                                }
                            />
                        )}

                        {cameraSystem.extensionRings.map(ring => (
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
                <section>
                    <GalleryPhotoGrid
                        photos={cameraSystem.galleryPhotos}
                        heading="Photos taken with this camera system"
                        viewAllHref={`/gallery?${new URLSearchParams({
                            user: String(cameraSystem.userId),
                            ...(cameraSystem.camera?.slug ? { camera: cameraSystem.camera.slug } : {}),
                            ...(cameraSystem.lens?.slug ? { lens: cameraSystem.lens.slug } : {}),
                            ...(cameraSystem.housing?.slug ? { housing: cameraSystem.housing.slug } : {}),
                            ...(cameraSystem.port?.slug ? { port: cameraSystem.port.slug } : {}),
                        }).toString()}`}
                    />
                </section>
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
