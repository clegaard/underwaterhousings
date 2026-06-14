import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'
import { getCameraSystemImageWithFallback } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'
import DeleteReviewButton from '@/components/DeleteReviewButton'
import SystemImage from '@/components/SystemImage'
import ReviewOutline, { type OutlineSection } from '@/components/ReviewOutline'

// ─── Section Parsing ──────────────────────────────────────────────────────

interface ParsedSections {
    introduction: string
    components: Array<{ type: string; label: string; content: string }>
    conclusion: string
}

function parseSections(body: string): ParsedSections | null {
    if (!body) return null
    try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed.introduction === 'string' && Array.isArray(parsed.components)) {
            return parsed
        }
    } catch { /* legacy HTML */ }
    return null
}

function getOutlineSections(body: string): OutlineSection[] {
    const sections = parseSections(body)
    if (!sections) return []
    const result: OutlineSection[] = []
    result.push({ id: 'section-introduction', label: 'Introduction', hasContent: !!sections.introduction })
    for (let i = 0; i < sections.components.length; i++) {
        const c = sections.components[i]
        result.push({ id: `section-component-${i}`, label: c.label, hasContent: !!c.content })
    }
    result.push({ id: 'section-conclusion', label: 'Conclusion', hasContent: !!sections.conclusion })
    return result
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const review = await prisma.review.findUnique({
        where: { id: parseInt(id) },
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
    })
    if (!review) return { title: 'Review Not Found' }
    const cs = review.cameraSystem
    const label = [cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null, cs.lens?.name, cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null, cs.port?.name].filter(Boolean).join(' · ')
    return { title: `${label} | Reviews` }
}

async function getReview(id: number) {
    const review = await prisma.review.findUnique({
        where: { id },
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
    if (!review || (review.status !== 'published' && review.status !== 'draft')) return null

    const cs = review.cameraSystem
    const systemParts = [
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

    return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        systemLabel: systemParts.join(' · '),
        systemImageSrc: systemImage.src,
        systemImageFallback: systemImage.fallback,
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

        return (
            <div className="space-y-8">
                {sections.introduction && (
                    <div id="section-introduction">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Introduction</h2>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-xl prose-img:max-w-full"
                            dangerouslySetInnerHTML={{ __html: sections.introduction }}
                        />
                    </div>
                )}
                {sections.components.map((comp, i) => (
                    comp.content ? (
                        <div key={i} id={`section-component-${i}`}>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{comp.label}</h2>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-xl prose-img:max-w-full"
                                dangerouslySetInnerHTML={{ __html: comp.content }}
                            />
                        </div>
                    ) : null
                ))}
                {sections.conclusion && (
                    <div id="section-conclusion">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Conclusion</h2>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-xl prose-img:max-w-full"
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
            className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-xl prose-img:max-w-full"
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
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex gap-8">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
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
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Camera System Reviewed</h2>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                                            <SystemImage
                                                src={(review as { systemImageSrc: string }).systemImageSrc}
                                                fallback={(review as { systemImageFallback: string }).systemImageFallback}
                                                alt={(review as { systemLabel: string }).systemLabel}
                                                className="w-full h-full object-contain p-1"
                                            />
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 text-sm">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            </svg>
                                            <span className="text-gray-800 dark:text-gray-200 font-medium">{(review as { systemLabel: string }).systemLabel}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Review body */}
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                                    <ReviewBodyHtml body={review.body} />
                                </div>
                            </div>
                        </Suspense>
                    </div>

                    {/* Sidebar outline — hidden on mobile */}
                    <aside className="hidden lg:block w-56 shrink-0">
                        <div className="sticky top-24">
                            <ReviewOutline sections={getOutlineSections(review.body)} />
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
