'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'
import StarRating from '@/components/StarRating'

interface SystemSummary {
    camera: string | null
    lens: string | null
    housing: string | null
    port: string | null
    description: string | null
}

interface ReviewData {
    id: number
    systemSummaries: SystemSummary[]
    targetComponentIndex: number | null
    targetComponentRating: number | null
    createdAt: string
    bodyExcerpt: string
    user: {
        id: number
        name: string | null
        profilePicture: string | null
    }
}

function formatSystemLabel(summaries: SystemSummary[]): string {
    if (summaries.length === 0) return 'Unknown system'
    const s = summaries[0]
    return [s.camera, s.lens, s.housing, s.port].filter(Boolean).join(' · ') || 'Unknown system'
}

interface Props {
    productType: 'camera' | 'lens' | 'housing' | 'port'
    productId: number
}

export default function ProductReviewsSection({ productType, productId }: Props) {
    const [reviews, setReviews] = useState<ReviewData[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        fetch(`/api/products/reviews?type=${productType}&id=${productId}`)
            .then(r => r.json())
            .then(json => {
                if (!cancelled && json.success && Array.isArray(json.data)) {
                    setReviews(json.data)
                }
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [productType, productId])

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Reviews</h2>
                    <div className="flex items-center justify-center py-8">
                        <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                </div>
            </div>
        )
    }

    if (reviews.length === 0) return null

    return (
        <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Reviews
                        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({reviews.length})</span>
                    </h2>
                </div>
                <div className="space-y-4">
                    {reviews.map(r => (
                        <Link
                            key={r.id}
                            href={`/reviews/${r.id}${r.targetComponentIndex != null ? `#section-component-${r.targetComponentIndex}` : ''}`}
                            className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        router.push(`/users/${r.user.id}`)
                                    }}
                                    className="shrink-0 hover:scale-110 transition-transform cursor-pointer"
                                    role="link"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.stopPropagation()
                                            e.preventDefault()
                                            router.push(`/users/${r.user.id}`)
                                        }
                                    }}
                                >
                                    <UserAvatar
                                        picture={r.user.profilePicture ? withBase(r.user.profilePicture) : null}
                                        name={r.user.name ?? '?'}
                                        size="sm"
                                    />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                            {formatSystemLabel(r.systemSummaries)}
                                        </p>
                                        {r.targetComponentRating != null && (
                                            <StarRating value={r.targetComponentRating} readonly size="sm" />
                                        )}
                                    </div>
                                    {r.bodyExcerpt && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {r.bodyExcerpt}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                        <span>{r.user.name ?? 'Anonymous'}</span>
                                        <span>·</span>
                                        <span>{new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
