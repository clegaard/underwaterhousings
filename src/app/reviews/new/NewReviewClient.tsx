'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CameraSystemCard, { type CameraSystemCardData } from '@/components/CameraSystemCard'

interface UserSystem extends CameraSystemCardData {
    reviewLinks: { reviewId: number; review: { id: number; status: string } }[]
}

export default function NewReviewClient({ userSystems, userId }: { userSystems: UserSystem[]; userId: number }) {
    const router = useRouter()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const newSystems = userSystems.filter(s => s.reviewLinks.length === 0)
    const draftSystems = userSystems.filter(s => s.reviewLinks.some(rl => rl.review.status === 'draft'))
    const publishedSystems = userSystems.filter(s => s.reviewLinks.some(rl => rl.review.status === 'published'))

    async function handleContinue() {
        if (!selectedId) { setError('Please select a camera system to review.'); return }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: '',
                    status: 'draft',
                    cameraSystemId: selectedId,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to create review')
            router.push(`/reviews/new/write?id=${data.data.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setSaving(false)
        }
    }

    function continueDraft(reviewId: number) {
        router.push(`/reviews/new/write?id=${reviewId}`)
    }

    return (
        <div className="space-y-6">
            <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to reviews
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Write a Review</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Step 1 of 2: Choose a camera system to review</p>
            </div>

            {/* Drafts — continue where they left off */}
            {draftSystems.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Continue a draft</h2>
                    {draftSystems.map(s => {
                        const draft = s.reviewLinks.find(rl => rl.review.status === 'draft')!
                        return (
                            <div key={s.id} className="relative group cursor-pointer" onClick={() => continueDraft(draft.review.id)}>
                                <CameraSystemCard
                                    cameraSystem={s}
                                    mode="display"
                                />
                                <div className="absolute inset-0 bg-amber-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                    <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                                        Continue draft
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Already reviewed */}
            {publishedSystems.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400">Already reviewed</h2>
                    {publishedSystems.map(s => (
                        <CameraSystemCard
                            key={s.id}
                            cameraSystem={s}
                            mode="display"
                        />
                    ))}
                </div>
            )}

            {/* New systems available for review */}
            {newSystems.length > 0 && (
                <div className="space-y-2">
                    {draftSystems.length > 0 || publishedSystems.length > 0 ? (
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Available to review</h2>
                    ) : null}
                    <div className="space-y-3">
                        {newSystems.map(s => (
                            <CameraSystemCard
                                key={s.id}
                                cameraSystem={s}
                                mode="select"
                                isSelected={selectedId === s.id}
                                onSelect={() => setSelectedId(s.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {userSystems.length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    You don&apos;t have any camera systems.{' '}
                    <Link href={`/users/${userId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        Create one on your profile
                    </Link>
                    {' '}first.
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {newSystems.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleContinue}
                        disabled={saving || !selectedId}
                        className="px-5 py-2.5 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-semibold flex items-center gap-2"
                    >
                        {saving ? 'Creating…' : 'Continue to write review'}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}
