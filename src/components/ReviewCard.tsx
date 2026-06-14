'use client'

import Link from 'next/link'
import SystemImage from '@/components/SystemImage'
import UserAvatar from '@/components/UserAvatar'

interface ReviewCardData {
    id: number
    status: string
    createdAt: string
    user: {
        id: number
        name: string | null
        profilePicture: string | null
    }
    systemLabel: string
    bodyExcerpt: string
    systemImageSrc?: string
    systemImageFallback?: string
    userProfilePicture?: string
}

export default function ReviewCard({ review }: { review: ReviewCardData }) {
    return (
        <Link
            href={`/reviews/${review.id}`}
            className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 hover:scale-[1.01] transition-all duration-200 overflow-hidden group"
        >
            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    {/* System image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors duration-200">
                        <SystemImage
                            src={review.systemImageSrc ?? '/camera-systems/fallback-camera-system-smartphone.avif'}
                            fallback={review.systemImageFallback ?? '/camera-systems/fallback-camera-system-smartphone.avif'}
                            alt={review.systemLabel}
                            className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-200"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-200">
                                {review.systemLabel}
                            </h3>
                            {review.status === 'draft' && (
                                <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                                    Draft
                                </span>
                            )}
                        </div>
                        {review.bodyExcerpt && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                {review.bodyExcerpt}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                            <Link
                                href={`/users/${review.user.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 hover:scale-110 transition-transform duration-200"
                                title={review.user.name ?? 'Anonymous'}
                            >
                                <UserAvatar
                                    picture={review.user.profilePicture ?? null}
                                    name={review.user.name ?? '?'}
                                    size="sm"
                                />
                            </Link>
                            <Link
                                href={`/users/${review.user.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors duration-200"
                            >
                                {review.user.name ?? 'Anonymous'}
                            </Link>
                            <span>·</span>
                            <span>{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
