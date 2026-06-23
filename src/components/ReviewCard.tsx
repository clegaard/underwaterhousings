'use client'

import { useRouter } from 'next/navigation'
import CameraSystemCard, { type CameraSystemCardData } from '@/components/CameraSystemCard'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'
import StarRating from '@/components/StarRating'

interface ReviewCardData {
    id: number
    status: string
    createdAt: string
    bodyExcerpt: string
    overallRating: number | null
    user: {
        id: number
        name: string | null
        profilePicture: string | null
    }
    cameraSystem: CameraSystemCardData | null
}

export default function ReviewCard({ review }: { review: ReviewCardData }) {
    const router = useRouter()

    function goToUser(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()
        router.push(`/users/${review.user.id}`)
    }

    function goToReview() {
        router.push(`/reviews/${review.id}`)
    }

    const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div
            onClick={goToReview}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') goToReview() }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 overflow-hidden group cursor-pointer"
        >
            {/* Author + date + excerpt header */}
            <div className="px-4 pt-4 pb-2 flex items-start gap-3">
                <span
                    onClick={goToUser}
                    className="shrink-0 hover:scale-110 transition-transform duration-200 cursor-pointer"
                    title={review.user.name ?? 'Anonymous'}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') goToUser(e as unknown as React.MouseEvent) }}
                >
                    <UserAvatar
                        picture={review.user.profilePicture ? withBase(review.user.profilePicture) : null}
                        name={review.user.name ?? '?'}
                        size="sm"
                    />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            onClick={goToUser}
                            className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') goToUser(e as unknown as React.MouseEvent) }}
                        >
                            {review.user.name ?? 'Anonymous'}
                        </span>
                        {review.status === 'draft' && (
                            <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                                Draft
                            </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
                        {review.overallRating != null && (
                            <span className="inline-flex items-center gap-1 ml-auto">
                                <StarRating value={review.overallRating} readonly size="sm" label="Overall rating" />
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                                    {review.overallRating.toFixed(1)}
                                </span>
                            </span>
                        )}
                    </div>
                    {review.bodyExcerpt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                            {review.bodyExcerpt}
                        </p>
                    )}
                </div>
            </div>

            {/* Camera system card — display only, no controls */}
            {review.cameraSystem && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                    <CameraSystemCard
                        cameraSystem={review.cameraSystem}
                        mode="display"
                    />
                </div>
            )}
        </div>
    )
}
