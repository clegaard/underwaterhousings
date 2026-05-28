'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'
import GalleryFAB from './GalleryFAB'
import GallerySearchBar, { SearchToken, SuggestionPool, TokenType } from './GallerySearchBar'
import GallerySearchBottomSheet from './GallerySearchBottomSheet'
import { UploadQueueProvider } from '@/lib/UploadQueueContext'
import UploadProgressFAB from './UploadProgressFAB'

interface GalleryPageClientProps {
    photos: GalleryPhotoData[]
}

export default function GalleryPageClient({ photos }: GalleryPageClientProps) {
    const router = useRouter()

    const { data: session } = useSession()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [tokens, setTokens] = useState<SearchToken[]>([])
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
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

    // ─── Search token pool (built from loaded photos) ────────────────────────

    const pool = useMemo((): SuggestionPool => {
        const cameras = new Map<string, string>()
        const lenses = new Map<string, string>()
        const housings = new Map<string, string>()
        const ports = new Map<string, string>()
        const users = new Map<string, string>()

        photos.forEach(p => {
            if (p.cameraSlug && p.cameraName) cameras.set(p.cameraSlug, p.cameraName)
            if (p.lensSlug && p.lensName) lenses.set(p.lensSlug, p.lensName)
            if (p.housingSlug && p.housingName) housings.set(p.housingSlug, p.housingName)
            if (p.portSlug && p.portName) ports.set(p.portSlug, p.portName)
            if (p.userId != null && p.userName) users.set(String(p.userId), p.userName)
        })

        return {
            cameras: Array.from(cameras.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            lenses: Array.from(lenses.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            housings: Array.from(housings.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            ports: Array.from(ports.entries()).sort((a, b) => a[1].localeCompare(b[1])),
            users: Array.from(users.entries()).sort((a, b) => a[1].localeCompare(b[1])),
        }
    }, [photos])

    // ─── Token-based filtering ────────────────────────────────────────────────

    const filtered = useMemo(() => {
        if (tokens.length === 0) return photos
        return photos.filter(p => tokens.every(t => {
            if (t.type === 'camera') return p.cameraSlug === t.slug
            if (t.type === 'lens') return p.lensSlug === t.slug
            if (t.type === 'housing') return p.housingSlug === t.slug
            if (t.type === 'port') return p.portSlug === t.slug
            if (t.type === 'user') return String(p.userId) === t.slug
            return true
        }))
    }, [photos, tokens])

    filteredRef.current = filtered

    function handleAdd(token: SearchToken) {
        setTokens(prev => [...prev.filter(t => t.type !== token.type), token])
    }

    function handleRemove(type: TokenType) {
        setTokens(prev => prev.filter(t => t.type !== type))
    }

    return (
        <UploadQueueProvider>
            <div className="flex flex-col gap-4 pb-24">

                {/* Action bar — search (desktop) + selection mode controls */}
                <div className="flex items-center gap-3">
                    {/* Left / centre: search bar OR selection state */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        {selectionMode ? (
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
                        ) : (
                            <div className="hidden sm:block w-full">
                                <GallerySearchBar
                                    tokens={tokens}
                                    pool={pool}
                                    onAdd={handleAdd}
                                    onRemove={handleRemove}
                                    resultCount={filtered.length}
                                    totalCount={photos.length}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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
                            <GalleryFAB variant="toolbar" currentUserId={currentUserId} />
                        )}
                        {!selectionMode && currentUserId && (
                            <button
                                onClick={enterSelection}
                                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                Select
                            </button>
                        )}
                    </div>
                </div>

                <GalleryGrid
                    photos={filtered}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    currentUserId={currentUserId}
                    onPhotoClick={handlePhotoClick}
                    onExitSelection={exitSelection}
                />
            </div>

            {/* ── Mobile: fixed + FAB (upload) ── */}
            {currentUserId && <GalleryFAB currentUserId={currentUserId} />}

            {/* ── Mobile: search FAB above the + FAB ── */}
            <button
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Search photos"
                className="sm:hidden fixed right-5 z-40 h-14 w-14 rounded-full bg-white/90 backdrop-blur-md border border-gray-200/60 dark:border-white/10 shadow-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all active:scale-95"
                style={{ bottom: 'calc(1.5rem + 3.5rem + 0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                </svg>
                {tokens.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                        {tokens.length}
                    </span>
                )}
            </button>

            {/* ── Mobile: search bottom sheet ── */}
            <GallerySearchBottomSheet
                isOpen={mobileSearchOpen}
                onClose={() => setMobileSearchOpen(false)}
                tokens={tokens}
                pool={pool}
                onAdd={handleAdd}
                onRemove={handleRemove}
                resultCount={filtered.length}
                totalCount={photos.length}
            />

            {/* Upload progress tracker — bottom-left */}
            <UploadProgressFAB />
        </UploadQueueProvider>
    )
}
