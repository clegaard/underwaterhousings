'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Something went wrong
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
                An unexpected error occurred. Please try again.
            </p>
            <button
                onClick={reset}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
                Try again
            </button>
        </div>
    )
}
