'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserSystem {
    id: number
    name: string
    camera: { name: string; brand: { name: string } }
    lens: { name: string } | null
    housing: { name: string; manufacturer: { name: string } } | null
    port: { name: string } | null
    _count: { reviews: number }
}

export default function NewReviewClient({ userSystems, userId }: { userSystems: UserSystem[]; userId: number }) {
    const router = useRouter()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleContinue() {
        if (!selectedId) { setError('Please select a camera system to review.'); return }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Untitled Review',
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

            {userSystems.length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    You don&apos;t have any camera systems without a review.{' '}
                    <Link href={`/users/${userId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        Create one on your profile
                    </Link>
                    {' '}first.
                </div>
            ) : (
                <div className="space-y-2">
                    {userSystems.map(s => {
                        const label = [
                            `${s.camera.brand.name} ${s.camera.name}`,
                            s.lens?.name,
                            s.housing ? `${s.housing.manufacturer.name} ${s.housing.name}` : null,
                            s.port?.name,
                        ].filter(Boolean).join(' · ')
                        const isSelected = selectedId === s.id
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedId(s.id)}
                                className={`w-full text-left border rounded-xl p-4 transition-colors ${isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}
                            >
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                            </button>
                        )
                    })}
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

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
        </div>
    )
}
