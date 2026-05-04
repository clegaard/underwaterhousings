'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { withBase, getLensImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'

interface Lens {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
    cameraMount: { id: number; name: string; slug: string } | null
    exifId: string | null
    isZoomLens: boolean
    focalLengthTele: number | null
    focalLengthWide: number | null
    maximumMagnification: number | null
}

interface Manufacturer {
    id: number
    name: string
    slug: string
    logoPath: string | null
    _count: { lenses: number }
    lenses: Lens[]
}

interface CameraMount {
    id: number
    name: string
    slug: string
}

type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

interface Props {
    manufacturers: Manufacturer[]
    cameraMounts: CameraMount[]
    isSuperuser: boolean
}

export default function LensManufacturersClient({ manufacturers: initial, cameraMounts, isSuperuser }: Props) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [manufacturers, setManufacturers] = useState(initial)

    // ── Manufacturer modal state ──────────────────────────────────────────────
    const [modal, setModal] = useState<'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Manufacturer | null>(null)
    const [nameInput, setNameInput] = useState('')
    const [mfrLoading, setMfrLoading] = useState(false)
    const [mfrError, setMfrError] = useState<string | null>(null)

    function openMfrEdit(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setNameInput(m.name); setMfrError(null); setModal('edit')
    }
    function openMfrDelete(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setMfrError(null); setModal('delete')
    }
    function closeMfr() { setModal(null); setTarget(null); setMfrError(null) }

    async function handleMfrEdit() {
        if (!target || !nameInput.trim()) return
        setMfrLoading(true); setMfrError(null)
        try {
            const res = await fetch(`/api/admin/manufacturers?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setMfrError(data.error ?? 'Failed to update'); return }
            setManufacturers(prev => prev.map(m => m.id === target.id ? { ...m, name: data.name, slug: data.slug } : m))
            closeMfr()
        } catch { setMfrError('Network error') }
        finally { setMfrLoading(false) }
    }

    async function handleMfrDelete() {
        if (!target) return
        setMfrLoading(true); setMfrError(null)
        try {
            const res = await fetch(`/api/admin/manufacturers?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setMfrError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.filter(m => m.id !== target.id))
            closeMfr()
        } catch { setMfrError('Network error') }
        finally { setMfrLoading(false) }
    }

    // ── Lens modal state ──────────────────────────────────────────────────────
    const [lensModal, setLensModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [lensTarget, setLensTarget] = useState<Lens | null>(null)
    const [lensTargetMfr, setLensTargetMfr] = useState<Manufacturer | null>(null)
    const [lensName, setLensName] = useState('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [exifIdInput, setExifIdInput] = useState('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)
    const [lensLoading, setLensLoading] = useState(false)
    const [lensError, setLensError] = useState<string | null>(null)
    // Optics
    const [lensType, setLensType] = useState<'prime' | 'zoom'>('prime')
    const [focalLengthTele, setFocalLengthTele] = useState('')
    const [focalLengthWide, setFocalLengthWide] = useState('')
    const [maximumMagnification, setMaximumMagnification] = useState('')

    function resetLensForm() {
        setLensName(''); setMountId(''); setExifIdInput('')
        setPhotos(prev => { prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) }); return [] })
        setDragPhotoIdx(null)
        setLensType('prime'); setFocalLengthTele(''); setFocalLengthWide(''); setMaximumMagnification('')
    }

    function openLensAdd(mfr: Manufacturer) {
        resetLensForm(); setLensError(null)
        setLensTargetMfr(mfr); setLensModal('add')
    }

    function openLensEdit(l: Lens, mfr: Manufacturer) {
        setLensTarget(l); setLensTargetMfr(mfr)
        setLensName(l.name)
        setMountId(l.cameraMount?.id ?? '')
        setExifIdInput(l.exifId ?? '')
        setPhotos(l.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null); setLensError(null)
        setLensType(l.isZoomLens ? 'zoom' : 'prime')
        setFocalLengthTele(l.focalLengthTele != null ? String(l.focalLengthTele) : '')
        setFocalLengthWide(l.focalLengthWide != null ? String(l.focalLengthWide) : '')
        setMaximumMagnification(l.maximumMagnification != null ? String(l.maximumMagnification) : '')
        setLensModal('edit')
    }

    function openLensDelete(l: Lens, mfr: Manufacturer) {
        setLensTarget(l); setLensTargetMfr(mfr); setLensError(null); setLensModal('delete')
    }

    function closeLensModal() {
        resetLensForm(); setLensModal(null); setLensTarget(null); setLensTargetMfr(null); setLensError(null)
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
            imageItems.push({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file: renamedFile, previewUrl: URL.createObjectURL(renamedFile) })
        }
        if (imageItems.length > 0) { e.preventDefault(); setPhotos(prev => [...prev, ...imageItems]) }
    }, [])

    useEffect(() => {
        if (!lensModal) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [lensModal, handlePasteEvent])

    function removePhoto(idx: number) {
        setPhotos(prev => {
            const item = prev[idx]
            if (item?.kind === 'new') URL.revokeObjectURL(item.previewUrl)
            return prev.filter((_, i) => i !== idx)
        })
    }

    function handlePhotoDragStart(e: React.DragEvent, idx: number) {
        e.dataTransfer.effectAllowed = 'move'; setDragPhotoIdx(idx)
    }
    function handlePhotoDragOver(e: React.DragEvent, idx: number) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'
        if (dragPhotoIdx === null || dragPhotoIdx === idx) return
        setPhotos(prev => { const arr = [...prev]; const [item] = arr.splice(dragPhotoIdx, 1); arr.splice(idx, 0, item); return arr })
        setDragPhotoIdx(idx)
    }
    function handlePhotoDragEnd() { setDragPhotoIdx(null) }
    function getSlotPreview(slot: PhotoSlot) { return slot.kind === 'existing' ? withBase(slot.path) : slot.previewUrl }

    async function buildFinalPhotoPaths(mfrSlug: string): Promise<string[]> {
        const paths: string[] = []
        for (const slot of photos) {
            if (slot.kind === 'existing') {
                paths.push(slot.path)
            } else {
                const fd = new FormData()
                fd.append('file', slot.file)
                fd.append('manufacturerSlug', mfrSlug)
                const res = await fetch('/api/admin/lenses/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handleLensAdd() {
        if (!lensName.trim() || mountId === '' || !lensTargetMfr) return
        setLensLoading(true); setLensError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths(lensTargetMfr.slug)
            const res = await fetch('/api/admin/lenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: lensName.trim(), manufacturerId: lensTargetMfr.id, cameraMountId: mountId, productPhotos, exifId: exifIdInput.trim() || null,
                    isZoomLens: lensType === 'zoom',
                    focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                    focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                    maximumMagnification: maximumMagnification ? parseFloat(maximumMagnification) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setLensError(data.error ?? 'Failed to create'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            const newLens: Lens = {
                id: data.id, name: lensName.trim(), slug: data.slug,
                productPhotos, cameraMount: resolvedMount, exifId: exifIdInput.trim() || null,
                priceAmount: null, priceCurrency: null,
                isZoomLens: lensType === 'zoom',
                focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                maximumMagnification: maximumMagnification ? parseFloat(maximumMagnification) : null,
            }
            setManufacturers(prev => prev.map(m => m.id === lensTargetMfr.id
                ? { ...m, lenses: [...m.lenses, newLens], _count: { lenses: m._count.lenses + 1 } }
                : m
            ))
            router.refresh()
            closeLensModal()
        } catch (err) {
            setLensError(err instanceof Error ? err.message : 'Network error')
        } finally { setLensLoading(false) }
    }

    async function handleLensEdit() {
        if (!lensTarget || !lensTargetMfr || !lensName.trim() || mountId === '') return
        setLensLoading(true); setLensError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths(lensTargetMfr.slug)
            const res = await fetch(`/api/admin/lenses?id=${lensTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: lensName.trim(), manufacturerId: lensTargetMfr.id, cameraMountId: mountId, productPhotos, exifId: exifIdInput.trim() || null,
                    isZoomLens: lensType === 'zoom',
                    focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                    focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                    maximumMagnification: maximumMagnification ? parseFloat(maximumMagnification) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setLensError(data.error ?? 'Failed to update'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            setManufacturers(prev => prev.map(m => m.id !== lensTargetMfr.id ? m : {
                ...m,
                lenses: m.lenses.map(l => l.id !== lensTarget.id ? l : {
                    ...l, name: lensName.trim(), slug: data.slug, productPhotos, cameraMount: resolvedMount, exifId: exifIdInput.trim() || null,
                    isZoomLens: lensType === 'zoom',
                    focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                    focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                    maximumMagnification: maximumMagnification ? parseFloat(maximumMagnification) : null,
                }),
            }))
            router.refresh()
            closeLensModal()
        } catch (err) {
            setLensError(err instanceof Error ? err.message : 'Network error')
        } finally { setLensLoading(false) }
    }

    async function handleLensDelete() {
        if (!lensTarget || !lensTargetMfr) return
        setLensLoading(true); setLensError(null)
        try {
            const res = await fetch(`/api/admin/lenses?id=${lensTarget.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setLensError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.map(m => m.id !== lensTargetMfr.id ? m : {
                ...m,
                lenses: m.lenses.filter(l => l.id !== lensTarget.id),
                _count: { lenses: m._count.lenses - 1 },
            }))
            closeLensModal()
        } catch { setLensError('Network error') }
        finally { setLensLoading(false) }
    }

    const visibleManufacturers = manufacturers.filter(m => m._count.lenses > 0 || isSuperuser)

    if (visibleManufacturers.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="text-5xl mb-4">🔭</div>
                <p className="text-gray-500">No lenses found.</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-10">
                {visibleManufacturers.map(manufacturer => (
                    <section key={manufacturer.id}>
                        {/* Manufacturer heading */}
                        <div className="flex items-center gap-3 mb-4 group/mfr">
                            {manufacturer.logoPath && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0 shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={withBase(manufacturer.logoPath)} alt="" className="w-full h-full object-contain p-0.5" />
                                </div>
                            )}
                            <Link
                                href={`/lenses/${manufacturer.slug}`}
                                className="text-lg font-semibold text-gray-900 hover:text-blue-700 transition-colors"
                            >
                                {manufacturer.name}
                            </Link>
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {manufacturer._count.lenses} lens{manufacturer._count.lenses !== 1 ? 'es' : ''}
                            </span>
                            {isSuperuser && (
                                <div className="flex gap-1 opacity-0 group-hover/mfr:opacity-100 transition-opacity">
                                    <button onClick={e => openMfrEdit(manufacturer, e)} title="Edit manufacturer"
                                        className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                        </svg>
                                    </button>
                                    <button onClick={e => openMfrDelete(manufacturer, e)} title="Delete manufacturer"
                                        className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Lens cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {manufacturer.lenses.map(lens => {
                                const imageInfo = getLensImagePathWithFallback(lens.productPhotos)
                                const price = lens.priceAmount ? Number(lens.priceAmount) : null
                                const focalLabel = lens.isZoomLens && lens.focalLengthWide != null
                                    ? `${lens.focalLengthWide}–${lens.focalLengthTele} mm`
                                    : lens.focalLengthTele != null ? `${lens.focalLengthTele} mm` : null
                                return (
                                    <div key={lens.id} className="group/card relative">
                                        <Link
                                            href={`/lenses/${manufacturer.slug}/${lens.slug}`}
                                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                                        >
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
                                                    alt={lens.name}
                                                    className="object-contain p-3 w-full h-full"
                                                />
                                                {focalLabel && (
                                                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">
                                                        {focalLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-2.5 py-2">
                                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                                    {lens.name}
                                                </p>
                                                {lens.cameraMount && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lens.cameraMount.name}</p>
                                                )}
                                                {price !== null && (
                                                    <p className="text-xs font-medium text-green-600 mt-1">
                                                        ${price.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                        {isSuperuser && (
                                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={() => openLensEdit(lens, manufacturer)}
                                                    title="Edit lens"
                                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openLensDelete(lens, manufacturer)}
                                                    title="Delete lens"
                                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Add lens card — superuser only */}
                            {isSuperuser && (
                                <button
                                    onClick={() => openLensAdd(manufacturer)}
                                    className="min-h-[9rem] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-xs font-medium">Add lens</span>
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* Manufacturer edit modal */}
            {modal === 'edit' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeMfr() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit manufacturer</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input autoFocus type="text" value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleMfrEdit() }}
                            placeholder="e.g. Sony"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />
                        {mfrError && <p className="text-sm text-red-600 mb-3">{mfrError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeMfr} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleMfrEdit} disabled={mfrLoading || !nameInput.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {mfrLoading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manufacturer delete modal */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeMfr() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete manufacturer?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{target.name}</strong>?
                        </p>
                        {target._count.lenses > 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                This manufacturer has {target._count.lenses} lens{target._count.lenses !== 1 ? 'es' : ''} and cannot be deleted until they are removed.
                            </p>
                        )}
                        {mfrError && <p className="text-sm text-red-600 mb-3">{mfrError}</p>}
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={closeMfr} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleMfrDelete} disabled={mfrLoading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {mfrLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lens add / edit modal */}
            {(lensModal === 'add' || lensModal === 'edit') && lensTargetMfr && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeLensModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {lensModal === 'edit' ? 'Edit lens' : `Add lens — ${lensTargetMfr.name}`}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus type="text" value={lensName}
                            onChange={e => setLensName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') lensModal === 'edit' ? handleLensEdit() : handleLensAdd() }}
                            placeholder={`e.g. ${lensTargetMfr.name} 24-70mm f/2.8`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Camera mount <span className="text-red-500">*</span>
                        </label>
                        <select value={mountId} onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4">
                            <option value="">— Select a mount —</option>
                            {cameraMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">EXIF lens ID</label>
                        <input type="text" value={exifIdInput} onChange={e => setExifIdInput(e.target.value)}
                            placeholder="e.g. FE 24-70mm F2.8 GM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />

                        {/* ── Optics section ── */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Optics</p>

                            {/* Prime / Zoom tabs */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setLensType('prime'); setFocalLengthWide('') }}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${lensType === 'prime' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Prime
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLensType('zoom')}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${lensType === 'zoom' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Zoom
                                </button>
                            </div>

                            {lensType === 'prime' ? (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Focal length (mm)</label>
                                    <input
                                        type="number" min="1" step="1"
                                        value={focalLengthTele}
                                        onChange={e => setFocalLengthTele(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                                    />
                                </>
                            ) : (() => {
                                const wide = parseInt(focalLengthWide)
                                const tele = parseInt(focalLengthTele)
                                const rangeError = !isNaN(wide) && !isNaN(tele) && wide >= tele
                                return (
                                    <div>
                                        <div className="flex gap-3 mb-1">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Wide end (mm)</label>
                                                <input
                                                    type="number" min="1" step="1"
                                                    value={focalLengthWide}
                                                    onChange={e => setFocalLengthWide(e.target.value)}
                                                    placeholder="e.g. 24"
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${rangeError ? 'border-red-400' : 'border-gray-300'}`}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tele end (mm)</label>
                                                <input
                                                    type="number" min="1" step="1"
                                                    value={focalLengthTele}
                                                    onChange={e => setFocalLengthTele(e.target.value)}
                                                    placeholder="e.g. 70"
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${rangeError ? 'border-red-400' : 'border-gray-300'}`}
                                                />
                                            </div>
                                        </div>
                                        {rangeError && (
                                            <p className="text-xs text-red-500 mb-3">Wide end must be less than the tele end.</p>
                                        )}
                                        {!rangeError && <div className="mb-3" />}
                                    </div>
                                )
                            })()}

                            {/* Maximum magnification */}
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum magnification (×)</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={maximumMagnification}
                                onChange={e => setMaximumMagnification(e.target.value)}
                                placeholder="e.g. 0.30"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                            />
                            <p className="text-xs text-gray-400 mb-2">Reproduction ratio at closest focus, e.g. 0.30 for 0.30× (1:3.3).</p>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product photos</label>
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                            onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
                        >
                            <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Click, drag, or paste images here</p>
                            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF · max 20 MB each</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFilesAdd(e.target.files)} />

                        {photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
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
                                        {idx === 0 && (
                                            <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-xs py-0.5 font-medium">Cover</span>
                                        )}
                                        <button type="button" onClick={() => removePhoto(idx)}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity text-xs leading-none">
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {lensError && <p className="text-sm text-red-600 mb-3">{lensError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeLensModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={lensModal === 'edit' ? handleLensEdit : handleLensAdd}
                                disabled={lensLoading || !lensName.trim() || mountId === ''}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {lensLoading ? 'Saving…' : lensModal === 'edit' ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lens delete modal */}
            {lensModal === 'delete' && lensTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeLensModal() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete lens?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{lensTarget.name}</strong>? This cannot be undone.
                        </p>
                        {lensError && <p className="text-sm text-red-600 mb-3">{lensError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeLensModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleLensDelete} disabled={lensLoading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {lensLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
