'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteReviewButton({ reviewId }: { reviewId: number }) {
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)
    const [deleting, setDeleting] = useState(false)

    async function handleDelete() {
        setDeleting(true)
        try {
            const res = await fetch(`/api/reviews?id=${reviewId}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                alert(data.error ?? 'Failed to delete review')
                return
            }
            router.push('/reviews')
            router.refresh()
        } catch {
            alert('Network error — please try again')
        } finally {
            setDeleting(false)
        }
    }

    if (confirming) {
        return (
            <span className="inline-flex items-center gap-2">
                <span className="text-xs text-gray-500">Are you sure?</span>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="text-xs text-gray-400 hover:text-gray-600"
                >
                    Cancel
                </button>
            </span>
        )
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
            Delete
        </button>
    )
}
