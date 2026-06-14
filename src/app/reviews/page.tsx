import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase, getCameraSystemImageWithFallback } from '@/lib/images'
import ReviewCard from '@/components/ReviewCard'

export const metadata = {
    title: 'Reviews | Underwater Camera Housings',
    description: 'In-depth reviews of underwater camera systems by the community',
}

async function getReviews(currentUserId?: number) {
    // Fetch published reviews
    const published = await prisma.review.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            cameraSystem: {
                select: {
                    imagePath: true,
                    camera: { select: { name: true, brand: { select: { name: true } }, productPhotos: true } },
                    lens: { select: { name: true, productPhotos: true } },
                    housing: { select: { name: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                    port: { select: { name: true } },
                },
            },
        },
    })

    // Fetch current user's drafts
    let drafts: typeof published = []
    if (currentUserId) {
        drafts = await prisma.review.findMany({
            where: { userId: currentUserId, status: 'draft' },
            orderBy: { updatedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, profilePicture: true } },
                cameraSystem: {
                    select: {
                        imagePath: true,
                        camera: { select: { name: true, brand: { select: { name: true } }, productPhotos: true } },
                        lens: { select: { name: true, productPhotos: true } },
                        housing: { select: { name: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                        port: { select: { name: true } },
                    },
                },
            },
        })
    }

    // Combine: drafts first, then published
    const all = [...drafts, ...published]

    return all.map(r => {
        const cs = r.cameraSystem
        const parts = [
            cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null,
            cs.lens?.name ?? null,
            cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null,
            cs.port?.name ?? null,
        ].filter(Boolean)

        const systemImage = getCameraSystemImageWithFallback({
            imagePath: cs.imagePath,
            housing: cs.housing ? { productPhotos: cs.housing.productPhotos } : null,
            camera: cs.camera ? { productPhotos: cs.camera.productPhotos } : null,
            lens: cs.lens ? { productPhotos: cs.lens.productPhotos } : null,
        })

        let excerpt = ''
        if (r.body) {
            try {
                const sections = JSON.parse(r.body)
                if (sections?.introduction) {
                    excerpt = sections.introduction.replace(/<[^>]*>/g, '').slice(0, 200)
                }
            } catch {
                excerpt = r.body.replace(/<[^>]*>/g, '').slice(0, 200)
            }
        }

        return {
            id: r.id,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            user: {
                id: r.user.id,
                name: r.user.name,
                profilePicture: r.user.profilePicture ? withBase(r.user.profilePicture) : null,
            },
            systemLabel: parts.join(' · '),
            systemImageSrc: systemImage.src,
            systemImageFallback: systemImage.fallback,
            bodyExcerpt: excerpt ? excerpt + (excerpt.length >= 200 ? '…' : '') : '',
        }
    })
}

export default async function ReviewsPage() {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const reviews = await getReviews(currentUserId)

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <div className="flex flex-col gap-6">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    In-depth experiences with underwater camera systems
                                </p>
                            </div>
                            {currentUserId ? (
                                <Link
                                    href="/reviews/new"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Write a Review
                                </Link>
                            ) : (
                                <Link
                                    href="/auth/login"
                                    className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Log in to write a review
                                </Link>
                            )}
                        </div>

                        {/* Reviews list */}
                        {reviews.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                                <div className="text-5xl mb-4">📝</div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-2">No reviews yet</h2>
                                <p className="text-sm text-gray-500">Be the first to share your experience.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map(r => (
                                    <ReviewCard key={r.id} review={r} />
                                ))}
                            </div>
                        )}
                    </div>
                </Suspense>
            </div>
        </main>
    )
}
