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

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

const COMPONENT_ICON: Record<ComponentType, string> = {
    camera: '📷',
    lens: '🔍',
    housing: '🏠',
    port: '🔵',
    portAdapter: '🔧',
    extensionRing: '⭕',
}

const COMPONENT_LABEL: Record<ComponentType, string> = {
    camera: 'Camera',
    lens: 'Lens',
    housing: 'Housing',
    port: 'Port',
    portAdapter: 'Port Adapter',
    extensionRing: 'Extension Ring',
}

interface ComponentDetail {
    id: number
    reviewId: number
    componentType: ComponentType
    componentId: number
    description: string | null
    label: string
    manufacturerName?: string
}

async function fetchComponentLabel(type: ComponentType, id: number): Promise<{ label: string; manufacturerName?: string } | null> {
    switch (type) {
        case 'camera': {
            const c = await prisma.camera.findUnique({ where: { id }, include: { brand: true } })
            return c ? { label: `${c.brand.name} ${c.name}`, manufacturerName: c.brand.name } : null
        }
        case 'lens': {
            const l = await prisma.lens.findUnique({ where: { id }, include: { manufacturer: true } })
            return l ? { label: l.name, manufacturerName: l.manufacturer?.name ?? undefined } : null
        }
        case 'housing': {
            const h = await prisma.housing.findUnique({ where: { id }, include: { manufacturer: true } })
            return h ? { label: `${h.manufacturer.name} ${h.name}`, manufacturerName: h.manufacturer.name } : null
        }
        case 'port': {
            const p = await prisma.port.findUnique({ where: { id }, include: { manufacturer: true } })
            return p ? { label: `${p.manufacturer.name} ${p.name}`, manufacturerName: p.manufacturer.name } : null
        }
        case 'portAdapter': {
            const a = await prisma.portAdapter.findUnique({ where: { id }, include: { manufacturer: true } })
            return a ? { label: `${a.manufacturer.name} ${a.name}`, manufacturerName: a.manufacturer.name } : null
        }
        case 'extensionRing': {
            const e = await prisma.extensionRing.findUnique({ where: { id }, include: { manufacturer: true } })
            return e ? { label: `${e.manufacturer.name} ${e.name}`, manufacturerName: e.manufacturer.name } : null
        }
        default:
            return null
    }
}

async function getReview(id: number) {
    const review = await prisma.review.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, profilePicture: true } },
            components: true,
        },
    })
    if (!review || (review.status !== 'published' && review.status !== 'draft')) return null

    // Enrich components with labels
    const components: ComponentDetail[] = []
    for (const rc of review.components) {
        const detail = await fetchComponentLabel(rc.componentType as ComponentType, rc.componentId)
        if (detail) {
            components.push({
                ...rc,
                componentType: rc.componentType as ComponentType,
                label: detail.label,
                manufacturerName: detail.manufacturerName,
            })
        }
    }

    return {
        ...review,
        components,
        createdAt: review.createdAt.toISOString(),
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
                            <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                All reviews
                            </Link>
                            {isAuthor && (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/reviews/${review.id}/edit`}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Title + author */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-3">{review.title}</h1>
                            <div className="flex items-center gap-3">
                                <Link href={`/users/${review.user.id}`}>
                                    <UserAvatar
                                        picture={review.user.profilePicture ? withBase(review.user.profilePicture) : null}
                                        name={review.user.name ?? '?'}
                                        size="md"
                                    />
                                </Link>
                                <div>
                                    <Link href={`/users/${review.user.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600">
                                        {review.user.name ?? 'Anonymous'}
                                    </Link>
                                    <p className="text-xs text-gray-400">
                                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Components reviewed */}
                        {review.components.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <h2 className="text-sm font-semibold text-gray-700 mb-2">Components Reviewed</h2>
                                <div className="flex flex-wrap gap-2">
                                    {review.components.map(rc => (
                                        <div key={rc.id} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                                            <span className="text-xs">{COMPONENT_ICON[rc.componentType]}</span>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase">{COMPONENT_LABEL[rc.componentType]}</span>
                                            <span className="text-gray-800 font-medium">{rc.label}</span>
                                            {rc.description && (
                                                <span className="text-gray-400 text-xs">— {rc.description}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Review body */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <div
                                className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-img:rounded-xl prose-img:max-w-full"
                                dangerouslySetInnerHTML={{ __html: review.body || '<p class="text-gray-400 italic">No content yet.</p>' }}
                            />
                        </div>
                    </div>
                </Suspense>
            </div>
        </main>
    )
}
