'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

// ─── Public types (consumed by GalleryPageClient) ────────────────────────────

export type TokenType = 'camera' | 'lens' | 'housing' | 'port' | 'user'

export interface SearchToken {
    type: TokenType
    /** For gear tokens: the entity slug. For user tokens: userId as a string. */
    slug: string
    label: string
}

export interface SuggestionPool {
    cameras: Array<[string, string]>   // [slug, displayName]
    lenses: Array<[string, string]>
    housings: Array<[string, string]>
    ports: Array<[string, string]>
    users: Array<[string, string]>     // [userId string, displayName]
}

// ─── Metadata per token type ──────────────────────────────────────────────────

const TYPE_META: Record<TokenType, { label: string; chip: string; dot: string }> = {
    camera:  { label: 'Camera',  chip: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
    lens:    { label: 'Lens',    chip: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
    housing: { label: 'Housing', chip: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
    port:    { label: 'Port',    chip: 'bg-teal-50 text-teal-700 border-teal-200',    dot: 'bg-teal-500' },
    user:    { label: 'User',    chip: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
}

const TYPE_ORDER: TokenType[] = ['camera', 'lens', 'housing', 'port', 'user']

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    tokens: SearchToken[]
    pool: SuggestionPool
    onAdd: (token: SearchToken) => void
    onRemove: (type: TokenType) => void
    resultCount: number
    totalCount: number
}

export default function GallerySearchBar({ tokens, pool, onAdd, onRemove, resultCount, totalCount }: Props) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [activeIdx, setActiveIdx] = useState(-1)

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const activeTypes = useMemo(() => new Set(tokens.map(t => t.type)), [tokens])

    const poolMap: Record<TokenType, Array<[string, string]>> = {
        camera: pool.cameras,
        lens: pool.lenses,
        housing: pool.housings,
        port: pool.ports,
        user: pool.users,
    }

    // Flat sorted list of matching suggestions (excludes already-active types)
    const suggestions = useMemo((): SearchToken[] => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        const results: SearchToken[] = []
        for (const type of TYPE_ORDER) {
            if (activeTypes.has(type)) continue
            for (const [slug, label] of poolMap[type]) {
                if (label.toLowerCase().includes(q)) {
                    results.push({ type, slug, label })
                }
            }
        }
        return results.slice(0, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, pool, activeTypes])

    // Group for rendering with headers
    const grouped = useMemo(() => {
        const g: Partial<Record<TokenType, SearchToken[]>> = {}
        for (const s of suggestions) {
            if (!g[s.type]) g[s.type] = []
            g[s.type]!.push(s)
        }
        return g
    }, [suggestions])

    // Reset highlighted item when suggestion list changes
    useEffect(() => { setActiveIdx(-1) }, [suggestions])

    // Close dropdown on outside click/tap
    useEffect(() => {
        function handlePointerDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handlePointerDown)
        return () => document.removeEventListener('mousedown', handlePointerDown)
    }, [])

    function commit(suggestion: SearchToken) {
        onAdd(suggestion)
        setQuery('')
        setIsOpen(false)
        inputRef.current?.focus()
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIdx(i => Math.max(i - 1, -1))
                break
            case 'Enter':
                e.preventDefault()
                if (activeIdx >= 0 && suggestions[activeIdx]) commit(suggestions[activeIdx])
                break
            case 'Escape':
                setIsOpen(false)
                break
            case 'Backspace':
                if (query === '' && tokens.length > 0) {
                    onRemove(tokens[tokens.length - 1].type)
                }
                break
        }
    }

    const showCount = tokens.length > 0 || resultCount !== totalCount

    return (
        <div ref={containerRef} className="relative">
            {/* ── Token + input row ── */}
            <div
                className="flex flex-wrap items-center gap-1.5 min-h-11.5 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow"
                onClick={() => inputRef.current?.focus()}
            >
                {/* Search icon */}
                <svg className="w-4 h-4 text-gray-400 shrink-0 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                </svg>

                {/* Active token chips */}
                {tokens.map(token => {
                    const meta = TYPE_META[token.type]
                    return (
                        <span
                            key={token.type}
                            className={`inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded-full border text-sm font-medium whitespace-nowrap ${meta.chip}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 ml-0.5">{meta.label}</span>
                            <span className="mx-0.5">{token.label}</span>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onRemove(token.type) }}
                                className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors shrink-0"
                                aria-label={`Remove ${token.label} filter`}
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    )
                })}

                {/* Text input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => { if (query) setIsOpen(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder={tokens.length === 0 ? 'Filter by camera, lens, housing, port or user…' : 'Add another filter…'}
                    className="flex-1 min-w-40 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                    style={{ fontSize: '16px' }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                />

                {/* Clear all button */}
                {(tokens.length > 0 || query) && (
                    <button
                        type="button"
                        onClick={() => {
                            tokens.forEach(t => onRemove(t.type))
                            setQuery('')
                            setIsOpen(false)
                            inputRef.current?.focus()
                        }}
                        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                        aria-label="Clear all filters"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Photo count */}
            {showCount && (
                <p className="mt-1.5 text-xs text-gray-500 px-1">
                    {resultCount === totalCount
                        ? `${totalCount} photo${totalCount !== 1 ? 's' : ''}`
                        : `${resultCount} of ${totalCount} photo${totalCount !== 1 ? 's' : ''}`}
                </p>
            )}

            {/* ── Autocomplete dropdown ── */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                    {TYPE_ORDER.filter(type => grouped[type]).map(type => (
                        <div key={type}>
                            <div className="sticky top-0 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50/90 backdrop-blur-sm border-b border-gray-100">
                                {TYPE_META[type].label}
                            </div>
                            {grouped[type]!.map(s => {
                                const flatIdx = suggestions.indexOf(s)
                                const isActive = flatIdx === activeIdx
                                return (
                                    <button
                                        key={`${s.type}:${s.slug}`}
                                        type="button"
                                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                                            isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                        onMouseEnter={() => setActiveIdx(flatIdx)}
                                        onMouseDown={e => { e.preventDefault(); commit(s) }}
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_META[type].dot}`} />
                                        {s.label}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
