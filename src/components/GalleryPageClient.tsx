'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'
import GalleryFAB from './GalleryFAB'
import GalleryFilterPanel, { SortOption, FilterState, FilterPool } from './GalleryFilterPanel'
import { InitialFilterOptions } from '@/app/gallery/page'
import { UploadQueueProvider } from '@/lib/UploadQueueContext'
import UploadProgressFAB from './UploadProgressFAB'

interface GalleryPageClientProps {
    photos: GalleryPhotoData[]
    initialFilters?: InitialFilterOptions
}

export default function GalleryPageClient({ photos, initialFilters }: GalleryPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const { data: session } = useSession()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const lastSelectedIndex = useRef<number | null>(null)
    const filteredRef = useRef<GalleryPhotoData[]>([])

    const handlePhotoClick = useCallback((photoId: number, index: number, shiftKey: boolean) => {
        if (shiftKey && lastSelectedIndex.current !== null) {
            const from = Math.min(lastSelectedIndex.current, index)
            const to = Math.max(lastSelectedIndex.current, index)
            setSelectedIds(prev => {
                const next = new Set(prev)
                for (let i = from; i <= to; i++) {
                    const p = filteredRef.current[i]
                    if (p?.photoId != null && p.userId === currentUserId) {
                        next.add(p.photoId)
                    }
                }
                return next
            })
        } else {
            lastSelectedIndex.current = index
            setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(photoId)) next.delete(photoId)
                else next.add(photoId)
                return next
            })
        }
    }, [currentUserId])

    function enterSelection() {
        setSelectionMode(true)
        setSelectedIds(new Set())
        lastSelectedIndex.current = null
    }

    function exitSelection() {
        setSelectionMode(false)
        setSelectedIds(new Set())
        setDeleteError(null)
        lastSelectedIndex.current = null
    }

    async function deleteSelected() {
        if (selectedIds.size === 0 || isDeleting) return
        setIsDeleting(true)
        setDeleteError(null)
        try {
            const res = await fetch('/api/gallery/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setDeleteError(data.error ?? `Failed to delete photos (${res.status})`)
                return
            }
            exitSelection()
            router.refresh()
        } catch {
            setDeleteError('Could not reach the server. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    // ─── Filters + sort (from URL params) ────────────────────────────────────

    const cameraSlug = searchParams.get('camera')
    const lensSlug = searchParams.get('lens')
    const housingSlug = searchParams.get('housing')
    const portSlug = searchParams.get('port')
    const sortBy = (searchParams.get('sort') ?? 'date') as SortOption

    const filters: FilterState = {
        camera: cameraSlug,
        lens: lensSlug,
        housing: housingSlug,
        port: portSlug,
    }

    // ─── Filter pool (dropdown options) ──────────────────────────────────────

    const pool = useMemo((): FilterPool => {
        const cameras = new Map<string, string>()
        const lenses = new Map<string, string>()
        const housings = new Map<string, string>()
        const ports = new Map<string, string>()

        if (initialFilters?.camera) cameras.set(initialFilters.camera.slug, initialFilters.camera.name)
        if (initialFilters?.lens) lenses.set(initialFilters.lens.slug, initialFilters.lens.name)
        if (initialFilters?.housing) housings.set(initialFilters.housing.slug, initialFilters.housing.name)
        if (initialFilters?.port) ports.set(initialFilters.port.slug, initialFilters.port.name)

        photos.forEach(p => {
            if (p.cameraSlug && p.cameraName) cameras.set(p.cameraSlug, p.cameraName)
            if (p.lensSlug && p.lensName) lenses.set(p.lensSlug, p.lensName)
            if (p.housingSlug && p.housingName) housings.set(p.housingSlug, p.housingName)
            if (p.portSlug && p.portName) ports.set(p.portSlug, p.portName)
        })

        return {
            cameras: Array.from(cameras.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            lenses: Array.from(lenses.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            housings: Array.from(housings.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            ports: Array.from(ports.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        }
    }, [photos, initialFilters])

    // ─── Filtered + sorted photos ─────────────────────────────────────────────

    const filtered = useMemo(() =>
        photos.filter(p => {
            if (cameraSlug && p.cameraSlug !== cameraSlug) return false
            if (lensSlug && p.lensSlug !== lensSlug) return false
            if (housingSlug && p.housingSlug !== housingSlug) return false
            if (portSlug && p.portSlug !== portSlug) return false
            return true
        }),
        [photos, cameraSlug, lensSlug, housingSlug, portSlug]
    )

    const sorted = useMemo(() => {
        if (sortBy === 'rating') return [...filtered].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
        return filtered  // server already returns date-sorted
    }, [filtered, sortBy])

    filteredRef.current = sorted

    // ─── URL mutation helpers ─────────────────────────────────────────────────

    function updateParam(key: string, value: string | null) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        const qs = params.toString()
        router.replace(qs ? `/gallery?${qs}` : '/gallery', { scroll: false })
    }

    function handleSortChange(sort: SortOption) {
        updateParam('sort', sort === 'date' ? null : sort)
    }

    function handleFilterChange(key: keyof FilterState, value: string | null) {
        updateParam(key, value)
    }

    function handleReset() {
        router.replace('/gallery', { scroll: false })
    }

    return (
        <UploadQueueProvider>
            <div className="flex flex-col gap-4 pb-24">

                {/* Action bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Sort & Filter panel — desktop inline, mobile fixed */}
                        <GalleryFilterPanel
                            sortBy={sortBy}
                            filters={filters}
                            pool={pool}
                            resultCount={sorted.length}
                            totalCount={photos.length}
                            onSortChange={handleSortChange}
                            onFilterChange={handleFilterChange}
                            onReset={handleReset}
                        />
                        {selectionMode && (
                            <>
                                <button
                                    onClick={exitSelection}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <span className="text-sm text-gray-500">
                                    {selectedIds.size} {selectedIds.size === 1 ? 'photo' : 'photos'} selected
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {deleteError && (
                            <span className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {deleteError}
                                <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 transition-colors ml-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        )}
                        {selectionMode && selectedIds.size > 0 && (
                            <button
                                onClick={deleteSelected}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Deleting…
                                    </>
                                ) : (
                                    <>Delete {selectedIds.size}</>
                                )}
                            </button>
                        )}
                        {!selectionMode && currentUserId && (
                            <button
                                onClick={enterSelection}
                                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                Select
                            </button>
                        )}
                        {!selectionMode && currentUserId && (
                            <GalleryFAB currentUserId={currentUserId} />
                        )}
                    </div>
                </div>

                <GalleryGrid
                    photos={sorted}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    currentUserId={currentUserId}
                    onPhotoClick={handlePhotoClick}
                    onExitSelection={exitSelection}
                />
            </div>

            {/* Upload progress tracker — bottom-left */}
            <UploadProgressFAB />
        </UploadQueueProvider>
    )
}
