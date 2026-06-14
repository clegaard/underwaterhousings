'use client'

import { useState, useEffect } from 'react'

export interface OutlineSection {
    id: string
    label: string
    hasContent: boolean
}

interface Props {
    sections: OutlineSection[]
}

export default function ReviewOutline({ sections }: Props) {
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        const ids = sections.map(s => s.id)
        if (ids.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id)
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
        }
    }

    return (
        <nav className="space-y-0.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                On this page
            </p>
            {sections.map(s => (
                <button
                    key={s.id}
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
            ))}
        </nav>
    )
}
