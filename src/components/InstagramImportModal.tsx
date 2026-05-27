'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { InstagramMediaItem, InstagramImage } from '@/app/api/linked-services/instagram/media/route'
import { extractMetaFromCaption } from '@/lib/captionMeta'

interface UserRig {
    id: number
    name: string
    isActive: boolean
    camera: { name: string; brand: { name: string } }
}

interface Selection {
    /** Individual image ID (child ID for carousels) */
    imageId: string
    mediaUrl: string
    caption?: string
    timestamp: string
    width: number
    height: number
}

interface Props {
    isOpen: boolean
    onClose: () => void
    currentUserId?: number
}

export default function InstagramImportModal({ isOpen, onClose, currentUserId }: Props) {
    const router = useRouter()

    const [view, setView] = useState<'loading' | 'not_connected' | 'grid' | 'carousel' | 'importing' | 'done' | 'error'>('loading')
    const [media, setMedia] = useState<InstagramMediaItem[]>([])
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
    const [selected, setSelected] = useState<Map<string, Selection>>(new Map())
    const [expandedCarousel, setExpandedCarousel] = useState<InstagramMediaItem | null>(null)
    const [userRigs, setUserRigs] = useState<UserRig[]>([])
    const [rigId, setRigId] = useState('')
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
    const [error, setError] = useState<string | null>(null)
    // Pagination
    const [cursor, setCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)
    // Maps imageId → {width, height} populated as thumbnails load in the browser
    const dimensionsRef = useRef<Map<string, { width: number; height: number }>>(new Map())

    const reset = useCallback(() => {
        setView('loading')
        setMedia([])
        setImportedIds(new Set())
        setSelected(new Map())
        setExpandedCarousel(null)
        setRigId('')
        setImportResult(null)
        setError(null)
        setCursor(null)
        setHasMore(false)
        setLoadingMore(false)
        dimensionsRef.current = new Map()
    }, [])

    useEffect(() => {
        if (!isOpen) { reset(); return }

        async function load() {
            try {
                const rigsUrl = currentUserId
                    ? `/api/camera-rigs?userId=${currentUserId}`
                    : '/api/camera-rigs'
                const [mediaRes, rigsRes] = await Promise.all([
                    fetch('/api/linked-services/instagram/media'),
                    fetch(rigsUrl),
                ])

                if (mediaRes.status === 404) { setView('not_connected'); return }
                if (!mediaRes.ok) {
                    const data = await mediaRes.json().catch(() => ({}))
                    setError(data.error ?? 'Failed to load Instagram media')
                    setView('error')
                    return
                }

                const [mediaData, rigsData] = await Promise.all([
                    mediaRes.json(),
                    rigsRes.ok ? rigsRes.json() : Promise.resolve(null),
                ])

                setMedia(mediaData.media ?? [])
                setImportedIds(new Set(mediaData.importedIds ?? []))
                setCursor(mediaData.nextCursor ?? null)
                setHasMore(!!mediaData.nextCursor)

                if (rigsData?.success && Array.isArray(rigsData.data?.rigs)) {
                    const rigs: UserRig[] = rigsData.data.rigs.filter((r: UserRig) => r.isActive)
                    setUserRigs(rigs)
                    // Pre-select default rig if available
                    if (rigsData.data.defaultRigId) {
                        const def = rigs.find((r: UserRig) => r.id === rigsData.data.defaultRigId)
                        if (def) setRigId(String(def.id))
                    }
                }

                setView('grid')
            } catch (err) {
                console.error('[InstagramImportModal] load error:', err)
                setError(err instanceof Error ? err.message : 'Could not reach the server. Please try again.')
                setView('error')
            }
        }

        load()
    }, [isOpen, reset, currentUserId])

    // Load next page — called by the IntersectionObserver sentinel
    const loadMore = useCallback(async () => {
        if (!cursor || loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const res = await fetch(`/api/linked-services/instagram/media?after=${encodeURIComponent(cursor)}`)
            if (!res.ok) return
            const data = await res.json()
            setMedia(prev => [...prev, ...(data.media ?? [])])
            setImportedIds(prev => {
                const next = new Set(prev)
                for (const id of (data.importedIds ?? [])) next.add(id as string)
                return next
            })
            setCursor(data.nextCursor ?? null)
            setHasMore(!!data.nextCursor)
        } catch {
            // Non-critical — user can scroll again to retry
        } finally {
            setLoadingMore(false)
        }
    }, [cursor, loadingMore, hasMore])

    // IntersectionObserver: trigger loadMore when sentinel scrolls into view
    useEffect(() => {
        if (view !== 'grid' || expandedCarousel || !hasMore) return
        const el = sentinelRef.current
        if (!el) return
        const obs = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMore() },
            { rootMargin: '150px' }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [view, expandedCarousel, hasMore, loadMore])

    // Measure image dimensions when they load; fallback stays 1080×1080
    const onImgLoad = useCallback((id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        dimensionsRef.current.set(id, { width: img.naturalWidth || 1080, height: img.naturalHeight || 1080 })
    }, [])

    function toggleImage(imageId: string, mediaUrl: string, caption: string | undefined, timestamp: string) {
        setSelected(prev => {
            const next = new Map(prev)
            if (next.has(imageId)) {
                next.delete(imageId)
            } else {
                const dims = dimensionsRef.current.get(imageId) ?? { width: 1080, height: 1080 }
                next.set(imageId, { imageId, mediaUrl, caption, timestamp, ...dims })
            }
            return next
        })
    }

    function toggleCarouselImage(img: InstagramImage, parentItem: InstagramMediaItem) {
        toggleImage(img.id, img.mediaUrl, parentItem.caption, img.timestamp)
    }

    async function handleImport() {
        if (selected.size === 0 || !rigId) return
        setView('importing')

        const selections = Array.from(selected.values()).map(s => {
            const meta = s.caption ? extractMetaFromCaption(s.caption) : {}
            return {
                mediaId: s.imageId,
                mediaUrl: s.mediaUrl,
                caption: s.caption,
                timestamp: s.timestamp,
                rigId: parseInt(rigId),
                width: s.width,
                height: s.height,
                ...meta,
            }
        })

        try {
            const res = await fetch('/api/linked-services/instagram/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selections }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error ?? `Import failed (${res.status})`)
                setView('error')
                return
            }
            setImportResult(data)
            setView('done')
            router.refresh()
        } catch {
            setError('Could not reach the server. Please try again.')
            setView('error')
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        {expandedCarousel && view === 'grid' && (
                            <button
                                onClick={() => setExpandedCarousel(null)}
                                className="mr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Back"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        {/* Instagram gradient icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#f09433" />
                                    <stop offset="25%" stopColor="#e6683c" />
                                    <stop offset="50%" stopColor="#dc2743" />
                                    <stop offset="75%" stopColor="#cc2366" />
                                    <stop offset="100%" stopColor="#bc1888" />
                                </linearGradient>
                            </defs>
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-grad)" />
                            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" fill="none" />
                            <circle cx="17.5" cy="6.5" r="1" fill="white" />
                        </svg>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {expandedCarousel ? 'Album — select photos' : 'Import from Instagram'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* Loading */}
                    {view === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Loading your Instagram photos…
                        </div>
                    )}

                    {/* Not connected */}
                    {view === 'not_connected' && (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 mb-1">Instagram not connected</p>
                                <p className="text-sm text-gray-500">Connect your Instagram account in Settings to import photos.</p>
                            </div>
                            <a
                                href="/settings/linked-services/instagram"
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Connect Instagram
                            </a>
                        </div>
                    )}

                    {/* Error */}
                    {view === 'error' && (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                            <p className="text-red-600 font-medium">{error}</p>
                            <button
                                onClick={() => { reset(); setView('loading') }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Importing */}
                    {view === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Importing {selected.size} {selected.size === 1 ? 'photo' : 'photos'}…
                        </div>
                    )}

                    {/* Done */}
                    {view === 'done' && importResult && (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 mb-1">
                                    {importResult.imported} {importResult.imported === 1 ? 'photo' : 'photos'} imported
                                </p>
                                {importResult.skipped > 0 && (
                                    <p className="text-sm text-gray-500">{importResult.skipped} already in gallery — skipped</p>
                                )}
                                {importResult.errors.length > 0 && (
                                    <p className="text-sm text-amber-600 mt-1">{importResult.errors.length} failed</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                View gallery
                            </button>
                        </div>
                    )}

                    {/* Grid / Carousel expand */}
                    {view === 'grid' && (
                        <div className="p-4">
                            {/* Rig selector */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Camera rig <span className="text-red-500">*</span>
                                </label>
                                {userRigs.length === 0 ? (
                                    <p className="text-sm text-amber-600">
                                        No active rigs found.{' '}
                                        <a href="/gear" className="underline hover:text-amber-800">Set up a rig</a> first.
                                    </p>
                                ) : (
                                    <select
                                        value={rigId}
                                        onChange={e => setRigId(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    >
                                        <option value="">— select a rig —</option>
                                        {userRigs.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({r.camera.brand.name} {r.camera.name})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Metadata extraction notice */}
                            <p className="text-xs text-gray-500 mb-3">
                                Camera settings (f/, ISO, shutter, mm) will be auto-extracted from captions. You can edit each photo after import.
                            </p>

                            {/* Media grid or carousel child grid */}
                            {expandedCarousel ? (
                                <CarouselGrid
                                    item={expandedCarousel}
                                    selected={selected}
                                    importedIds={importedIds}
                                    onToggle={(img) => toggleCarouselImage(img, expandedCarousel)}
                                    onImgLoad={onImgLoad}
                                />
                            ) : (
                                <MediaGrid
                                    media={media}
                                    selected={selected}
                                    importedIds={importedIds}
                                    onToggle={(item) => {
                                        if (item.mediaType === 'CAROUSEL_ALBUM') {
                                            setExpandedCarousel(item)
                                        } else {
                                            toggleImage(item.id, item.mediaUrl, item.caption, item.timestamp)
                                        }
                                    }}
                                    onImgLoad={onImgLoad}
                                />
                            )}

                            {media.length === 0 && !expandedCarousel && (
                                <p className="text-center text-gray-500 text-sm py-8">No photos found on your Instagram account.</p>
                            )}

                            {/* Infinite scroll sentinel — sits below the grid; IntersectionObserver fires loadMore */}
                            {!expandedCarousel && (
                                <div ref={sentinelRef} className="flex items-center justify-center h-10 mt-2">
                                    {loadingMore && (
                                        <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {view === 'grid' && (
                    <div className="border-t px-6 py-4 flex items-center justify-between shrink-0 bg-gray-50">
                        <span className="text-sm text-gray-600">
                            {selected.size > 0
                                ? `${selected.size} ${selected.size === 1 ? 'photo' : 'photos'} selected`
                                : 'No photos selected'}
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selected.size === 0 || !rigId}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Import {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'photo' : 'photos'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MediaGridProps {
    media: InstagramMediaItem[]
    selected: Map<string, Selection>
    importedIds: Set<string>
    onToggle: (item: InstagramMediaItem) => void
    onImgLoad: (id: string, e: React.SyntheticEvent<HTMLImageElement>) => void
}

function MediaGrid({ media, selected, importedIds, onToggle, onImgLoad }: MediaGridProps) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {media.map(item => {
                // For carousels, count how many children are selected
                const isCarousel = item.mediaType === 'CAROUSEL_ALBUM'
                const directlySelected = selected.has(item.id)
                const childrenSelected = isCarousel
                    ? (item.children ?? []).filter(c => selected.has(c.id)).length
                    : 0
                const isImported = !isCarousel && importedIds.has(item.id)
                const meta = item.caption ? extractMetaFromCaption(item.caption) : null

                return (
                    <div
                        key={item.id}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all
                            ${directlySelected
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : isImported
                                    ? 'border-gray-300 opacity-50 cursor-default'
                                    : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => !isImported && onToggle(item)}
                    >
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.mediaUrl}
                            alt={item.caption ?? ''}
                            className="w-full h-full object-cover"
                            onLoad={e => onImgLoad(item.id, e)}
                        />

                        {/* Already imported badge */}
                        {isImported && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                <span className="text-xs font-medium text-gray-500 bg-white/90 px-2 py-0.5 rounded-full border">
                                    Imported
                                </span>
                            </div>
                        )}

                        {/* Carousel badge — stacked-images icon, same as Instagram */}
                        {isCarousel && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                                {childrenSelected > 0 && (
                                    <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                                        {childrenSelected}
                                    </span>
                                )}
                                {/* Two offset overlapping squares — Instagram carousel indicator */}
                                <svg className="w-4 h-4 drop-shadow" viewBox="0 0 20 20" fill="white">
                                    <rect x="5" y="0" width="14" height="14" rx="2.5" opacity="0.65" />
                                    <rect x="0" y="5" width="14" height="14" rx="2.5" />
                                </svg>
                            </div>
                        )}

                        {/* Checkmark for single images */}
                        {!isCarousel && !isImported && (
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow transition-colors
                                ${directlySelected ? 'bg-blue-500 border-blue-500' : 'border-white/70 bg-black/30 group-hover:border-white'}`}>
                                {directlySelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        )}

                        {/* Extracted metadata chips */}
                        {directlySelected && meta && Object.keys(meta).length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1.5 pb-1 pt-4 flex flex-wrap gap-0.5">
                                {meta.focalLength != null && <Chip>{meta.focalLength}mm</Chip>}
                                {meta.aperture != null && <Chip>f/{meta.aperture}</Chip>}
                                {meta.iso != null && <Chip>ISO {meta.iso}</Chip>}
                                {meta.shutterSpeed && <Chip>{meta.shutterSpeed}</Chip>}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

interface CarouselGridProps {
    item: InstagramMediaItem
    selected: Map<string, Selection>
    importedIds: Set<string>
    onToggle: (img: InstagramImage) => void
    onImgLoad: (id: string, e: React.SyntheticEvent<HTMLImageElement>) => void
}

function CarouselGrid({ item, selected, importedIds, onToggle, onImgLoad }: CarouselGridProps) {
    const children = item.children ?? []
    if (children.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-8">No individual photos found in this album.</p>
    }
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {children.map(img => {
                const isSelected = selected.has(img.id)
                const isImported = importedIds.has(img.id)
                return (
                    <div
                        key={img.id}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all
                            ${isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : isImported
                                    ? 'border-gray-300 opacity-50 cursor-default'
                                    : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => !isImported && onToggle(img)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={img.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onLoad={e => onImgLoad(img.id, e)}
                        />
                        {isImported && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                <span className="text-xs font-medium text-gray-500 bg-white/90 px-2 py-0.5 rounded-full border">
                                    Imported
                                </span>
                            </div>
                        )}
                        {!isImported && (
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow transition-colors
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/70 bg-black/30 group-hover:border-white'}`}>
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-white text-[9px] font-medium bg-black/50 px-1 py-0.5 rounded leading-none">
            {children}
        </span>
    )
}
