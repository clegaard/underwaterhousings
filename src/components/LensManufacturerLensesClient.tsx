'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { withBase, getLensImagePathWithFallback } from '@/lib/images'

interface Lens {
    id: number
    name: string
    slug: string
    cameraMount: { id: number; name: string; slug: string } | null
    exifId: string | null
    productPhotos: string[]
    productId: string | null
    productUrl: string | null
    imageInfo: { src: string; fallback: string }
    isZoomLens: boolean
    focalLengthTele: number | null
    focalLengthWide: number | null
    maximumMagnificationTele: number | null
    maximumMagnificationWide: number | null
    minimumFocusDistanceTele: number | null
    minimumFocusDistanceWide: number | null
    entrancePupilDistanceTele: number | null
    entrancePupilDistanceWide: number | null
}

interface Manufacturer {
    id: number
    name: string
    slug: string
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
    lenses: Lens[]
    manufacturer: Manufacturer
    cameraMounts: CameraMount[]
    isSuperuser: boolean
}

export default function LensManufacturerLensesClient({ lenses: initial, manufacturer, cameraMounts, isSuperuser }: Props) {
    const router = useRouter()
    const [lenses, setLenses] = useState(initial)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Lens | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [exifIdInput, setExifIdInput] = useState('')
    const [productIdInput, setProductIdInput] = useState('')
    const [productUrlInput, setProductUrlInput] = useState('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)
    // Optics
    const [lensType, setLensType] = useState<'prime' | 'zoom'>('prime')
    const [focalLengthTele, setFocalLengthTele] = useState('')
    const [focalLengthWide, setFocalLengthWide] = useState('')
    const [minimumFocusDistanceTele, setMinimumFocusDistanceTele] = useState('')
    const [minimumFocusDistanceWide, setMinimumFocusDistanceWide] = useState('')
    const [maximumMagnificationTele, setMaximumMagnificationTele] = useState('')
    const [maximumMagnificationWide, setMaximumMagnificationWide] = useState('')
    const [entrancePupilDistanceTele, setEntrancePupilDistanceTele] = useState('')
    const [entrancePupilDistanceWide, setEntrancePupilDistanceWide] = useState('')

    const zoomWide = parseInt(focalLengthWide)
    const zoomTele = parseInt(focalLengthTele)
    const rangeError = !isNaN(zoomWide) && !isNaN(zoomTele) && zoomWide >= zoomTele

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setMountId('')
        setExifIdInput('')
        setProductIdInput('')
        setProductUrlInput('')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setDragPhotoIdx(null)
        setLensType('prime')
        setFocalLengthTele('')
        setFocalLengthWide('')
        setMinimumFocusDistanceTele('')
        setMinimumFocusDistanceWide('')
        setMaximumMagnificationTele('')
        setMaximumMagnificationWide('')
        setEntrancePupilDistanceTele('')
        setEntrancePupilDistanceWide('')
    }

    function openAdd() {
        resetForm()
        setError(null)
        setModal('add')
    }

    function openEdit(l: Lens) {
        setTarget(l)
        setNameInput(l.name)
        setMountId(l.cameraMount?.id ?? '')
        setExifIdInput(l.exifId ?? '')
        setProductIdInput(l.productId ?? '')
        setProductUrlInput(l.productUrl ?? '')
        setPhotos(l.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null)
        setLensType(l.isZoomLens ? 'zoom' : 'prime')
        setFocalLengthTele(l.focalLengthTele != null ? String(l.focalLengthTele) : '')
        setFocalLengthWide(l.focalLengthWide != null ? String(l.focalLengthWide) : '')
        setMinimumFocusDistanceTele(l.minimumFocusDistanceTele != null ? String(l.minimumFocusDistanceTele) : '')
        setMinimumFocusDistanceWide(l.minimumFocusDistanceWide != null ? String(l.minimumFocusDistanceWide) : '')
        setMaximumMagnificationTele(l.maximumMagnificationTele != null ? String(l.maximumMagnificationTele) : '')
        setMaximumMagnificationWide(l.maximumMagnificationWide != null ? String(l.maximumMagnificationWide) : '')
        setEntrancePupilDistanceTele(l.entrancePupilDistanceTele != null ? String(l.entrancePupilDistanceTele) : '')
        setEntrancePupilDistanceWide(l.entrancePupilDistanceWide != null ? String(l.entrancePupilDistanceWide) : '')
        setError(null)
        setModal('edit')
    }

    function openDelete(l: Lens) {
        setTarget(l)
        setError(null)
        setModal('delete')
    }

    function close() {
        resetForm()
        setModal(null)
        setTarget(null)
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
                fd.append('manufacturerSlug', manufacturer.slug)
                const res = await fetch('/api/admin/lenses/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handleAdd() {
        if (!nameInput.trim() || mountId === '') return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch('/api/admin/lenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraMountId: mountId,
                    productPhotos,
                    exifId: exifIdInput.trim() || null,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                    isZoomLens: lensType === 'zoom',
                    focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                    focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                    minimumFocusDistanceTele: minimumFocusDistanceTele ? parseFloat(minimumFocusDistanceTele) : null,
                    minimumFocusDistanceWide: lensType === 'zoom' && minimumFocusDistanceWide ? parseFloat(minimumFocusDistanceWide) : null,
                    maximumMagnificationTele: maximumMagnificationTele ? parseFloat(maximumMagnificationTele) : null,
                    maximumMagnificationWide: lensType === 'zoom' && maximumMagnificationWide ? parseFloat(maximumMagnificationWide) : null,
                    entrancePupilDistanceTele: entrancePupilDistanceTele ? parseFloat(entrancePupilDistanceTele) : null,
                    entrancePupilDistanceWide: lensType === 'zoom' && entrancePupilDistanceWide ? parseFloat(entrancePupilDistanceWide) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            const newLens: Lens = {
                id: data.id,
                name: nameInput.trim(),
                slug: data.slug,
                cameraMount: resolvedMount,
                exifId: exifIdInput.trim() || null,
                productPhotos,
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                imageInfo: getLensImagePathWithFallback(productPhotos),
                isZoomLens: lensType === 'zoom',
                focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                minimumFocusDistanceTele: minimumFocusDistanceTele ? parseFloat(minimumFocusDistanceTele) : null,
                minimumFocusDistanceWide: lensType === 'zoom' && minimumFocusDistanceWide ? parseFloat(minimumFocusDistanceWide) : null,
                maximumMagnificationTele: maximumMagnificationTele ? parseFloat(maximumMagnificationTele) : null,
                maximumMagnificationWide: lensType === 'zoom' && maximumMagnificationWide ? parseFloat(maximumMagnificationWide) : null,
                entrancePupilDistanceTele: entrancePupilDistanceTele ? parseFloat(entrancePupilDistanceTele) : null,
                entrancePupilDistanceWide: lensType === 'zoom' && entrancePupilDistanceWide ? parseFloat(entrancePupilDistanceWide) : null,
            }
            setLenses(prev => [...prev, newLens])
            router.refresh()
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim() || mountId === '') return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch(`/api/admin/lenses?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraMountId: mountId,
                    productPhotos,
                    exifId: exifIdInput.trim() || null,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                    isZoomLens: lensType === 'zoom',
                    focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                    focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                    minimumFocusDistanceTele: minimumFocusDistanceTele ? parseFloat(minimumFocusDistanceTele) : null,
                    minimumFocusDistanceWide: lensType === 'zoom' && minimumFocusDistanceWide ? parseFloat(minimumFocusDistanceWide) : null,
                    maximumMagnificationTele: maximumMagnificationTele ? parseFloat(maximumMagnificationTele) : null,
                    maximumMagnificationWide: lensType === 'zoom' && maximumMagnificationWide ? parseFloat(maximumMagnificationWide) : null,
                    entrancePupilDistanceTele: entrancePupilDistanceTele ? parseFloat(entrancePupilDistanceTele) : null,
                    entrancePupilDistanceWide: lensType === 'zoom' && entrancePupilDistanceWide ? parseFloat(entrancePupilDistanceWide) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            setLenses(prev => prev.map(l => l.id !== target.id ? l : {
                ...l,
                name: nameInput.trim(),
                slug: data.slug,
                cameraMount: resolvedMount,
                productPhotos,
                exifId: exifIdInput.trim() || null,
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                imageInfo: getLensImagePathWithFallback(productPhotos),
                isZoomLens: lensType === 'zoom',
                focalLengthTele: focalLengthTele ? parseInt(focalLengthTele) : null,
                focalLengthWide: lensType === 'zoom' && focalLengthWide ? parseInt(focalLengthWide) : null,
                minimumFocusDistanceTele: minimumFocusDistanceTele ? parseFloat(minimumFocusDistanceTele) : null,
                minimumFocusDistanceWide: lensType === 'zoom' && minimumFocusDistanceWide ? parseFloat(minimumFocusDistanceWide) : null,
                maximumMagnificationTele: maximumMagnificationTele ? parseFloat(maximumMagnificationTele) : null,
                maximumMagnificationWide: lensType === 'zoom' && maximumMagnificationWide ? parseFloat(maximumMagnificationWide) : null,
                entrancePupilDistanceTele: entrancePupilDistanceTele ? parseFloat(entrancePupilDistanceTele) : null,
                entrancePupilDistanceWide: lensType === 'zoom' && entrancePupilDistanceWide ? parseFloat(entrancePupilDistanceWide) : null,
            }))
            router.refresh()
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/lenses?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setLenses(prev => prev.filter(l => l.id !== target.id))
            close()
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                    {manufacturer.name} Lenses
                </h2>
                <Link
                    href="/lenses"
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    ← Back to Lenses
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {lenses.map((lens) => (
                    <div key={lens.id} className="group/card relative">
                        <Link
                            href={`/lenses/${manufacturer.slug}/${lens.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={lens.imageInfo.src}
                                    fallback={lens.imageInfo.fallback}
                                    alt={lens.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                                {lens.cameraMount && (
                                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-gray-100 text-gray-600 font-medium px-1.5 py-0.5 rounded-full">
                                        {lens.cameraMount.slug.toUpperCase()}
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
                            </div>
                        </Link>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openEdit(lens)}
                                    title="Edit lens"
                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => openDelete(lens)}
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
                ))}
                {isSuperuser && (
                    <button
                        onClick={openAdd}
                        className="min-h-[9rem] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs font-medium">Add lens</span>
                    </button>
                )}
            </div>
            {lenses.length === 0 && !isSuperuser && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm mt-4">
                    <div className="text-6xl mb-4">🔭</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No lenses found</h3>
                    <p className="text-gray-600 mb-4">
                        No lens models are currently available for {manufacturer.name}.
                    </p>
                    <Link href="/lenses" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Browse all manufacturers
                    </Link>
                </div>
            )}

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {modal === 'edit' ? 'Edit lens' : 'Add lens'}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} 24-70mm f/2.8`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                        <input
                            type="text"
                            value={productIdInput}
                            onChange={e => setProductIdInput(e.target.value)}
                            placeholder="e.g. SEL2470GM2"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
                        <input
                            type="url"
                            value={productUrlInput}
                            onChange={e => setProductUrlInput(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Camera mount <span className="text-red-500">*</span></label>
                        <select
                            value={mountId}
                            onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— Select a mount —</option>
                            {cameraMounts.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">EXIF lens ID</label>
                        <input
                            type="text"
                            value={exifIdInput}
                            onChange={e => setExifIdInput(e.target.value)}
                            placeholder="e.g. FE 24-70mm F2.8 GM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* ── Optics section ── */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Optics</p>

                            {/* Prime / Zoom tabs */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setLensType('prime'); setFocalLengthWide(''); setMinimumFocusDistanceWide(''); setMaximumMagnificationWide(''); setEntrancePupilDistanceWide('') }}
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
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={focalLengthTele}
                                        onChange={e => setFocalLengthTele(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-3"
                                    />
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum focus distance (m)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={minimumFocusDistanceTele}
                                        onChange={e => setMinimumFocusDistanceTele(e.target.value)}
                                        placeholder="e.g. 0.28"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-3"
                                    />
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Maximum magnification (×)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={maximumMagnificationTele}
                                        onChange={e => setMaximumMagnificationTele(e.target.value)}
                                        placeholder="e.g. 0.30"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                                    />
                                    <p className="text-xs text-gray-400 mb-2">Reproduction ratio at closest focus, e.g. 0.30 for 0.30× (1:3.3).</p>
                                    {/* Entrance pupil distance */}
                                    <div className="flex items-center gap-1 mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Entrance pupil distance (mm)</label>
                                        <div className="relative group/tt inline-block">
                                            <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                                Distance from the lens mount flange to the entrance pupil — the apparent position of the aperture as seen from the front of the lens.<br /><br />
                                                To select the correct dome port extension, the centre of the dome should align with the entrance pupil. Knowing this distance allows calculating the extension ring stack needed for a given housing and port combination.
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={entrancePupilDistanceTele}
                                        onChange={e => setEntrancePupilDistanceTele(e.target.value)}
                                        placeholder="e.g. 95"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-2"
                                    />
                                </>
                            ) : (
                                <div>
                                    {/* Focal lengths */}
                                    <div className="flex gap-3 mb-1">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Wide end (mm)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={focalLengthWide}
                                                onChange={e => setFocalLengthWide(e.target.value)}
                                                placeholder="e.g. 24"
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${rangeError ? 'border-red-400' : 'border-gray-300'}`}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tele end (mm)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
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

                                    {/* Minimum focus distance */}
                                    <div className="flex gap-3 mb-3">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min. focus dist. wide (m)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={minimumFocusDistanceWide}
                                                onChange={e => setMinimumFocusDistanceWide(e.target.value)}
                                                placeholder="e.g. 0.38"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min. focus dist. tele (m)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={minimumFocusDistanceTele}
                                                onChange={e => setMinimumFocusDistanceTele(e.target.value)}
                                                placeholder="e.g. 0.38"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                    </div>

                                    {/* Maximum magnification */}
                                    <div className="flex gap-3 mb-1">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max. magnification wide (×)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={maximumMagnificationWide}
                                                onChange={e => setMaximumMagnificationWide(e.target.value)}
                                                placeholder="e.g. 0.20"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max. magnification tele (×)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={maximumMagnificationTele}
                                                onChange={e => setMaximumMagnificationTele(e.target.value)}
                                                placeholder="e.g. 0.30"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2">Reproduction ratio at closest focus, e.g. 0.30 for 0.30× (1:3.3).</p>

                                    {/* Entrance pupil distance */}
                                    <div className="flex items-center gap-1 mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Entrance pupil distance (mm)</label>
                                        <div className="relative group/tt inline-block">
                                            <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                                Distance from the lens mount flange to the entrance pupil — the apparent position of the aperture as seen from the front of the lens.<br /><br />
                                                To select the correct dome port extension, the centre of the dome should align with the entrance pupil. For zoom lenses this distance can shift significantly between the wide and tele ends.
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mb-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Entrance pupil wide (mm)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={entrancePupilDistanceWide}
                                                onChange={e => setEntrancePupilDistanceWide(e.target.value)}
                                                placeholder="e.g. 82"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Entrance pupil tele (mm)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={entrancePupilDistanceTele}
                                                onChange={e => setEntrancePupilDistanceTele(e.target.value)}
                                                placeholder="e.g. 120"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product photos</label>
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                            onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
                        >
                            <p className="text-sm text-gray-500">Click, drag & drop, or paste images here</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={e => handleFilesAdd(e.target.files)}
                            />
                        </div>

                        {photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {photos.map((slot, idx) => (
                                    <div
                                        key={slot.kind === 'new' ? slot.id : slot.path}
                                        draggable
                                        onDragStart={e => handlePhotoDragStart(e, idx)}
                                        onDragOver={e => handlePhotoDragOver(e, idx)}
                                        onDragEnd={handlePhotoDragEnd}
                                        className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing ${dragPhotoIdx === idx ? 'border-blue-500 opacity-50' : 'border-gray-200'}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={getSlotPreview(slot)} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(idx)}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={close}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleAdd}
                                disabled={loading || !nameInput.trim() || mountId === ''}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add lens'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {modal === 'delete' && target && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete lens</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{target.name}</strong>? This cannot be undone.
                        </p>
                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={close}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
