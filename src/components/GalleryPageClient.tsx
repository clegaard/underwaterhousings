'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'
import GalleryUploadButton from './GalleryUploadButton'

interface GalleryPageClientProps {
    photos: GalleryPhotoData[]
}

export default function GalleryPageClient({ photos }: GalleryPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const { data: session } = useSession()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
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
        lastSelectedIndex.current = null
    }

    async function deleteSelected() {
        if (selectedIds.size === 0 || isDeleting) return
        setIsDeleting(true)
        try {
            const res = await fetch('/api/gallery/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error ?? 'Failed to delete photos')
                return
            }
            exitSelection()
            router.refresh()
        } catch {
            alert('Failed to delete photos')
        } finally {
            setIsDeleting(false)
        }
    }

    const cameraSlug = searchParams.get('camera') ?? ''
    const lensSlug = searchParams.get('lens') ?? ''
    const housingSlug = searchParams.get('housing') ?? ''
    const portSlug = searchParams.get('port') ?? ''

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.replace(`/gallery?${params.toString()}`, { scroll: false })
    }

    // Derive unique [slug, displayName] pairs sorted by display name
    const cameras = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.cameraSlug && p.cameraName) map.set(p.cameraSlug, p.cameraName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const lenses = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.lensSlug && p.lensName) map.set(p.lensSlug, p.lensName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const housings = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.housingSlug && p.housingName) map.set(p.housingSlug, p.housingName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const ports = useMemo(
        () => {
            const map = new Map<string, string>()
            photos.forEach((p) => { if (p.portSlug && p.portName) map.set(p.portSlug, p.portName) })
            return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
        },
        [photos]
    )

    const filtered = useMemo(
        () =>
            photos.filter(
                (p) =>
                    (!cameraSlug || p.cameraSlug === cameraSlug) &&
                    (!lensSlug || p.lensSlug === lensSlug) &&
                    (!housingSlug || p.housingSlug === housingSlug) &&
                    (!portSlug || p.portSlug === portSlug)
            ),
        [photos, cameraSlug, lensSlug, housingSlug, portSlug]
    )
    filteredRef.current = filtered

    const hasActiveFilter = !!(cameraSlug || lensSlug || housingSlug || portSlug)

    function clearAll() {
        router.replace('/gallery', { scroll: false })
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className="lg:w-72 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
                        {hasActiveFilter && (
                            <button
                                onClick={clearAll}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
                            <select
                                value={cameraSlug}
                                onChange={(e) => setParam('camera', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All cameras</option>
                                {cameras.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lens</label>
                            <select
                                value={lensSlug}
                                onChange={(e) => setParam('lens', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All lenses</option>
                                {lenses.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Housing</label>
                            <select
                                value={housingSlug}
                                onChange={(e) => setParam('housing', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All housings</option>
                                {housings.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {ports.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                                <select
                                    value={portSlug}
                                    onChange={(e) => setParam('port', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="">All ports</option>
                                    {ports.map(([slug, name]) => (
                                        <option key={slug} value={slug}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <p className="text-sm text-gray-500 pt-1">
                            {filtered.length} / {photos.length} photos
                        </p>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
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
                        {!selectionMode && <GalleryUploadButton />}
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
        </div>
    )
}
