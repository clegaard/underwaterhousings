import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'

export const metadata = {
    title: 'Reviews | Underwater Camera Housings',
    description: 'In-depth reviews of underwater camera gear by the community',
}

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

const COMPONENT_LABELS: Record<ComponentType, string> = {
    camera: 'Camera',
    lens: 'Lens',
    housing: 'Housing',
    port: 'Port',
    portAdapter: 'Port Adapter',
    extensionRing: 'Extension Ring',
}

async function fetchComponentLabel(type: ComponentType, id: number): Promise<string | null> {
    switch (type) {
        case 'camera': {
            const c = await prisma.camera.findUnique({ where: { id }, include: { brand: true } })
            return c ? `${c.brand.name} ${c.name}` : null
        }
        case 'lens': {
            const l = await prisma.lens.findUnique({ where: { id }, include: { manufacturer: true } })
            return l ? `${l.manufacturer?.name ?? ''} ${l.name}`.trim() || l.name : null
        }
        case 'housing': {
            const h = await prisma.housing.findUnique({ where: { id }, include: { manufacturer: true } })
            return h ? `${h.manufacturer.name} ${h.name}` : null
        }
        case 'port': {
            const p = await prisma.port.findUnique({ where: { id }, include: { manufacturer: true } })
            return p ? `${p.manufacturer.name} ${p.name}` : null
        }
        case 'portAdapter': {
            const a = await prisma.portAdapter.findUnique({ where: { id }, include: { manufacturer: true } })
            return a ? `${a.manufacturer.name} ${a.name}` : null
        }
        case 'extensionRing': {
            const e = await prisma.extensionRing.findUnique({ where: { id }, include: { manufacturer: true } })
            return e ? `${e.manufacturer.name} ${e.name}` : null
        }
        default:
            return null
    }
}

interface ComponentPill {
    type: ComponentType
    label: string
}

async function getPublishedReviews() {
    const reviews = await prisma.review.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            components: { take: 10 },
        },
    })

    // Resolve component labels
    const enriched = await Promise.all(
        reviews.map(async (r) => {
            const componentPills: ComponentPill[] = []
            for (const rc of r.components) {
                const label = await fetchComponentLabel(rc.componentType as ComponentType, rc.componentId)
                if (label) {
                    componentPills.push({ type: rc.componentType as ComponentType, label })
                }
            }
            return {
                ...r,
                createdAt: r.createdAt.toISOString(),
                componentPills,
                bodyExcerpt: r.body
                    ? r.body.replace(/<[^>]*>/g, '').slice(0, 200) + (r.body.replace(/<[^>]*>/g, '').length > 200 ? '…' : '')
                    : '',
            }
        })
    )
    return enriched
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
                                    <Link
                                        key={r.id}
                                        href={`/reviews/${r.id}`}
                                        className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden"
                                    >
                                        <div className="px-5 py-4">
                                            <div className="flex items-start gap-3">
                                                <UserAvatar
                                                    picture={r.user.profilePicture ? withBase(r.user.profilePicture) : null}
                                                    name={r.user.name ?? '?'}
                                                    size="base"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                                                        {r.title}
                                                    </h3>
                                                    {/* Component pills */}
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {(r as { componentPills: ComponentPill[] }).componentPills.map((pill, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                                {pill.type === 'camera' && (
                                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                    </svg>
                                                                )}
                                                                {pill.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {(r as { bodyExcerpt: string }).bodyExcerpt && (
                                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                            {(r as { bodyExcerpt: string }).bodyExcerpt}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                                        <span>{r.user.name ?? 'Anonymous'}</span>
                                                        <span>·</span>
                                                        <span>{new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </Suspense>
            </div>
        </main>
    )
}
