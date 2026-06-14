'use client'

import { useState, useCallback, useMemo } from 'react'
import RichReviewEditor from '@/components/RichReviewEditor'

// ─── Types ────────────────────────────────────────────────────────────────

interface ComponentInfo {
    type: 'camera' | 'lens' | 'housing' | 'port'
    label: string
}

export interface ReviewSections {
    introduction: string
    components: Array<{
        type: ComponentInfo['type']
        label: string
        content: string
    }>
    conclusion: string
}

interface Props {
    /** Serialized sections JSON, or legacy HTML body */
    value: string
    onChange: (serialized: string) => void
    userId?: number
    /** Camera system component filters for gallery photo picker */
    componentFilters?: {
        cameraId?: number
        lensId?: number
        housingId?: number
        portId?: number
        cameraSystemId?: number
    }
    /** Components to generate sections for */
    systemComponents: {
        cameras: string[]
        lenses: string[]
        housings: string[]
        ports: string[]
    }
}

const EMPTY_SECTIONS: ReviewSections = {
    introduction: '',
    components: [],
    conclusion: '',
}

function parseSections(body: string, systemComponents: Props['systemComponents']): ReviewSections {
    if (!body) return { ...EMPTY_SECTIONS, components: buildDefaultComponents(systemComponents) }
    try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed.introduction === 'string' && Array.isArray(parsed.components)) {
            // Ensure components match the current system
            const merged = buildDefaultComponents(systemComponents)
            for (const existing of parsed.components) {
                const match = merged.find(m => m.type === existing.type && m.label === existing.label)
                if (match) {
                    match.content = existing.content || ''
                }
            }
            return {
                introduction: parsed.introduction || '',
                components: merged,
                conclusion: parsed.conclusion || '',
            }
        }
    } catch { /* legacy HTML body — treat as sections with content in first component */ }

    // Legacy: put existing HTML content into introduction, generate empty component sections
    return {
        introduction: body,
        components: buildDefaultComponents(systemComponents),
        conclusion: '',
    }
}

function buildDefaultComponents(sc: Props['systemComponents']): ReviewSections['components'] {
    const result: ReviewSections['components'] = []
    for (const label of sc.cameras) {
        result.push({ type: 'camera', label, content: '' })
    }
    for (const label of sc.lenses) {
        result.push({ type: 'lens', label, content: '' })
    }
    for (const label of sc.housings) {
        result.push({ type: 'housing', label, content: '' })
    }
    for (const label of sc.ports) {
        result.push({ type: 'port', label, content: '' })
    }
    return result
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ReviewSectionEditor({ value, onChange, userId, componentFilters, systemComponents }: Props) {
    const sections = useMemo(() => parseSections(value, systemComponents), [value, systemComponents])

    const updateAndSerialize = useCallback((updated: ReviewSections) => {
        onChange(JSON.stringify(updated))
    }, [onChange])

    function setIntroduction(content: string) {
        updateAndSerialize({ ...sections, introduction: content })
    }

    function setComponentContent(index: number, content: string) {
        const updated = { ...sections, components: sections.components.map((c, i) => i === index ? { ...c, content } : c) }
        updateAndSerialize(updated)
    }

    function setConclusion(content: string) {
        updateAndSerialize({ ...sections, conclusion: content })
    }

    const hasAnyContent = sections.introduction ||
        sections.components.some(c => c.content) ||
        sections.conclusion

    return (
        <div className="space-y-6">
            {/* Introduction */}
            <SectionBlock
                label="Introduction"
                content={sections.introduction}
                onChange={setIntroduction}
                userId={userId}
                componentFilters={componentFilters}
                placeholder="Introduce your overall experience with this system…"
            />

            {/* Component sections */}
            {sections.components.map((comp, i) => (
                <SectionBlock
                    key={`${comp.type}-${i}`}
                    label={comp.label}
                    content={comp.content}
                    onChange={(c) => setComponentContent(i, c)}
                    userId={userId}
                    componentFilters={componentFilters}
                    placeholder={`Write about your experience with the ${comp.label}…`}
                />
            ))}

            {/* Conclusion */}
            <SectionBlock
                label="Conclusion"
                content={sections.conclusion}
                onChange={setConclusion}
                userId={userId}
                componentFilters={componentFilters}
                placeholder="Summarize your thoughts and would you recommend this system?"
            />
        </div>
    )
}

// ─── Section Block ──────────────────────────────────────────────────────────

function SectionBlock({
    label,
    content,
    onChange,
    userId,
    componentFilters,
    placeholder,
}: {
    label: string
    content: string
    onChange: (html: string) => void
    userId?: number
    componentFilters?: Props['componentFilters']
    placeholder: string
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
                    <RichReviewEditor
                        content={content}
                        onChange={onChange}
                        placeholder={placeholder}
                        userId={userId}
                        componentFilters={componentFilters}
                    />
                </div>
            )}
        </div>
    )
}
