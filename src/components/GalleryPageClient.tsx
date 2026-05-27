'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'
import GalleryFAB from './GalleryFAB'
import GallerySearchBar, { SearchToken, TokenType, SuggestionPool } from './GallerySearchBar'
import { InitialFilterOptions } from '@/app/gallery/page'

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

    // ─── Suggestion pool (derived from photos + initialFilters) ──────────────

    const pool = useMemo((): SuggestionPool => {
        const cameras = new Map<string, string>()
        const lenses = new Map<string, string>()
        const housings = new Map<string, string>()
        const ports = new Map<string, string>()
        const users = new Map<string, string>()  // userId string → display name

        if (initialFilters?.camera) cameras.set(initialFilters.camera.slug, initialFilters.camera.name)
        if (initialFilters?.lens) lenses.set(initialFilters.lens.slug, initialFilters.lens.name)
        if (initialFilters?.housing) housings.set(initialFilters.housing.slug, initialFilters.housing.name)
        if (initialFilters?.port) ports.set(initialFilters.port.slug, initialFilters.port.name)

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
    }, [photos, initialFilters])

    // ─── Active tokens (derived from URL search params) ──────────────────────

    const tokens = useMemo((): SearchToken[] => {
        const result: SearchToken[] = []

        const cameraSlug = searchParams.get('camera')
        if (cameraSlug) {
            const label = pool.cameras.find(([s]) => s === cameraSlug)?.[1] ?? initialFilters?.camera?.name
            if (label) result.push({ type: 'camera', slug: cameraSlug, label })
        }

        const lensSlug = searchParams.get('lens')
        if (lensSlug) {
            const label = pool.lenses.find(([s]) => s === lensSlug)?.[1] ?? initialFilters?.lens?.name
            if (label) result.push({ type: 'lens', slug: lensSlug, label })
        }

        const housingSlug = searchParams.get('housing')
        if (housingSlug) {
            const label = pool.housings.find(([s]) => s === housingSlug)?.[1] ?? initialFilters?.housing?.name
            if (label) result.push({ type: 'housing', slug: housingSlug, label })
        }

        const portSlug = searchParams.get('port')
        if (portSlug) {
            const label = pool.ports.find(([s]) => s === portSlug)?.[1] ?? initialFilters?.port?.name
            if (label) result.push({ type: 'port', slug: portSlug, label })
        }

        const userId = searchParams.get('user')
        if (userId) {
            const label = pool.users.find(([s]) => s === userId)?.[1]
            if (label) result.push({ type: 'user', slug: userId, label })
        }

        return result
    }, [searchParams, pool, initialFilters])

    // ─── URL mutation helpers ─────────────────────────────────────────────────

    const PARAM_KEY: Record<TokenType, string> = {
        camera: 'camera', lens: 'lens', housing: 'housing', port: 'port', user: 'user',
    }

    function addToken(token: SearchToken) {
        const params = new URLSearchParams(searchParams.toString())
        params.set(PARAM_KEY[token.type], token.slug)
        router.replace(`/gallery?${params.toString()}`, { scroll: false })
    }

    function removeToken(type: TokenType) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete(PARAM_KEY[type])
        const qs = params.toString()
        router.replace(qs ? `/gallery?${qs}` : '/gallery', { scroll: false })
    }

    // ─── Filtered photos ──────────────────────────────────────────────────────

    const tokenMap = useMemo(() => {
        const m: Partial<Record<TokenType, string>> = {}
        for (const t of tokens) m[t.type] = t.slug
        return m
    }, [tokens])

    const filtered = useMemo(() =>
        photos.filter(p => {
            if (tokenMap.camera && p.cameraSlug !== tokenMap.camera) return false
            if (tokenMap.lens && p.lensSlug !== tokenMap.lens) return false
            if (tokenMap.housing && p.housingSlug !== tokenMap.housing) return false
            if (tokenMap.port && p.portSlug !== tokenMap.port) return false
            if (tokenMap.user && String(p.userId) !== tokenMap.user) return false
            return true
        }),
        [photos, tokenMap])

    filteredRef.current = filtered

    return (
        <div className="flex flex-col gap-4">
            {/* Smart search / filter bar */}
            <GallerySearchBar
                tokens={tokens}
                pool={pool}
                onAdd={addToken}
                onRemove={removeToken}
                resultCount={filtered.length}
                totalCount={photos.length}
            />

            {/* Action bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                photos={filtered}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                currentUserId={currentUserId}
                onPhotoClick={handlePhotoClick}
                onExitSelection={exitSelection}
            />
        </div>
    )
}
