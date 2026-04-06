'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'

interface ReviewUser {
    id: number
    name: string | null
    profilePicture: string | null
}

export interface RigReviewData {
    id: number
    comment: string | null
    ratingOpticalQuality: number
    ratingReliability: number
    ratingEaseOfUse: number
    reviewPhotos: string[]
    createdAt: string
    user: ReviewUser
}

interface Props {
    reviews: RigReviewData[]
    cameraId: number
    housingId: number
    lensId: number | null
    portId: number | null
    userId: string | null
}

type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0)
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(n)}
                    className={`text-2xl transition-colors ${(hovered || value) >= n ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                    ★
                </button>
            ))}
        </div>
    )
}

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
    return (
        <span className="inline-flex gap-0.5">
            {Array.from({ length: max }, (_, i) => (
                <span key={i} className={i < value ? 'text-yellow-400' : 'text-gray-200'}>★</span>
            ))}
        </span>
    )
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const defaultForm = {
    ratingOpticalQuality: 5,
    ratingReliability: 5,
    ratingEaseOfUse: 5,
    comment: '',
}

export default function RigReviewsSection({
    reviews: initialReviews,
    cameraId,
    housingId,
    lensId,
    portId,
    userId,
}: Props) {
    const [reviews, setReviews] = useState(initialReviews)
    const [modal, setModal] = useState<'add' | 'edit' | null>(null)
    const [editTarget, setEditTarget] = useState<RigReviewData | null>(null)
    const [form, setForm] = useState({ ...defaultForm })
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [lightbox, setLightbox] = useState<{ photos: string[]; idx: number } | null>(null)

    useEffect(() => {
        if (!lightbox) return
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { setLightbox(null); return }
            if (e.key === 'ArrowRight') setLightbox(lb => lb ? { ...lb, idx: (lb.idx + 1) % lb.photos.length } : lb)
            if (e.key === 'ArrowLeft') setLightbox(lb => lb ? { ...lb, idx: (lb.idx - 1 + lb.photos.length) % lb.photos.length } : lb)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [lightbox])

    const avgOptical = reviews.length
        ? reviews.reduce((s, r) => s + r.ratingOpticalQuality, 0) / reviews.length
        : 0
    const avgReliability = reviews.length
        ? reviews.reduce((s, r) => s + r.ratingReliability, 0) / reviews.length
        : 0
    const avgEaseOfUse = reviews.length
        ? reviews.reduce((s, r) => s + r.ratingEaseOfUse, 0) / reviews.length
        : 0
    const overallAvg = reviews.length ? (avgOptical + avgReliability + avgEaseOfUse) / 3 : 0

    async function handleSubmit() {
        setLoading(true)
        setError(null)
        try {
            const reviewPhotos = await buildFinalPhotoPaths()
            const res = await fetch('/api/rig-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cameraId, housingId, lensId, portId, ...form, reviewPhotos }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to submit review')
            setReviews(prev => [data, ...prev])
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this review? This cannot be undone.')) return
        try {
            const res = await fetch(`/api/rig-reviews?id=${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error ?? 'Failed to delete review')
                return
            }
            setReviews(prev => prev.filter(r => r.id !== id))
        } catch {
            alert('Network error — please try again')
        }
    }

    async function handleEdit() {
        if (!editTarget) return
        setLoading(true)
        setError(null)
        try {
            const reviewPhotos = await buildFinalPhotoPaths()
            const res = await fetch(`/api/rig-reviews?id=${editTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, reviewPhotos }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to update review')
            setReviews(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...data, createdAt: r.createdAt } : r))
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    function openEdit(r: RigReviewData) {
        setEditTarget(r)
        setForm({
            ratingOpticalQuality: r.ratingOpticalQuality,
            ratingReliability: r.ratingReliability,
            ratingEaseOfUse: r.ratingEaseOfUse,
            comment: r.comment ?? '',
        })
        setPhotos(r.reviewPhotos.map(path => ({ kind: 'existing' as const, path })))
        setError(null)
        setModal('edit')
    }

    function close() {
        setModal(null)
        setEditTarget(null)
        setForm({ ...defaultForm })
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setDragPhotoIdx(null)
        setError(null)
    }

    function handleFilesAdd(files: FileList | null) {
        if (!files) return
        const items: PhotoSlot[] = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .map(file => ({
                kind: 'new' as const,
                id: Math.random().toString(36).slice(2),
                file,
                previewUrl: URL.createObjectURL(file),
            }))
        setPhotos(prev => [...prev, ...items])
    }

    const handlePasteEvent = useCallback((e: ClipboardEvent) => {
        const items = Array.from(e.clipboardData?.items ?? [])
        const imageItems: PhotoSlot[] = []
        for (const item of items) {
            if (!item.type.startsWith('image/')) continue
            const file = item.getAsFile()
            if (!file) continue
            const ext = item.type.split('/')[1] ?? 'png'
            const renamedFile = new File([file], `paste-${Date.now()}.${ext}`, { type: item.type })
            imageItems.push({
                kind: 'new' as const,
                id: Math.random().toString(36).slice(2),
                file: renamedFile,
                previewUrl: URL.createObjectURL(renamedFile),
            })
        }
        if (imageItems.length > 0) {
            e.preventDefault()
            setPhotos(prev => [...prev, ...imageItems])
        }
    }, [])

    useEffect(() => {
        if (!modal) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [modal, handlePasteEvent])

    function removePhoto(idx: number) {
        setPhotos(prev => {
            const item = prev[idx]
            if (item?.kind === 'new') URL.revokeObjectURL(item.previewUrl)
            return prev.filter((_, i) => i !== idx)
        })
    }

    function handlePhotoDragStart(e: React.DragEvent, idx: number) {
        e.dataTransfer.effectAllowed = 'move'
        setDragPhotoIdx(idx)
    }

    function handlePhotoDragOver(e: React.DragEvent, idx: number) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragPhotoIdx === null || dragPhotoIdx === idx) return
        setPhotos(prev => {
            const arr = [...prev]
            const [item] = arr.splice(dragPhotoIdx, 1)
            arr.splice(idx, 0, item)
            return arr
        })
        setDragPhotoIdx(idx)
    }

    function handlePhotoDragEnd() {
        setDragPhotoIdx(null)
    }

    function getSlotPreview(slot: PhotoSlot): string {
        return slot.kind === 'existing' ? withBase(slot.path) : slot.previewUrl
    }

    async function buildFinalPhotoPaths(): Promise<string[]> {
        const paths: string[] = []
        for (const slot of photos) {
            if (slot.kind === 'existing') {
                paths.push(slot.path)
            } else {
                const fd = new FormData()
                fd.append('file', slot.file)
                const res = await fetch('/api/rig-reviews/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">
                        Reviews{reviews.length > 0 && <span className="ml-2 text-gray-400 font-normal text-base">({reviews.length})</span>}
                    </h2>
                    {userId ? (
                        <button
                            onClick={() => { setForm({ ...defaultForm }); setModal('add') }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Write Review
                        </button>
                    ) : (
                        <Link href="/auth/login" className="group relative">
                            <button
                                disabled
                                className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Write Review
                            </button>
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                Log in to write a review
                            </span>
                        </Link>
                    )}
                </div>

                {/* Aggregate score */}
                {reviews.length > 0 && (
                    <div className="flex gap-8 items-start mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="text-center shrink-0">
                            <div className="text-5xl font-bold text-gray-900 leading-none mb-1">
                                {overallAvg.toFixed(1)}
                            </div>
                            <div className="flex gap-0.5 justify-center mb-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <span key={n} className={`text-xl ${n <= Math.round(overallAvg) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                ))}
                            </div>
                            <div className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="flex-1 space-y-2 text-sm">
                            {[
                                { label: 'Optical quality', avg: avgOptical },
                                { label: 'Reliability', avg: avgReliability },
                                { label: 'Ease of use', avg: avgEaseOfUse },
                            ].map(({ label, avg }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <span className="w-32 text-gray-600 text-xs shrink-0">{label}</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-yellow-400 h-full rounded-full"
                                            style={{ width: `${(avg / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-6 text-right text-gray-700 text-xs font-medium">{avg.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Review list */}
                {reviews.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="font-medium text-gray-700 mb-1">No reviews yet</p>
                        <p className="text-sm">Be the first to share your experience with this rig.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reviews.map(r => {
                            const displayName = r.user.name ?? 'Anonymous'
                            const avgRating = (r.ratingOpticalQuality + r.ratingReliability + r.ratingEaseOfUse) / 3
                            return (
                                <div key={r.id} className="py-5 first:pt-0">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <Link href={`/users/${r.user.id}`} className="shrink-0">
                                            <UserAvatar
                                                picture={r.user.profilePicture ? withBase(r.user.profilePicture) : null}
                                                name={r.user.name ?? '?'}
                                                size="base"
                                                className="hover:opacity-90 transition-opacity"
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <Link href={`/users/${r.user.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600 hover:underline transition-colors">{displayName}</Link>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                                                    {userId && String(r.user.id) === userId && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(r)}
                                                                title="Edit review"
                                                                className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(r.id)}
                                                                title="Delete review"
                                                                className="text-xs text-gray-400 hover:text-red-600 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Overall stars */}
                                            <div className="flex gap-0.5 mb-2">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <span key={n} className={`text-base ${n <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                                ))}
                                            </div>
                                            {r.comment && (
                                                <p className="text-sm text-gray-700 leading-relaxed mb-3">{r.comment}</p>
                                            )}
                                            {/* Review photos */}
                                            {r.reviewPhotos.length > 0 && (
                                                <div className="flex flex-wrap gap-3 mb-3">
                                                    {r.reviewPhotos.map((path, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setLightbox({ photos: r.reviewPhotos, idx: i })}
                                                            className="relative group/thumb h-28 w-28 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={withBase(path)}
                                                                alt={`Review photo ${i + 1}`}
                                                                className="h-full w-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                                                <div className="opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-1.5">
                                                                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Sub-ratings */}
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { label: 'Optical', val: r.ratingOpticalQuality },
                                                    { label: 'Reliability', val: r.ratingReliability },
                                                    { label: 'Ease of use', val: r.ratingEaseOfUse },
                                                ].map(({ label, val }) => (
                                                    <div key={label} className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span>{label}:</span>
                                                        <StarRow value={val} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Write / Edit Review Modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-5">{modal === 'edit' ? 'Edit Review' : 'Write a Review'}</h3>

                        <div className="space-y-5">
                            {/* Optical quality */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">Optical quality</label>
                                <p className="text-xs text-gray-400 mb-1.5">Overall sharpness, vignetting, corner performance</p>
                                <StarPicker
                                    value={form.ratingOpticalQuality}
                                    onChange={v => setForm(f => ({ ...f, ratingOpticalQuality: v }))}
                                />
                            </div>

                            {/* Reliability */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">Reliability</label>
                                <p className="text-xs text-gray-400 mb-1.5">Flooding risk, mechanical durability of controls and seals</p>
                                <StarPicker
                                    value={form.ratingReliability}
                                    onChange={v => setForm(f => ({ ...f, ratingReliability: v }))}
                                />
                            </div>

                            {/* Ease of use */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">Ease of use</label>
                                <p className="text-xs text-gray-400 mb-1.5">Button access, ergonomics, weight balance, port changes</p>
                                <StarPicker
                                    value={form.ratingEaseOfUse}
                                    onChange={v => setForm(f => ({ ...f, ratingEaseOfUse: v }))}
                                />
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
                                <textarea
                                    value={form.comment}
                                    onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                                    placeholder="Share your experience with this rig…"
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
                                />
                            </div>

                            {/* Photos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Photos <span className="text-gray-400 font-normal">(optional)</span></label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                                    onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
                                >
                                    <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">Click, drag, or paste images here</p>
                                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF · max 20 MB each</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={e => handleFilesAdd(e.target.files)}
                                />
                                {photos.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                        {photos.map((slot, idx) => (
                                            <div
                                                key={slot.kind === 'new' ? slot.id : slot.path + idx}
                                                draggable
                                                onDragStart={e => handlePhotoDragStart(e, idx)}
                                                onDragOver={e => handlePhotoDragOver(e, idx)}
                                                onDragEnd={handlePhotoDragEnd}
                                                className={`relative group/photo aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${dragPhotoIdx === idx ? 'opacity-40 border-blue-400 scale-95' : 'border-gray-200 hover:border-gray-400'}`}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={getSlotPreview(slot)} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity text-xs leading-none"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                        <div className="flex justify-end gap-3 mt-5">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
                                Cancel
                            </button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleSubmit}
                                disabled={loading}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Close */}
                        <button
                            onClick={() => setLightbox(null)}
                            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Prev / Next */}
                        {lightbox.photos.length > 1 && (
                            <>
                                <button
                                    onClick={e => { e.stopPropagation(); setLightbox(lb => lb ? { ...lb, idx: (lb.idx - 1 + lb.photos.length) % lb.photos.length } : lb) }}
                                    className="absolute left-4 z-10 bg-white/90 hover:bg-white rounded-full p-3 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); setLightbox(lb => lb ? { ...lb, idx: (lb.idx + 1) % lb.photos.length } : lb) }}
                                    className="absolute right-4 z-10 bg-white/90 hover:bg-white rounded-full p-3 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Image */}
                        <div
                            className="relative bg-white rounded-lg p-4 flex items-center justify-center"
                            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={withBase(lightbox.photos[lightbox.idx])}
                                alt={`Review photo ${lightbox.idx + 1}`}
                                style={{ maxWidth: '85vw', maxHeight: '82vh', objectFit: 'contain', display: 'block' }}
                            />
                            {lightbox.photos.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium">
                                    {lightbox.idx + 1} of {lightbox.photos.length}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
