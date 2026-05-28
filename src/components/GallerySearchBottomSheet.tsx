'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { SearchToken, SuggestionPool, TokenType, TYPE_META, TYPE_ORDER } from './GallerySearchBar'
import BottomSheet from './BottomSheet'

interface Props {
    isOpen: boolean
    onClose: () => void
    tokens: SearchToken[]
    pool: SuggestionPool
    onAdd: (token: SearchToken) => void
    onRemove: (type: TokenType) => void
    resultCount: number
    totalCount: number
}

export default function GallerySearchBottomSheet({
    isOpen,
    onClose,
    tokens,
    pool,
    onAdd,
    onRemove,
    resultCount,
    totalCount,
}: Props) {
    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-focus the input when the sheet opens; clear query when it closes.
    useEffect(() => {
        if (!isOpen) {
            setQuery('')
            return
        }
        const t = setTimeout(() => inputRef.current?.focus(), 100)
        return () => clearTimeout(t)
    }, [isOpen])

    // ── Suggestion building ──────────────────────────────────────────────────

    const activeTypes = useMemo(() => new Set(tokens.map(t => t.type)), [tokens])

    const poolMap: Record<TokenType, Array<[string, string]>> = {
        camera: pool.cameras,
        lens: pool.lenses,
        housing: pool.housings,
        port: pool.ports,
        user: pool.users,
    }

    const suggestions = useMemo((): SearchToken[] => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        const out: SearchToken[] = []
        for (const type of TYPE_ORDER) {
            if (activeTypes.has(type)) continue
            for (const [slug, label] of poolMap[type]) {
                if (label.toLowerCase().includes(q)) out.push({ type, slug, label })
            }
        }
        return out.slice(0, 50)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, pool, activeTypes])

    const grouped = useMemo(() => {
        const g: Partial<Record<TokenType, SearchToken[]>> = {}
        for (const s of suggestions) {
            if (!g[s.type]) g[s.type] = []
            g[s.type]!.push(s)
        }
        return g
    }, [suggestions])

    function commit(s: SearchToken) {
        onAdd(s)
        setQuery('')
        inputRef.current?.focus()
    }

    const showCount = tokens.length > 0 || resultCount !== totalCount

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} height="75dvh">
            {/* ── Search input ──────────────────────────────────────── */}
            <div className="px-4 pt-2 pb-3 shrink-0">
                <div
                    className="flex flex-wrap items-center gap-1.5 min-h-12 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl cursor-text"
                    onClick={() => inputRef.current?.focus()}
                >
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                    </svg>

                    {tokens.map(token => {
                        const meta = TYPE_META[token.type]
                        return (
                            <span
                                key={token.type}
                                className={`inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-full border text-sm font-medium whitespace-nowrap ${meta.chip}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
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

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Camera, lens, housing, port, user\u2026"
                        className="flex-1 min-w-32 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                        style={{ fontSize: '16px' }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        suppressHydrationWarning
                    />

                    {showCount && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap pr-1">
                            {resultCount === totalCount
                                ? `${resultCount}`
                                : `${resultCount}/${totalCount}`}
                        </span>
                    )}

                    {(tokens.length > 0 || query) && (
                        <button
                            type="button"
                            onClick={() => { tokens.forEach(t => onRemove(t.type)); setQuery(''); inputRef.current?.focus() }}
                            className="shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                            aria-label="Clear all filters"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Suggestions / empty states ────────────────────────── */}
            <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                {query.trim().length >= 1 ? (
                    suggestions.length > 0 ? (
                        <div className="pb-4">
                            {TYPE_ORDER.filter(type => grouped[type]).map(type => (
                                <div key={type}>
                                    <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-white/10">
                                        {TYPE_META[type].label}
                                    </div>
                                    {grouped[type]!.map(s => (
                                        <button
                                            key={`${s.type}:${s.slug}`}
                                            type="button"
                                            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 transition-colors"
                                            onMouseDown={e => { e.preventDefault(); commit(s) }}
                                            onTouchEnd={e => { e.preventDefault(); commit(s) }}
                                        >
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_META[type].dot}`} />
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-sm text-gray-400">
                            No matches for{' '}
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                &ldquo;{query}&rdquo;
                            </span>
                        </div>
                    )
                ) : (
                    <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                        {tokens.length > 0
                            ? `Showing ${resultCount} of ${totalCount} photos`
                            : 'Type to filter by camera, lens, housing, port or photographer'}
                    </div>
                )}
            </div>
        </BottomSheet>
    )
}
