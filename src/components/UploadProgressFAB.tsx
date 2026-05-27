'use client'

import { useState, useEffect, useRef } from 'react'
import { useUploadQueue, UploadJob } from '@/lib/UploadQueueContext'

const CIRCUMFERENCE = 2 * Math.PI * 22  // SVG circle r=22 inside 56×56 viewBox

function overallProgress(jobs: UploadJob[]): number {
    if (jobs.length === 0) return 0
    return Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length)
}

function JobIcon({ job }: { job: UploadJob }) {
    if (job.status === 'done') {
        return (
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
        )
    }
    if (job.status === 'error') {
        return (
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
        )
    }
    return (
        <svg className="w-4 h-4 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    )
}

export default function UploadProgressFAB() {
    const { jobs, dismiss, dismissCompleted } = useUploadQueue()
    const [expanded, setExpanded] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const hasJobs = jobs.length > 0
    const progress = overallProgress(jobs)
    const allDone = hasJobs && jobs.every(j => j.status !== 'uploading')
    const hasErrors = jobs.some(j => j.status === 'error')
    const uploadingCount = jobs.filter(j => j.status === 'uploading').length

    // Auto-expand when a new upload job arrives
    useEffect(() => {
        if (jobs.some(j => j.status === 'uploading')) setExpanded(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs.length])

    // Collapse on outside click
    useEffect(() => {
        if (!expanded) return
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setExpanded(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [expanded])

    if (!hasJobs) return null

    const dashOffset = CIRCUMFERENCE * (1 - progress / 100)
    const fabBg = hasErrors ? 'bg-red-500' : allDone ? 'bg-green-500' : 'bg-blue-600'

    return (
        <div
            ref={containerRef}
            className="fixed left-5 z-40 sm:left-6"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
            {/* Expanded panel — appears above the button */}
            {expanded && (
                <div className="absolute left-0 bottom-[calc(100%+12px)] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-800">
                            {allDone
                                ? 'Uploads complete'
                                : `Uploading${uploadingCount > 0 ? ` · ${uploadingCount} remaining` : ''}…`}
                        </span>
                        {allDone && (
                            <button
                                onClick={dismissCompleted}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Job list */}
                    <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                        {jobs.map(job => (
                            <li key={job.id} className="flex items-center gap-3 px-4 py-3">
                                <JobIcon job={job} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 truncate">{job.filename}</p>
                                    {job.status === 'uploading' && (
                                        <div className="mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                    )}
                                    {job.status === 'error' && (
                                        <p className="text-xs text-red-500 mt-0.5 truncate">{job.errorMessage}</p>
                                    )}
                                    {job.status === 'done' && (
                                        <p className="text-xs text-green-600 mt-0.5">Uploaded successfully</p>
                                    )}
                                </div>
                                {job.status !== 'uploading' && (
                                    <button
                                        onClick={() => dismiss(job.id)}
                                        className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded-full hover:bg-gray-100 shrink-0"
                                        aria-label="Dismiss"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* FAB button with circular progress ring */}
            <button
                onClick={() => setExpanded(e => !e)}
                aria-label={expanded ? 'Hide upload progress' : 'Show upload progress'}
                className={`
                    relative w-14 h-14 rounded-full flex items-center justify-center
                    ${fabBg} text-white shadow-lg hover:shadow-xl
                    transition-all duration-200 ease-out active:scale-95
                    ${expanded ? 'shadow-[0_0_0_6px_rgba(59,130,246,0.18)] scale-105' : ''}
                `}
            >
                {/* SVG progress ring */}
                <svg
                    className="absolute inset-0 -rotate-90"
                    width="56"
                    height="56"
                    viewBox="0 0 56 56"
                    aria-hidden="true"
                >
                    {/* Track */}
                    <circle
                        cx="28" cy="28" r="22"
                        fill="none"
                        stroke="white"
                        strokeOpacity="0.25"
                        strokeWidth="3"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="28" cy="28" r="22"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 300ms ease' }}
                    />
                </svg>

                {/* Center: % while uploading, checkmark when done */}
                {allDone ? (
                    <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <span className="text-xs font-bold relative z-10 tabular-nums">{progress}%</span>
                )}
            </button>
        </div>
    )
}
