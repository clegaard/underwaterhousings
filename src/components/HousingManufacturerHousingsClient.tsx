'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { getHousingImagePathWithFallback } from '@/lib/images'

interface Housing {
    id: number
    name: string
    slug: string
    description: string | null
    material: string | null
    housingMountId: number | null
    depthRating: number | null
    priceAmount: number | null
    priceCurrency: string | null
    productPhotos: string[]
    interchangeablePort: boolean
    camera: { id: number; name: string; brand: { name: string } } | null
    imageInfo: { src: string; fallback: string }
}

interface Manufacturer {
    id: number
    name: string
    slug: string
}

interface HousingMount {
    id: number
    name: string
    slug: string
}

interface Camera {
    id: number
    name: string
    brand: { name: string }
}

type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

interface Props {
    housings: Housing[]
    manufacturer: Manufacturer
    housingMounts: HousingMount[]
    cameras: Camera[]
    isSuperuser: boolean
}

export default function HousingManufacturerHousingsClient({
    housings: initial,
    manufacturer,
    housingMounts,
    cameras,
    isSuperuser,
}: Props) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [housings, setHousings] = useState(initial)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Housing | null>(null)

    // Form state
    const [nameInput, setNameInput] = useState('')
    const [cameraSearch, setCameraSearch] = useState('')
    const [cameraId, setCameraId] = useState<number | ''>('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [depthRating, setDepthRating] = useState('')
    const [priceAmount, setPriceAmount] = useState('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [interchangeablePort, setInterchangeablePort] = useState(true)
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filtered cameras for the search dropdown
    const filteredCameras = cameras.filter(c =>
        cameraSearch.trim() === '' ||
        `${c.brand.name} ${c.name}`.toLowerCase().includes(cameraSearch.toLowerCase())
    )
    const selectedCamera = cameras.find(c => c.id === cameraId) ?? null

    function resetForm() {
        setNameInput('')
        setCameraSearch('')
        setCameraId('')
        setMountId('')
        setDepthRating('')
        setPriceAmount('')
        setPriceCurrency('USD')
        setInterchangeablePort(true)
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setDragPhotoIdx(null)
        setError(null)
    }

    function openAdd() {
        resetForm()
        setTarget(null)
        setModal('add')
    }

    function openEdit(h: Housing) {
        setTarget(h)
        setNameInput(h.name)
        setCameraId(h.camera?.id ?? '')
        setCameraSearch('')
        setMountId(h.housingMountId ?? '')
        setDepthRating(h.depthRating != null ? String(h.depthRating) : '')
        setPriceAmount(h.priceAmount != null ? String(h.priceAmount) : '')
        setPriceCurrency(h.priceCurrency ?? 'USD')
        setInterchangeablePort(h.interchangeablePort)
        setPhotos(h.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null)
        setError(null)
        setModal('edit')
    }

    function openDelete(h: Housing) {
        setTarget(h)
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
        if (!modal || modal === 'delete') return
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
        return slot.kind === 'existing' ? slot.path : slot.previewUrl
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
                const res = await fetch('/api/admin/housings/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handleAdd() {
        if (!nameInput.trim() || !cameraId) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch('/api/admin/housings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraId,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount ? priceAmount : undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const cam = cameras.find(c => c.id === cameraId) ?? null
            const newHousing: Housing = {
                id: data.id,
                name: nameInput.trim(),
                slug: data.slug,
                description: null,
                material: null,
                housingMountId: mountId !== '' ? (mountId as number) : null,
                depthRating: depthRating ? parseInt(depthRating) : null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                interchangeablePort,
                productPhotos,
                camera: cam ? { id: cam.id, name: cam.name, brand: cam.brand } : null,
                imageInfo: getHousingImagePathWithFallback(productPhotos),
            }
            setHousings(prev => [...prev, newHousing])
            router.refresh()
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim() || !cameraId) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch(`/api/admin/housings?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraId,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount ? priceAmount : undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const cam = cameras.find(c => c.id === cameraId) ?? null
            setHousings(prev => prev.map(h => h.id !== target.id ? h : {
                ...h,
                name: nameInput.trim(),
                slug: data.slug,
                housingMountId: mountId !== '' ? (mountId as number) : null,
                depthRating: depthRating ? parseInt(depthRating) : null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                interchangeablePort,
                productPhotos,
                camera: cam ? { id: cam.id, name: cam.name, brand: cam.brand } : null,
                imageInfo: getHousingImagePathWithFallback(productPhotos),
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
            const res = await fetch(`/api/admin/housings?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setHousings(prev => prev.filter(h => h.id !== target.id))
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
                    {manufacturer.name} Housings
                </h2>
                <Link
                    href="/housings"
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    ← Back to Housings
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {housings.map((housing) => (
                    <div key={housing.id} className="group/card relative">
                        <Link
                            href={`/housings/${manufacturer.slug}/${housing.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={housing.imageInfo.src}
                                    fallback={housing.imageInfo.fallback}
                                    alt={housing.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                                {housing.depthRating != null && (
                                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded-full">
                                        {housing.depthRating}m
                                    </span>
                                )}
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                    {housing.name}
                                </p>
                                {housing.camera && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        {housing.camera.brand.name} {housing.camera.name}
                                    </p>
                                )}
                                {housing.priceAmount != null && (
                                    <p className="text-xs font-medium text-green-600 mt-1">
                                        ${housing.priceAmount.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </Link>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openEdit(housing)}
                                    title="Edit housing"
                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => openDelete(housing)}
                                    title="Delete housing"
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
                        <span className="text-xs font-medium">Add housing</span>
                    </button>
                )}
            </div>
            {housings.length === 0 && !isSuperuser && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm mt-4">
                    <div className="text-6xl mb-4">🤿</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No housings found</h3>
                    <p className="text-gray-600 mb-4">
                        No housings are currently available from {manufacturer.name}.
                    </p>
                    <Link href="/housings" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Browse all manufacturers
                    </Link>
                </div>
            )}

            {/* Add / Edit housing modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{modal === 'edit' ? 'Edit housing' : 'Add housing'}</h3>

                        {/* Name */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder={`e.g. ${manufacturer.name} NA-A7IV`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Compatible camera body */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Compatible camera body <span className="text-red-500">*</span>
                        </label>
                        {selectedCamera ? (
                            <div className="flex items-center gap-2 mb-4">
                                <span className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 font-medium">
                                    {selectedCamera.brand.name} {selectedCamera.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setCameraId(''); setCameraSearch('') }}
                                    className="text-sm text-gray-500 hover:text-red-600 px-2 py-1"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={cameraSearch}
                                    onChange={e => setCameraSearch(e.target.value)}
                                    placeholder="Search cameras…"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                                />
                                <div className="border border-gray-200 rounded-lg mb-4 max-h-44 overflow-y-auto">
                                    {filteredCameras.length === 0 ? (
                                        <p className="px-3 py-2 text-sm text-gray-400">No cameras found</p>
                                    ) : (
                                        filteredCameras.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => { setCameraId(c.id); setCameraSearch('') }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                                            >
                                                <span className="text-gray-500 mr-1">{c.brand.name}</span>
                                                {c.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* Interchangeable port checkbox */}
                        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={interchangeablePort}
                                onChange={e => {
                                    setInterchangeablePort(e.target.checked)
                                    if (!e.target.checked) setMountId('')
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Interchangeable port</span>
                        </label>

                        {/* Port system (housing mount) */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port system</label>
                        <select
                            value={mountId}
                            onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            disabled={!interchangeablePort}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            <option value="">— None —</option>
                            {housingMounts.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>

                        {/* Depth rating */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max depth rating (m)</label>
                        <input
                            type="number"
                            min="0"
                            value={depthRating}
                            onChange={e => setDepthRating(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Price */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={priceAmount}
                                onChange={e => setPriceAmount(e.target.value)}
                                placeholder="e.g. 3595"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                            <select
                                value={priceCurrency}
                                onChange={e => setPriceCurrency(e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                                <option>USD</option>
                                <option>EUR</option>
                                <option>GBP</option>
                                <option>JPY</option>
                                <option>AUD</option>
                            </select>
                        </div>

                        {/* Product photos */}
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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => handleFilesAdd(e.target.files)}
                        />

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
                                            <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-xs py-0.5 font-medium">
                                                Cover
                                            </span>
                                        )}
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

                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleAdd}
                                disabled={loading || !nameInput.trim() || !cameraId}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save' : 'Add housing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {modal === 'delete' && target && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete housing?</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{target.name}</strong>? This cannot be undone.
                        </p>
                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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
