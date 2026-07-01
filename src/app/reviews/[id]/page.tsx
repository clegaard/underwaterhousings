import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'
import DeleteReviewButton from '@/components/DeleteReviewButton'
import ReviewOutline, { type OutlineSection } from '@/components/ReviewOutline'
import StarRating from '@/components/StarRating'
import GalleryPhotoGrid from '@/components/GalleryPhotoGrid'

// ─── Section Parsing ──────────────────────────────────────────────────────

interface ParsedSections {
    overallImpression: string
    components: Array<{ type: string; label: string; content: string; rating?: number | null }>
}

function parseSections(body: string): ParsedSections | null {
    if (!body) return null
    try {
        const parsed = JSON.parse(body)
        if (parsed && Array.isArray(parsed.components)) {
            let overallImpression = parsed.overallImpression || ''
            if (!overallImpression) {
                const intro = typeof parsed.introduction === 'string' ? parsed.introduction : ''
                const conclusion = typeof parsed.conclusion === 'string' ? parsed.conclusion : ''
                if (intro || conclusion) {
                    overallImpression = [intro, conclusion].filter(Boolean).join('\n\n')
                }
            }
            return { overallImpression, components: parsed.components }
        }
    } catch { /* legacy HTML */ }
    return null
}

function getOutlineSections(body: string): OutlineSection[] {
    const sections = parseSections(body)
    if (!sections) return []
    const result: OutlineSection[] = []
    for (const [i, c] of sections.components.entries()) {
        result.push({
            id: `section-component-${i}`,
            label: c.label,
            hasContent: !!c.content,
        })
    }
    result.push({ id: 'section-overall-impression', label: 'Overall Impression', hasContent: !!sections.overallImpression })
    return result
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const review = await prisma.review.findUnique({
        where: { id: parseInt(id) },
        select: {
            systems: {
                select: {
                    cameraSystem: {
                        select: {
                            camera: { select: { name: true, brand: { select: { name: true } } } },
                            lens: { select: { name: true } },
                            housing: { select: { name: true, manufacturer: { select: { name: true } } } },
                            port: { select: { name: true } },
                        },
                    },
                },
            },
        },
    })
    if (!review) return { title: 'Review Not Found' }
    const firstSystem = review.systems[0]
    const cs = firstSystem?.cameraSystem
    const label = cs ? [cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null, cs.lens?.name, cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null, cs.port?.name].filter(Boolean).join(' · ') : 'Review'
    return { title: `${label} | Reviews` }
}

async function getReview(id: number) {
    const review = await prisma.review.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            systems: {
                select: {
                    description: true,
                    cameraSystem: {
                        select: {
                            id: true,
                            name: true,
                            imagePath: true,
                            camera: { select: { id: true, name: true, slug: true, brand: { select: { name: true } }, productPhotos: true } },
                            lens: { select: { id: true, name: true, slug: true, productPhotos: true } },
                            housing: { select: { id: true, name: true, slug: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                            portAdapter: { select: { id: true, name: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                            extensionRings: { select: { id: true, name: true, productPhotos: true } },
                            port: { select: { id: true, name: true, slug: true, productPhotos: true } },
                            galleryPhotos: {
                                orderBy: { takenAt: 'desc' },
                                take: 12,
                            },
                        },
                    },
                },
            },
        },
    })
    if (!review || (review.status !== 'published' && review.status !== 'draft')) return null

    const firstSystem = review.systems[0]
    const cameraSystem = firstSystem?.cameraSystem ?? null

    return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        cameraSystem,
    }
}

// ─── Review Body Renderer ─────────────────────────────────────────────────

function ReviewBodyHtml({ body }: { body: string }) {
    if (!body) {
        return <p className="text-gray-400 dark:text-gray-500 italic">No content yet.</p>
    }

    const sections = parseSections(body)
    if (sections) {
        const hasAnyContent = sections.overallImpression ||
            sections.components.some(c => c.content)

        if (!hasAnyContent) {
            return <p className="text-gray-400 dark:text-gray-500 italic">No content yet.</p>
        }

        return (
            <div className="space-y-8">
                {sections.components.map((comp, i) => (
                    comp.content ? (
                        <div key={i} id={`section-component-${i}`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{comp.label}</h3>
                                <span className="inline-flex shrink-0 w-[160px]">
                                    {comp.rating != null && (
                                        <StarRating value={comp.rating} readonly size="sm" label={`${comp.label} rating`} />
                                    )}
                                </span>
                            </div>
                            <div
                                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
                                dangerouslySetInnerHTML={{ __html: comp.content }}
                            />
                        </div>
                    ) : null
                ))}
                {sections.overallImpression && (
                    <div id="section-overall-impression">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Overall Impression</h2>
                        <div
                            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: sections.overallImpression }}
                        />
                    </div>
                )}
            </div>
        )
    }

    // Legacy HTML body
    return (
        <div
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: body }}
        />
    )
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
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex justify-center gap-8">
                    {/* Left spacer — balances the sidebar width */}
                    <div className="hidden lg:block w-40 shrink-0" />
                    {/* Main content */}
                    <div className="w-full max-w-4xl min-w-0">
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
                                        <div className="flex gap-3 items-center">
                                            <Link
                                                href={`/reviews/${review.id}/edit`}
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                Edit
                                            </Link>
                                            <DeleteReviewButton reviewId={review.id} />
                                        </div>
                                    )}
                                </div>

                                {/* Blog-style author header */}
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                                    <div className="flex items-center gap-4">
                                        <Link href={`/users/${review.user.id}`}>
                                            <UserAvatar
                                                picture={review.user.profilePicture ? withBase(review.user.profilePicture) : null}
                                                name={review.user.name ?? '?'}
                                                size="lg"
                                            />
                                        </Link>
                                        <div>
                                            <Link href={`/users/${review.user.id}`} className="text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                {review.user.name ?? 'Anonymous'}
                                            </Link>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                            {review.cameraSystem && (
                                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                                                    {[review.cameraSystem.camera.brand.name, review.cameraSystem.camera.name].join(' ')}
                                                    {review.cameraSystem.lens ? ` · ${review.cameraSystem.lens.name}` : ''}
                                                    {review.cameraSystem.housing ? ` · ${review.cameraSystem.housing.manufacturer.name} ${review.cameraSystem.housing.name}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Review body */}
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                                    <ReviewBodyHtml body={review.body} />
                                </div>

                                {/* Gallery — photos taken with this camera system */}
                                {review.cameraSystem && (() => {
                                    const cs = review.cameraSystem
                                    const params = new URLSearchParams()
                                    if (cs.camera?.slug) params.set('camera', cs.camera.slug)
                                    if (cs.lens?.slug) params.set('lens', cs.lens.slug)
                                    if (cs.housing?.slug) params.set('housing', cs.housing.slug)
                                    if (cs.port?.slug) params.set('port', cs.port.slug)
                                    params.set('user', String(review.user.id))
                                    return (
                                        <GalleryPhotoGrid
                                            photos={(cs as { galleryPhotos: Array<{ id: number; imagePath: string; caption: string | null; location: string | null }> }).galleryPhotos}
                                            heading="Photos taken with this system"
                                            viewAllHref={`/gallery?${params.toString()}`}
                                            viewAllLabel="View all photos →"
                                        />
                                    )
                                })()}
                            </div>
                        </Suspense>
                    </div>

                    {/* Sidebar outline — hidden on mobile */}
                    <aside className="hidden lg:block w-40 shrink-0">
                        <div className="sticky top-24">
                            <ReviewOutline sections={getOutlineSections(review.body)} />
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
