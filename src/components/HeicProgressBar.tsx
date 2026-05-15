'use client'

import type { ConversionStage, MultiFileProgress } from '@/lib/heicConvert'

const spinnerPath = 'M4 12a8 8 0 018-8v8H4z'

function Spinner() {
    return (
        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d={spinnerPath} />
        </svg>
    )
}

function Bar({ progress }: { progress: number }) {
    return (
        <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
            />
        </div>
    )
}

/**
 * Progress indicator for single-file HEIC → AVIF conversion.
 * Renders nothing when `stage` is null.
 */
export function HeicProgressBar({ stage }: { stage: ConversionStage | null }) {
    if (!stage) return null
    return (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
                <Spinner />
                <span className="text-xs font-semibold text-blue-700">Converting HEIC → AVIF</span>
            </div>
            <p className="text-[11px] text-blue-600 mb-2 pl-5">{stage.label}</p>
            <Bar progress={stage.progress} />
        </div>
    )
}

/**
 * Progress indicator for batch HEIC → AVIF conversion (multiple files).
 * Renders nothing when `progress` is null.
 */
export function HeicMultiProgressBar({ progress }: { progress: MultiFileProgress | null }) {
    if (!progress) return null
    const totalProgress = (progress.current + progress.stage.progress) / progress.total
    return (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 mb-3">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-xs font-semibold text-blue-700">Converting HEIC → AVIF</span>
                </div>
                {progress.total > 1 && (
                    <span className="text-xs text-blue-500">
                        {progress.current + 1} / {progress.total}
                    </span>
                )}
            </div>
            <p className="text-[11px] text-blue-600 mb-2 pl-5">{progress.stage.label}</p>
            <Bar progress={totalProgress} />
        </div>
    )
}
