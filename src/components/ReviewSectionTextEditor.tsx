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
    introduction: string
    components: ComponentSection[]
    conclusion: string
} {
    try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed.introduction === 'string' && Array.isArray(parsed.components)) {
            return parsed
        }
    } catch { /* not JSON */ }

    const components: ComponentSection[] = []
    for (const c of systemComponents.cameras) components.push({ type: 'camera', label: c, content: '', rating: null })
    for (const l of systemComponents.lenses) components.push({ type: 'lens', label: l, content: '', rating: null })
    for (const h of systemComponents.housings) components.push({ type: 'housing', label: h, content: '', rating: null })
    for (const p of systemComponents.ports) components.push({ type: 'port', label: p, content: '', rating: null })
    return { introduction: '', components, conclusion: '' }
}

export default function ReviewSectionTextEditor({ value, onChange, systemComponents }: Props) {
    const sections = useMemo(() => parseSections(value, systemComponents), [value, systemComponents])

    const updateAndSerialize = useCallback((updated: {
        introduction: string
        components: ComponentSection[]
        conclusion: string
    }) => {
        onChange(JSON.stringify(updated))
    }, [onChange])

    return (
        <div className="space-y-6">
            {/* Introduction */}
            <SectionTextarea
                label="Introduction"
                placeholder="Introduce your overall experience with this system…"
                value={sections.introduction}
                onChange={(v) => updateAndSerialize({ ...sections, introduction: v })}
            />

            {/* Components heading */}
            <div className="flex items-center gap-3 pt-2">
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

            {/* Conclusion */}
            <SectionTextarea
                label="Conclusion"
                placeholder="Summarize your thoughts — would you recommend this system?"
                value={sections.conclusion}
                onChange={(v) => updateAndSerialize({ ...sections, conclusion: v })}
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
            <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!collapsed && (
                <div className="px-4 pb-4">
                    {onRatingChange && (
                        <div className="mb-3">
                            <StarRating
                                value={rating ?? null}
                                onChange={onRatingChange}
                                size="sm"
                                label={`${label} rating`}
                            />
                        </div>
                    )}
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={6}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                </div>
            )}
        </div>
    )
}
