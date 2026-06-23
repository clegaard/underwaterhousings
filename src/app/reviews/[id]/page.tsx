import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'
import DeleteReviewButton from '@/components/DeleteReviewButton'
import CameraSystemCard from '@/components/CameraSystemCard'
import ReviewOutline, { type OutlineSection } from '@/components/ReviewOutline'
import StarRating from '@/components/StarRating'

// ─── Section Parsing ──────────────────────────────────────────────────────

interface ParsedSections {
    introduction: string
    components: Array<{ type: string; label: string; content: string; rating?: number | null; likes?: string[]; dislikes?: string[] }>
    conclusion: string
}

function parseSections(body: string): ParsedSections | null {
    if (!body) return null
    try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed.introduction === 'string' && Array.isArray(parsed.components)) {
            return {
                ...parsed,
                components: parsed.components.map((c: Partial<ParsedSections['components'][number]>) => ({
                    ...c,
                    likes: Array.isArray(c.likes) ? c.likes : [],
                    dislikes: Array.isArray(c.dislikes) ? c.dislikes : [],
                })),
            }
        }
    } catch { /* legacy HTML */ }
    return null
}

function getOutlineSections(body: string): OutlineSection[] {
    const sections = parseSections(body)
    if (!sections) return []
    const result: OutlineSection[] = []
    result.push({ id: 'section-introduction', label: 'Introduction', hasContent: !!sections.introduction })
    const componentItems: OutlineSection[] = sections.components.map((c, i) => ({
        id: `section-component-${i}`,
        label: c.label,
        hasContent: !!c.content || !!(c.likes && c.likes.length > 0) || !!(c.dislikes && c.dislikes.length > 0),
    }))
    result.push({
        id: 'section-components',
        label: 'Components',
        hasContent: componentItems.some(c => c.hasContent),
        children: componentItems,
    })
    result.push({ id: 'section-conclusion', label: 'Conclusion', hasContent: !!sections.conclusion })
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
                            camera: { select: { id: true, name: true, brand: { select: { name: true } }, productPhotos: true } },
                            lens: { select: { id: true, name: true, productPhotos: true } },
                            housing: { select: { id: true, name: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                            portAdapter: { select: { id: true, name: true, manufacturer: { select: { name: true } }, productPhotos: true } },
                            extensionRings: { select: { id: true, name: true, productPhotos: true } },
                            port: { select: { id: true, name: true, productPhotos: true } },
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
        const hasAnyContent = sections.introduction ||
            sections.components.some(c => c.content) ||
            sections.conclusion

        if (!hasAnyContent) {
            return <p className="text-gray-400 dark:text-gray-500 italic">No content yet.</p>
        }

        // Compute overall rating from component ratings
        const ratedComponents = sections.components.filter(c => c.rating != null)
        const overallRating = ratedComponents.length > 0
            ? Math.round((ratedComponents.reduce((sum, c) => sum + (c.rating ?? 0), 0) / ratedComponents.length) * 10) / 10
            : null

        return (
            <div className="space-y-8">
                {/* Overall rating */}
                {overallRating != null && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <StarRating value={Math.round(overallRating)} readonly size="md" label="Overall rating" />
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {overallRating.toFixed(1)} / 5 overall
                        </span>
                    </div>
                )}

                {sections.introduction && (
                    <div id="section-introduction">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Introduction</h2>
                        <div
                            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: sections.introduction }}
                        />
                    </div>
                )}
                {sections.components.some(c => c.content) && (
                    <div id="section-components">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Components</h2>
                        <div className="space-y-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            {sections.components.map((comp, i) => (
                                (comp.content || (comp.likes && comp.likes.length > 0) || (comp.dislikes && comp.dislikes.length > 0)) ? (
                                    <div key={i} id={`section-component-${i}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{comp.label}</h3>
                                            {comp.rating != null && (
                                                <StarRating value={comp.rating} readonly size="sm" label={`${comp.label} rating`} />
                                            )}
                                        </div>

                                        {/* Likes & Dislikes bullet lists */}
                                        {(comp.likes && comp.likes.length > 0 || comp.dislikes && comp.dislikes.length > 0) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                                {comp.likes && comp.likes.length > 0 && (
                                                    <div className="bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2.5">
                                                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">👍 Liked</p>
                                                        <ul className="space-y-1">
                                                            {comp.likes.map((item, j) => (
                                                                <li key={j} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {comp.dislikes && comp.dislikes.length > 0 && (
                                                    <div className="bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2.5">
                                                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">👎 Could improve</p>
                                                        <ul className="space-y-1">
                                                            {comp.dislikes.map((item, j) => (
                                                                <li key={j} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {comp.content && (
                                            <div
                                                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
                                                dangerouslySetInnerHTML={{ __html: comp.content }}
                                            />
                                        )}
                                    </div>
                                ) : null
                            ))}
                        </div>
                    </div>
                )}
                {sections.conclusion && (
                    <div id="section-conclusion">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Conclusion</h2>
                        <div
                            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-none [&_img]:rounded-xl [&_img]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: sections.conclusion }}
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

                                {/* Author + date */}
                                <div>
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
                                {review.cameraSystem && (
                                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                        <CameraSystemCard
                                            cameraSystem={review.cameraSystem}
                                            mode="display"
                                        />
                                    </div>
                                )}

                                {/* Review body */}
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                                    <ReviewBodyHtml body={review.body} />
                                </div>
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
