import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const review = await prisma.review.findUnique({ where: { id: parseInt(id) }, select: { title: true } })
    return { title: review ? `${review.title} | Reviews` : 'Review Not Found' }
}

async function getReview(id: number) {
    const review = await prisma.review.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            cameraSystem: {
                include: {
                    camera: { include: { brand: true } },
                    lens: true,
                    housing: { include: { manufacturer: true } },
                    port: true,
                },
            },
        },
    })
    if (!review || (review.status !== 'published' && review.status !== 'draft')) return null

    const cs = review.cameraSystem
    const systemParts = [
        cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null,
        cs.lens?.name ?? null,
        cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null,
        cs.port?.name ?? null,
    ].filter(Boolean)

    return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        systemLabel: systemParts.join(' · '),
        systemName: cs.name,
    }
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const review = await getReview(parseInt(id))
    if (!review) notFound()

    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined
    const isAuthor = currentUserId === review.user.id

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <div className="space-y-6">
                        {/* Back + meta */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                All reviews
                            </Link>
                            {isAuthor && (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/reviews/${review.id}/edit`}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Title + author */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{review.title}</h1>
                            <div className="flex items-center gap-3">
                                <Link href={`/users/${review.user.id}`}>
                                    <UserAvatar
                                        picture={review.user.profilePicture ? withBase(review.user.profilePicture) : null}
                                        name={review.user.name ?? '?'}
                                        size="md"
                                    />
                                </Link>
                                <div>
                                    <Link href={`/users/${review.user.id}`} className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">
                                        {review.user.name ?? 'Anonymous'}
                                    </Link>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Camera system reviewed */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Camera System Reviewed</h2>
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 text-sm">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{(review as { systemLabel: string }).systemLabel}</span>
                            </span>
                        </div>

                        {/* Review body */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-xl prose-img:max-w-full"
                                dangerouslySetInnerHTML={{ __html: review.body || '<p class="text-gray-400 dark:text-gray-500 italic">No content yet.</p>' }}
                            />
                        </div>
                    </div>
                </Suspense>
            </div>
        </main>
    )
}
