'use client'

import { useState, useMemo, useCallback } from 'react'
import StarRating from './StarRating'

interface ComponentSection {
    type: string
    label: string
    content: string
    rating: number | null  // 1-5 or null (unrated)
    likes: string[]
    dislikes: string[]
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
            // Ensure likes/dislikes arrays exist on legacy data
            return {
                ...parsed,
                components: parsed.components.map((c: Partial<ComponentSection>) => ({
                    ...c,
                    likes: Array.isArray(c.likes) ? c.likes : [],
                    dislikes: Array.isArray(c.dislikes) ? c.dislikes : [],
                })),
            }
        }
    } catch { /* not JSON */ }

    const components: ComponentSection[] = []
    for (const c of systemComponents.cameras) components.push({ type: 'camera', label: c, content: '', rating: null, likes: [], dislikes: [] })
    for (const l of systemComponents.lenses) components.push({ type: 'lens', label: l, content: '', rating: null, likes: [], dislikes: [] })
    for (const h of systemComponents.housings) components.push({ type: 'housing', label: h, content: '', rating: null, likes: [], dislikes: [] })
    for (const p of systemComponents.ports) components.push({ type: 'port', label: p, content: '', rating: null, likes: [], dislikes: [] })
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
                    likes={comp.likes}
                    dislikes={comp.dislikes}
                    onRatingChange={(rating) => {
                        const updated = { ...sections, components: sections.components.map((c, idx) => idx === i ? { ...c, rating } : c) }
                        updateAndSerialize(updated)
                    }}
                    onLikesChange={(likes) => {
                        const updated = { ...sections, components: sections.components.map((c, idx) => idx === i ? { ...c, likes } : c) }
                        updateAndSerialize(updated)
                    }}
                    onDislikesChange={(dislikes) => {
                        const updated = { ...sections, components: sections.components.map((c, idx) => idx === i ? { ...c, dislikes } : c) }
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
    likes = [],
    dislikes = [],
    onLikesChange,
    onDislikesChange,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    rating?: number | null
    onRatingChange?: (rating: number | null) => void
    likes?: string[]
    dislikes?: string[]
    onLikesChange?: (likes: string[]) => void
    onDislikesChange?: (dislikes: string[]) => void
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
                    {/* Likes & Dislikes — optional bullet lists, gentle nudge */}
                    {onLikesChange && onDislikesChange && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            {/* Likes */}
                            <div>
                                <BulletListEditor
                                    label="What did you like?"
                                    items={likes}
                                    onChange={onLikesChange}
                                    tone="positive"
                                    placeholder="e.g. Great autofocus speed"
                                />
                            </div>
                            {/* Dislikes */}
                            <div>
                                <BulletListEditor
                                    label="What could be improved?"
                                    items={dislikes}
                                    onChange={onDislikesChange}
                                    tone="negative"
                                    placeholder="e.g. Battery life could be longer"
                                />
                            </div>
                        </div>
                    )}

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

// ─── Bullet List Editor ────────────────────────────────────────────────────

function BulletListEditor({
    label,
    items,
    onChange,
    tone,
    placeholder,
}: {
    label: string
    items: string[]
    onChange: (items: string[]) => void
    tone: 'positive' | 'negative'
    placeholder: string
}) {
    const [input, setInput] = useState('')

    function add() {
        const trimmed = input.trim()
        if (!trimmed) return
        onChange([...items, trimmed])
        setInput('')
    }

    function remove(index: number) {
        onChange(items.filter((_, i) => i !== index))
    }

    const colorClass = tone === 'positive'
        ? 'border-green-200 dark:border-green-800'
        : 'border-red-200 dark:border-red-800'

    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
            {/* Existing items */}
            {items.length > 0 && (
                <ul className="space-y-1 mb-2">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${tone === 'positive' ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className="flex-1">{item}</span>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label="Remove"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {/* Add input */}
            <div className="flex gap-1.5">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
                    placeholder={placeholder}
                    className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${colorClass}`}
                />
                <button
                    type="button"
                    onClick={add}
                    disabled={!input.trim()}
                    className="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                >
                    Add
                </button>
            </div>
        </div>
    )
}
