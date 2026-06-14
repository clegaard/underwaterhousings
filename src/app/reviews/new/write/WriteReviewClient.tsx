'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RichReviewEditor, { generateDefaultContent } from '@/components/RichReviewEditor'

interface ReviewData {
    id: number
    title: string
    body: string
    cameraSystemId: number
    systemLabel: string
    systemComponents: {
        cameras: string[]
        lenses: string[]
        housings: string[]
        ports: string[]
    }
}

export default function WriteReviewClient({ review, userId, mode = 'write' }: { review: ReviewData; userId: number; mode?: 'write' | 'edit' }) {
    const router = useRouter()
    const [title, setTitle] = useState(
        mode === 'write' && review.title === 'Untitled Review' ? '' : review.title
    )
    const [body, setBody] = useState(review.body)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEdit = mode === 'edit'

    // Gallery filtering: show only photos taken with this specific camera system
    const componentFilters = { cameraSystemId: review.cameraSystemId }

    function generateContent() {
        setBody(generateDefaultContent(review.systemComponents))
    }

    async function handleSave(status: 'draft' | 'published') {
        if (!title.trim()) { setError('Please enter a title.'); return }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`/api/reviews?id=${review.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    body,
                    status,
                }),
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

    const hasContent = !!body

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

            {/* Camera system (read-only) */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Camera System</h2>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 text-sm">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{review.systemLabel}</span>
                </span>
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review title</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. My experience with this setup"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Generate content button */}
            {!hasContent && (
                <button
                    onClick={generateContent}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                    Generate section headings from system components
                </button>
            )}

            {/* Editor */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your review</label>
                <RichReviewEditor
                    content={body}
                    onChange={setBody}
                    placeholder="Write about your experience with each component…"
                    userId={userId}
                    componentFilters={componentFilters}
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
                    disabled={saving || !body}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                    {saving ? 'Publishing…' : isEdit ? 'Save changes' : 'Publish review'}
                </button>
            </div>
        </div>
    )
}
