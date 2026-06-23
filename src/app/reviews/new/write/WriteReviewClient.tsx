'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReviewSectionTextEditor from '@/components/ReviewSectionTextEditor'
import CameraSystemCard, { type CameraSystemCardData } from '@/components/CameraSystemCard'

interface ReviewData {
    id: number
    body: string
    cameraSystem: CameraSystemCardData | null
    systemComponents: {
        cameras: string[]
        lenses: string[]
        housings: string[]
        ports: string[]
    }
}

export default function WriteReviewClient({ review, userId, mode = 'write' }: { review: ReviewData; userId: number; mode?: 'write' | 'edit' }) {
    const router = useRouter()
    const [body, setBody] = useState(review.body)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEdit = mode === 'edit'

    async function handleSave(status: 'draft' | 'published') {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`/api/reviews?id=${review.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body, status }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to save review')
            router.push(`/reviews/${review.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {isEdit ? (
                <Link href={`/reviews/${review.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to review
                </Link>
            ) : (
                <Link href="/reviews/new" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to system selection
                </Link>
            )}

            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Your Review' : 'Write Your Review'}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isEdit ? 'Update your experience' : 'Step 2 of 2: Share your experience'}
                </p>
            </div>

            {/* Camera system (read-only, displayed with full card) */}
            {review.cameraSystem && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <CameraSystemCard
                        cameraSystem={review.cameraSystem}
                        mode="display"
                    />
                </div>
            )}

            {/* Section Editors */}
            <div>
                <ReviewSectionTextEditor
                    value={body}
                    onChange={setBody}
                    systemComponents={review.systemComponents}
                />
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => handleSave('draft')}
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save as draft'}
                </button>
                <button
                    onClick={() => handleSave('published')}
                    disabled={saving}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                    {saving ? 'Publishing…' : isEdit ? 'Save changes' : 'Publish review'}
                </button>
            </div>
        </div>
    )
}
