import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import ReviewCard from '@/components/ReviewCard'

export const metadata = {
    title: 'Reviews | Underwater Camera Housings',
    description: 'In-depth reviews of underwater camera systems by the community',
}

interface ReviewWithSystem {
    id: number
    status: string
    createdAt: string
    bodyExcerpt: string
    componentRatings: Array<number | null>
    user: {
        id: number
        name: string | null
        profilePicture: string | null
    }
    cameraSystem: {
        id: number
        name: string
        imagePath: string | null
        camera: {
            id: number
            name: string
            productPhotos: string[]
            brand: { name: string }
        }
        lens: {
            id: number
            name: string
            productPhotos: string[]
        } | null
        housing: {
            id: number
            name: string
            productPhotos: string[]
            manufacturer: { name: string }
        } | null
        portAdapter: {
            id: number
            name: string
            productPhotos: string[]
            manufacturer: { name: string }
        } | null
        extensionRings: {
            id: number
            name: string
            productPhotos: string[]
        }[]
        port: {
            id: number
            name: string
            productPhotos: string[]
        } | null
    } | null
}

async function getPublishedReviews(): Promise<ReviewWithSystem[]> {
    const reviews = await prisma.review.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            systems: {
                take: 1,
                include: {
                    cameraSystem: {
                        include: {
                            camera: { include: { brand: true } },
                            lens: true,
                            housing: { include: { manufacturer: true } },
                            port: true,
                            portAdapter: { include: { manufacturer: true } },
                            extensionRings: true,
                        },
                    },
                },
            },
        },
    })
    return reviews.map(r => {
        // Parse JSON body for component ratings (in order) and overall impression excerpt
        const componentRatings: Array<number | null> = []
        let bodyExcerpt = ''
        if (r.body) {
            try {
                const sections = JSON.parse(r.body)
                if (sections?.components && Array.isArray(sections.components)) {
                    for (const c of sections.components) {
                        componentRatings.push(c.rating ?? null)
                    }
                }
                if (typeof sections?.overallImpression === 'string' && sections.overallImpression) {
                    const plain = sections.overallImpression.replace(/<[^>]*>/g, '')
                    bodyExcerpt = plain.length > 200 ? plain.slice(0, 200) + '…' : plain
                }
            } catch { /* body is legacy HTML, not JSON */ }
        }

        return {
            id: r.id,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            bodyExcerpt,
            componentRatings,
            user: r.user,
            cameraSystem: r.systems[0]?.cameraSystem ?? null,
        }
    })
}

export default async function ReviewsPage() {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const reviews = await getPublishedReviews()

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
