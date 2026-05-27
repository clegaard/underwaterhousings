'use client'

import React, { useState, useRef, useEffect } from 'react'

export type SortOption = 'date' | 'rating'

export interface FilterState {
    camera: string | null
    lens: string | null
    housing: string | null
    port: string | null
}

export interface FilterPool {
    cameras: Array<[string, string]>
    lenses: Array<[string, string]>
    housings: Array<[string, string]>
    ports: Array<[string, string]>
}

interface Props {
    sortBy: SortOption
    filters: FilterState
    pool: FilterPool
    resultCount: number
    totalCount: number
    onSortChange: (sort: SortOption) => void
    onFilterChange: (key: keyof FilterState, value: string | null) => void
    onReset: () => void
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: string
    options: Array<[string, string]>
    onChange: (v: string) => void
}) {
    if (options.length === 0) return null
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full appearance-none text-sm border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                    <option value="">All {label}s</option>
                    {options.map(([slug, name]) => (
                        <option key={slug} value={slug}>{name}</option>
                    ))}
                </select>
                <svg
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    )
}

function TriggerButton({ onClick, activeCount }: { onClick: () => void; activeCount: number }) {
    return (
        <button
            onClick={onClick}
            aria-label="Sort and filter photos"
            className={`flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-medium border shadow-sm transition-colors ${activeCount > 0
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
        >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>{activeCount > 0 ? `${activeCount} active` : 'Sort & Filter'}</span>
            {activeCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-xs font-bold leading-none">
                    {activeCount}
                </span>
            )}
        </button>
    )
}

function PanelContent({
    sortBy,
    filters,
    pool,
    resultCount,
    onSortChange,
    onFilterChange,
    onReset,
    onClose,
}: Props & { onClose: () => void }) {
    return (
        <div className="flex flex-col">
            <div className="overflow-y-auto px-5 py-4 space-y-6" style={{ maxHeight: 'calc(85vh - 5rem)' }}>

                {/* ── Sort by ────────────────────────────────── */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort by</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {(['date', 'rating'] as SortOption[]).map(opt => (
                            <button
                                key={opt}
                                onClick={() => onSortChange(opt)}
                                className={`py-2.5 px-3 text-sm font-medium rounded-xl border-2 transition-colors text-center ${sortBy === opt
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {opt === 'date' ? 'Upload date' : 'Rating'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Filters ────────────────────────────────── */}
                {(pool.cameras.length > 0 || pool.lenses.length > 0 || pool.housings.length > 0 || pool.ports.length > 0) && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                            </svg>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</h3>
                        </div>
                        <div className="space-y-3">
                            <FilterSelect
                                label="Camera"
                                value={filters.camera ?? ''}
                                options={pool.cameras}
                                onChange={v => onFilterChange('camera', v || null)}
                            />
                            <FilterSelect
                                label="Lens"
                                value={filters.lens ?? ''}
                                options={pool.lenses}
                                onChange={v => onFilterChange('lens', v || null)}
                            />
                            <FilterSelect
                                label="Housing"
                                value={filters.housing ?? ''}
                                options={pool.housings}
                                onChange={v => onFilterChange('housing', v || null)}
                            />
                            <FilterSelect
                                label="Port"
                                value={filters.port ?? ''}
                                options={pool.ports}
                                onChange={v => onFilterChange('port', v || null)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
                <button
                    onClick={onReset}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={onClose}
                    className="flex-2 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                    Show {resultCount} {resultCount === 1 ? 'result' : 'results'}
                </button>
            </div>
        </div>
    )
}

const DISMISS_THRESHOLD = 80

export default function GalleryFilterPanel(props: Props) {
    const { sortBy, filters } = props
    const [isOpen, setIsOpen] = useState(false)
    const desktopRef = useRef<HTMLDivElement>(null)

    // Swipe-to-dismiss
    const [swipeDelta, setSwipeDelta] = useState(0)
    const touchStartY = useRef(0)

    const activeCount =
        (sortBy !== 'date' ? 1 : 0) +
        Object.values(filters).filter(Boolean).length

    // Close desktop dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isOpen])

    // Escape key closes panel
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false)
        }
        if (isOpen) document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen])

    function handleTouchStart(e: React.TouchEvent) {
        touchStartY.current = e.touches[0].clientY
    }

    function handleTouchMove(e: React.TouchEvent) {
        const delta = e.touches[0].clientY - touchStartY.current
        setSwipeDelta(Math.max(0, delta))
    }

    function handleTouchEnd() {
        if (swipeDelta >= DISMISS_THRESHOLD) setIsOpen(false)
        setSwipeDelta(0)
    }

    const panelProps = { ...props, onClose: () => setIsOpen(false) }

    // Inline style: overrides the Tailwind translate class during an active swipe
    const sheetStyle: React.CSSProperties = {
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        ...(swipeDelta > 0 ? { transform: `translateY(${swipeDelta}px)`, transition: 'none' } : {}),
    }

    return (
        <>
            {/* ══ Touch devices (pointer: coarse) — fixed FAB + bottom sheet ══ */}
            <div className="hidden pointer-coarse:block">
                {/* Fixed trigger — top-17 sits just below the sticky nav (h-16) */}
                <div className="fixed top-17 left-4 z-39">
                    <TriggerButton onClick={() => setIsOpen(true)} activeCount={activeCount} />
                </div>

                {/* Backdrop */}
                <div
                    className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={() => setIsOpen(false)}
                />

                {/* Bottom sheet */}
                <div
                    className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'
                        }`}
                    style={sheetStyle}
                >
                    {/* Drag handle — swipe down here to dismiss */}
                    <div
                        className="flex justify-center py-3 shrink-0 touch-none cursor-grab active:cursor-grabbing"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className={`w-10 h-1.5 rounded-full transition-colors ${swipeDelta > DISMISS_THRESHOLD / 2 ? 'bg-gray-400' : 'bg-gray-300'
                                }`}
                        />
                    </div>
                    <PanelContent {...panelProps} />
                </div>
            </div>

            {/* ══ Non-touch (pointer: fine) — inline button + dropdown ══ */}
            <div className="relative pointer-coarse:hidden" ref={desktopRef}>
                <TriggerButton onClick={() => setIsOpen(prev => !prev)} activeCount={activeCount} />

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <PanelContent {...panelProps} />
                    </div>
                )}
            </div>
        </>
    )
}
