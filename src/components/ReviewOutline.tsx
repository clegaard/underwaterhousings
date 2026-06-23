'use client'

import { useState, useEffect } from 'react'

export interface OutlineSection {
    id: string
    label: string
    hasContent: boolean
    children?: OutlineSection[]
}

interface Props {
    sections: OutlineSection[]
}

function flattenOutlineSections(sections: OutlineSection[]): OutlineSection[] {
    const result: OutlineSection[] = []
    for (const s of sections) {
        result.push(s)
        if (s.children) {
            result.push(...flattenOutlineSections(s.children))
        }
    }
    return result
}

export default function ReviewOutline({ sections }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        const allSections = flattenOutlineSections(sections)
        const ids = allSections.map(s => s.id)
        if (ids.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id)
                        // Sync URL hash to match visible section (no history entry)
                        history.replaceState(null, '', `#${entry.target.id}`)
                    }
                }
            },
            { rootMargin: '-80px 0px -70% 0px' }
        )

        for (const id of ids) {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        }

        return () => observer.disconnect()
    }, [sections])

    if (sections.length === 0) return null

    function scrollTo(id: string) {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            // Update URL hash without adding to browser history
            history.replaceState(null, '', `#${id}`)
        }
    }

    return (
        <nav className="space-y-0.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                On this page
            </p>
            {sections.map(s => (
                <div key={s.id}>
                    <button
                        onClick={() => scrollTo(s.id)}
                        className={`block w-full text-left text-sm py-1.5 px-2.5 rounded-lg transition-colors truncate ${activeId === s.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                            : s.hasContent
                                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                : 'text-gray-300 dark:text-gray-600 cursor-default'
                            }`}
                    >
                        {s.label}
                    </button>
                    {s.children && s.children.length > 0 && (
                        <div className="ml-3 border-l border-gray-200 dark:border-gray-700 pl-2">
                            {s.children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => scrollTo(child.id)}
                                    className={`block w-full text-left text-xs py-1 px-2 rounded-md transition-colors truncate ${activeId === child.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-medium'
                                        : child.hasContent
                                            ? 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-300'
                                            : 'text-gray-300 dark:text-gray-600 cursor-default'
                                        }`}
                                >
                                    {child.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </nav>
    )
}
