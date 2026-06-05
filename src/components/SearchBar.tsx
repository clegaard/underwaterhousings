'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type SearchResultItem = {
    id: number
    name: string
    slug: string
    type: string
    subtitle: string
    href: string
    imageUrl: string | null
}

type SearchResults = {
    cameras: SearchResultItem[]
    lenses: SearchResultItem[]
    housings: SearchResultItem[]
    manufacturers: SearchResultItem[]
    ports: SearchResultItem[]
    portAdapters: SearchResultItem[]
    gears: SearchResultItem[]
}

const EMPTY_RESULTS: SearchResults = {
    cameras: [], lenses: [], housings: [], manufacturers: [],
    ports: [], portAdapters: [], gears: [],
}

const CATEGORY_LABELS: Record<keyof SearchResults, string> = {
    manufacturers: 'Manufacturers',
    cameras: 'Cameras',
    lenses: 'Lenses',
    housings: 'Housings',
    ports: 'Ports',
    portAdapters: 'Port Adapters',
    gears: 'Accessories',
}

const CATEGORY_ORDER: (keyof SearchResults)[] = [
    'manufacturers', 'cameras', 'lenses', 'housings', 'ports', 'portAdapters', 'gears',
]

const TYPE_ICONS: Record<string, string> = {
    manufacturer: '🏭',
    camera: '📷',
    lens: '🔭',
    housing: '🌊',
    port: '🔩',
    portAdapter: '🔄',
    gear: '🎒',
}

function flattenResults(results: SearchResults): SearchResultItem[] {
    return CATEGORY_ORDER.flatMap(cat => results[cat])
}

export default function SearchBar({ placeholder = 'Search cameras, lenses, housings, manufacturers…', autoFocus = false, onNavigate, className, triggerFocus }: {
    placeholder?: string
    autoFocus?: boolean
    onNavigate?: () => void
    className?: string
    triggerFocus?: number
}) {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    // Track which images have failed to load so we can show emoji fallback
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

    // Focus input when triggerFocus changes (used by Cmd+K shortcut)
    useEffect(() => {
        if (triggerFocus !== undefined && triggerFocus > 0) {
            inputRef.current?.focus()
        }
    }, [triggerFocus])

    const flatItems = flattenResults(results)
    const hasResults = flatItems.length > 0

    // Fetch search results with debounce
    const fetchResults = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (abortRef.current) abortRef.current.abort()

        if (q.length < 2) {
            setResults(EMPTY_RESULTS)
            setLoading(false)
            setOpen(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            const controller = new AbortController()
            abortRef.current = controller
            setLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
                if (res.ok) {
                    const data = await res.json()
                    setResults(data)
                    setOpen(true)
                    setActiveIndex(-1)
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') console.error('Search error:', err)
            } finally {
                setLoading(false)
            }
        }, 250)
    }, [])

    useEffect(() => {
        fetchResults(query)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (abortRef.current) abortRef.current.abort()
        }
    }, [query, fetchResults])

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function navigate(item: SearchResultItem) {
        setOpen(false)
        setQuery('')
        onNavigate?.()
        router.push(item.href)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeIndex >= 0 && flatItems[activeIndex]) {
                navigate(flatItems[activeIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
            setActiveIndex(-1)
        }
    }

    // Compute flat index offset per category for keyboard nav highlighting
    const flatIndexMap = new Map<string, number>() // key: `${cat}-${id}` → flat index
    let fi = 0
    for (const cat of CATEGORY_ORDER) {
        for (const item of results[cat]) {
            flatIndexMap.set(`${cat}-${item.id}`, fi++)
        }
    }

    return (
        <div className={`relative w-full${className ? ` ${className}` : ''}`}>
            {/* Search input */}
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    {loading ? (
                        <svg className="h-5 w-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (hasResults) setOpen(true) }}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 pl-12 pr-4 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && query.length >= 2 && (
                <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
                >
                    {!hasResults && !loading ? (
                        <div className="px-5 py-8 text-center text-sm text-gray-400">
                            No results for <span className="font-medium text-gray-600">&ldquo;{query}&rdquo;</span>
                        </div>
                    ) : (
                        <div className="py-2">
                            {CATEGORY_ORDER.map(cat => {
                                const items = results[cat]
                                if (!items.length) return null
                                return (
                                    <div key={cat}>
                                        <div className="px-4 pt-3 pb-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                                {CATEGORY_LABELS[cat]}
                                            </span>
                                        </div>
                                        {items.map(item => {
                                            const idx = flatIndexMap.get(`${cat}-${item.id}`) ?? -1
                                            const isActive = idx === activeIndex
                                            return (
                                                <button
                                                    key={`${cat}-${item.id}`}
                                                    onMouseDown={e => { e.preventDefault(); navigate(item) }}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                >
                                                    {/* Thumbnail or emoji icon */}
                                                    {item.imageUrl && !brokenImages.has(`${cat}-${item.id}`) ? (
                                                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.name}
                                                                fill
                                                                sizes="32px"
                                                                className="object-cover"
                                                                onError={() => setBrokenImages(prev => new Set(prev).add(`${cat}-${item.id}`))}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700/50 text-base leading-none" aria-hidden>
                                                            {TYPE_ICONS[item.type] ?? '•'}
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                                        {item.subtitle && (
                                                            <div className="truncate text-xs text-gray-400">{item.subtitle}</div>
                                                        )}
                                                    </div>
                                                    <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
