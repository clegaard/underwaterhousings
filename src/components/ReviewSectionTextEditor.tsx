'use client'

import { useState, useMemo, useCallback } from 'react'
import StarRating from './StarRating'

interface ComponentSection {
    type: string
    label: string
    content: string
    rating: number | null  // 1-5 or null (unrated)
}

interface Props {
    value: string // JSON-serialized sections
    onChange: (json: string) => void
    systemComponents: {
        cameras: string[]
        lenses: string[]
        housings: string[]
        ports: string[]
    }
}

function parseSections(body: string, systemComponents: Props['systemComponents']): {
    overallImpression: string
    components: ComponentSection[]
} {
    try {
        const parsed = JSON.parse(body)
        if (parsed && Array.isArray(parsed.components)) {
            // Migrate legacy: merge introduction + conclusion into overallImpression
            let overallImpression = parsed.overallImpression || ''
            if (!overallImpression) {
                const intro = typeof parsed.introduction === 'string' ? parsed.introduction : ''
                const conclusion = typeof parsed.conclusion === 'string' ? parsed.conclusion : ''
                if (intro || conclusion) {
                    overallImpression = [intro, conclusion].filter(Boolean).join('\n\n')
                }
            }
            return { overallImpression, components: parsed.components }
        }
    } catch { /* not JSON */ }

    const components: ComponentSection[] = []
    for (const c of systemComponents.cameras) components.push({ type: 'camera', label: c, content: '', rating: null })
    for (const l of systemComponents.lenses) components.push({ type: 'lens', label: l, content: '', rating: null })
    for (const h of systemComponents.housings) components.push({ type: 'housing', label: h, content: '', rating: null })
    for (const p of systemComponents.ports) components.push({ type: 'port', label: p, content: '', rating: null })
    return { overallImpression: '', components }
}

export default function ReviewSectionTextEditor({ value, onChange, systemComponents }: Props) {
    const sections = useMemo(() => parseSections(value, systemComponents), [value, systemComponents])

    const updateAndSerialize = useCallback((updated: {
        overallImpression: string
        components: ComponentSection[]
    }) => {
        onChange(JSON.stringify(updated))
    }, [onChange])

    return (
        <div className="space-y-6">
            {/* Components heading */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Components</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>

            {/* Component sections */}
            {sections.components.map((comp, i) => (
                <SectionTextarea
                    key={`${comp.type}-${i}`}
                    label={comp.label}
                    placeholder={`Write about your experience with the ${comp.label}…`}
                    value={comp.content}
                    rating={comp.rating}
                    onRatingChange={(rating) => {
                        const updated = { ...sections, components: sections.components.map((c, idx) => idx === i ? { ...c, rating } : c) }
                        updateAndSerialize(updated)
                    }}
                    onChange={(v) => {
                        const updated = { ...sections, components: sections.components.map((c, idx) => idx === i ? { ...c, content: v } : c) }
                        updateAndSerialize(updated)
                    }}
                />
            ))}

            {/* Overall Impression — merged intro + conclusion, placed at the end */}
            <SectionTextarea
                label="Overall Impression"
                placeholder="Share your overall experience with this system — what stood out and would you recommend it?"
                value={sections.overallImpression}
                onChange={(v) => updateAndSerialize({ ...sections, overallImpression: v })}
            />
        </div>
    )
}

// ─── Section Textarea ─────────────────────────────────────────────────────

function SectionTextarea({
    label,
    value,
    onChange,
    placeholder,
    rating,
    onRatingChange,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    rating?: number | null
    onRatingChange?: (rating: number | null) => void
}) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div
                role="button"
                tabIndex={0}
                onClick={() => setCollapsed(!collapsed)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed) } }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
                <div className="flex items-center gap-3">
                    {onRatingChange ? (
                        <StarRating
                            value={rating ?? null}
                            onChange={onRatingChange}
                            size="sm"
                            label={`${label} rating`}
                        />
                    ) : (
                        <span className="w-[160px]" aria-hidden="true" />
                    )}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${collapsed ? '' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {!collapsed && (
                <div className="px-4 pb-4">
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={5}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                </div>
            )}
        </div>
    )
}
