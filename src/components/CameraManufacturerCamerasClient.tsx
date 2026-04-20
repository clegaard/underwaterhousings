'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { withBase, getCameraImagePathWithFallback } from '@/lib/images'

interface Camera {
    id: number
    name: string
    slug: string
    description: string | null
    housings: { id: number }[]
    cameraMount: { id: number; name: string; slug: string } | null
    interchangeableLens: boolean
    canBeUsedWithoutAHousing: boolean
    exifId: string | null
    productPhotos: string[]
    imageInfo: { src: string; fallback: string }
    // pricing
    priceAmount: string | null
    priceCurrency: string | null
    // sensor
    sensorWidth: number | null
    sensorHeight: number | null
    megapixels: number | null
    // fixed-lens fields
    isZoomLens: boolean
    focalLengthTele: number | null
    focalLengthWide: number | null
    minimumFocusDistanceTele: number | null
    minimumFocusDistanceWide: number | null
    maximumMagnification: number | null
    // waterproof-without-housing fields
    depthRating: number | null
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
    cameras: Camera[]
    manufacturer: Manufacturer
    cameraMounts: CameraMount[]
    isSuperuser: boolean
}

export default function CameraManufacturerCamerasClient({ cameras: initial, manufacturer, cameraMounts, isSuperuser }: Props) {
    const router = useRouter()
    const [cameras, setCameras] = useState(initial)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Camera | null>(null)

    // Shared form state (add + edit)
    const [nameInput, setNameInput] = useState('')
    const [descriptionInput, setDescriptionInput] = useState('')
    const [interchangeableLens, setInterchangeableLens] = useState(true)
    const [canBeUsedWithoutAHousing, setCanBeUsedWithoutAHousing] = useState(false)
    const [mountId, setMountId] = useState<number | ''>('')
    const [exifIdInput, setExifIdInput] = useState('')
    // pricing
    const [priceAmount, setPriceAmount] = useState<number | ''>('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    // sensor
    const [sensorWidth, setSensorWidth] = useState<number | ''>('')
    const [sensorHeight, setSensorHeight] = useState<number | ''>('')
    const [megapixels, setMegapixels] = useState<number | ''>('')
    // fixed-lens fields
    const [isZoomLens, setIsZoomLens] = useState(false)
    const [focalLengthTele, setFocalLengthTele] = useState<number | ''>('')
    const [focalLengthWide, setFocalLengthWide] = useState<number | ''>('')
    const [minFocusTele, setMinFocusTele] = useState<number | ''>('')
    const [minFocusWide, setMinFocusWide] = useState<number | ''>('')
    const [maxMagnification, setMaxMagnification] = useState<number | ''>('')
    // waterproof depth
    const [depthRating, setDepthRating] = useState<number | ''>('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setDescriptionInput('')
        setInterchangeableLens(true)
        setCanBeUsedWithoutAHousing(false)
        setMountId('')
        setExifIdInput('')
        setPriceAmount('')
        setPriceCurrency('USD')
        setSensorWidth('')
        setSensorHeight('')
        setMegapixels('')
        setIsZoomLens(false)
        setFocalLengthTele('')
        setFocalLengthWide('')
        setMinFocusTele('')
        setMinFocusWide('')
        setMaxMagnification('')
        setDepthRating('')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setDragPhotoIdx(null)
    }

    function openAdd() {
        resetForm()
        setError(null)
        setModal('add')
    }

    function openEdit(c: Camera) {
        setTarget(c)
        setNameInput(c.name)
        setDescriptionInput(c.description ?? '')
        setInterchangeableLens(c.interchangeableLens)
        setCanBeUsedWithoutAHousing(c.canBeUsedWithoutAHousing)
        setMountId(c.cameraMount?.id ?? '')
        setExifIdInput(c.exifId ?? '')
        setPriceAmount(c.priceAmount !== null ? parseFloat(c.priceAmount) : '')
        setPriceCurrency(c.priceCurrency ?? 'USD')
        setSensorWidth(c.sensorWidth ?? '')
        setSensorHeight(c.sensorHeight ?? '')
        setMegapixels(c.megapixels ?? '')
        setIsZoomLens(c.isZoomLens)
        setFocalLengthTele(c.focalLengthTele ?? '')
        setFocalLengthWide(c.focalLengthWide ?? '')
        setMinFocusTele(c.minimumFocusDistanceTele ?? '')
        setMinFocusWide(c.minimumFocusDistanceWide ?? '')
        setMaxMagnification(c.maximumMagnification ?? '')
        setDepthRating(c.depthRating ?? '')
        setPhotos(c.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null)
        setError(null)
        setModal('edit')
    }

    function openDelete(c: Camera) {
        setTarget(c)
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
                const res = await fetch('/api/admin/cameras/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch('/api/admin/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    description: descriptionInput.trim() || null,
                    manufacturerId: manufacturer.id,
                    interchangeableLens,
                    canBeUsedWithoutAHousing,
                    cameraMountId: interchangeableLens && mountId !== '' ? mountId : null,
                    productPhotos,
                    exifId: exifIdInput.trim() || null,
                    priceAmount: priceAmount !== '' ? priceAmount : null,
                    priceCurrency: priceCurrency || 'USD',
                    sensorWidth: sensorWidth !== '' ? sensorWidth : null,
                    sensorHeight: sensorHeight !== '' ? sensorHeight : null,
                    megapixels: megapixels !== '' ? megapixels : null,
                    isZoomLens: !interchangeableLens && isZoomLens,
                    focalLengthTele: !interchangeableLens && focalLengthTele !== '' ? focalLengthTele : null,
                    focalLengthWide: !interchangeableLens && isZoomLens && focalLengthWide !== '' ? focalLengthWide : null,
                    minimumFocusDistanceTele: !interchangeableLens && minFocusTele !== '' ? minFocusTele : null,
                    minimumFocusDistanceWide: !interchangeableLens && minFocusWide !== '' ? minFocusWide : null,
                    maximumMagnification: !interchangeableLens && maxMagnification !== '' ? maxMagnification : null,
                    depthRating: canBeUsedWithoutAHousing && depthRating !== '' ? depthRating : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            const newCamera: Camera = {
                id: data.id,
                name: nameInput.trim(),
                description: descriptionInput.trim() || null,
                slug: data.slug,
                housings: [],
                interchangeableLens,
                canBeUsedWithoutAHousing,
                cameraMount: interchangeableLens && resolvedMount ? resolvedMount : null,
                exifId: exifIdInput.trim() || null,
                productPhotos,
                imageInfo: getCameraImagePathWithFallback(productPhotos),
                priceAmount: priceAmount !== '' ? String(priceAmount) : null,
                priceCurrency: priceCurrency || 'USD',
                sensorWidth: sensorWidth !== '' ? sensorWidth : null,
                sensorHeight: sensorHeight !== '' ? sensorHeight : null,
                megapixels: megapixels !== '' ? megapixels : null,
                isZoomLens: !interchangeableLens && isZoomLens,
                focalLengthTele: !interchangeableLens && focalLengthTele !== '' ? focalLengthTele : null,
                focalLengthWide: !interchangeableLens && isZoomLens && focalLengthWide !== '' ? focalLengthWide : null,
                minimumFocusDistanceTele: !interchangeableLens && minFocusTele !== '' ? minFocusTele : null,
                minimumFocusDistanceWide: !interchangeableLens && minFocusWide !== '' ? minFocusWide : null,
                maximumMagnification: !interchangeableLens && maxMagnification !== '' ? maxMagnification : null,
                depthRating: canBeUsedWithoutAHousing && depthRating !== '' ? depthRating : null,
            }
            setCameras(prev => [...prev, newCamera])
            router.refresh()
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch(`/api/admin/cameras?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    description: descriptionInput.trim() || null,
                    manufacturerId: manufacturer.id,
                    interchangeableLens,
                    canBeUsedWithoutAHousing,
                    cameraMountId: interchangeableLens && mountId !== '' ? mountId : null,
                    productPhotos,
                    exifId: exifIdInput.trim() || null,
                    priceAmount: priceAmount !== '' ? priceAmount : null,
                    priceCurrency: priceCurrency || 'USD',
                    sensorWidth: sensorWidth !== '' ? sensorWidth : null,
                    sensorHeight: sensorHeight !== '' ? sensorHeight : null,
                    megapixels: megapixels !== '' ? megapixels : null,
                    isZoomLens: !interchangeableLens && isZoomLens,
                    focalLengthTele: !interchangeableLens && focalLengthTele !== '' ? focalLengthTele : null,
                    focalLengthWide: !interchangeableLens && isZoomLens && focalLengthWide !== '' ? focalLengthWide : null,
                    minimumFocusDistanceTele: !interchangeableLens && minFocusTele !== '' ? minFocusTele : null,
                    minimumFocusDistanceWide: !interchangeableLens && minFocusWide !== '' ? minFocusWide : null,
                    maximumMagnification: !interchangeableLens && maxMagnification !== '' ? maxMagnification : null,
                    depthRating: canBeUsedWithoutAHousing && depthRating !== '' ? depthRating : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
            setCameras(prev => prev.map(c => c.id !== target.id ? c : {
                ...c,
                name: nameInput.trim(),
                description: descriptionInput.trim() || null,
                slug: data.slug,
                interchangeableLens,
                canBeUsedWithoutAHousing,
                cameraMount: interchangeableLens && resolvedMount ? resolvedMount : null,
                productPhotos,
                exifId: exifIdInput.trim() || null,
                priceAmount: priceAmount !== '' ? String(priceAmount) : null,
                priceCurrency: priceCurrency || 'USD',
                sensorWidth: sensorWidth !== '' ? sensorWidth : null,
                sensorHeight: sensorHeight !== '' ? sensorHeight : null,
                megapixels: megapixels !== '' ? megapixels : null,
                isZoomLens: !interchangeableLens && isZoomLens,
                focalLengthTele: !interchangeableLens && focalLengthTele !== '' ? focalLengthTele : null,
                focalLengthWide: !interchangeableLens && isZoomLens && focalLengthWide !== '' ? focalLengthWide : null,
                minimumFocusDistanceTele: !interchangeableLens && minFocusTele !== '' ? minFocusTele : null,
                minimumFocusDistanceWide: !interchangeableLens && minFocusWide !== '' ? minFocusWide : null,
                maximumMagnification: !interchangeableLens && maxMagnification !== '' ? maxMagnification : null,
                depthRating: canBeUsedWithoutAHousing && depthRating !== '' ? depthRating : null,
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
            const res = await fetch(`/api/admin/cameras?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setCameras(prev => prev.filter(c => c.id !== target.id))
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
                    All {manufacturer.name} Camera Models
                </h2>
                <Link
                    href="/cameras"
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    ← Back to Cameras
                </Link>
            </div>

            {cameras.length > 0 || isSuperuser ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {cameras.map((camera) => (
                        <div key={camera.id} className="group/card relative">
                            <Link
                                href={`/cameras/${manufacturer.slug}/${camera.slug}`}
                                className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                            >
                                <div className="relative h-28 bg-gray-50">
                                    <HousingImage
                                        src={camera.imageInfo.src}
                                        fallback={camera.imageInfo.fallback}
                                        alt={camera.name}
                                        className="object-contain p-3 w-full h-full"
                                    />
                                    {camera.housings.length > 0 && (
                                        <span className="absolute top-1.5 right-1.5 text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded-full">
                                            {camera.housings.length} housing{camera.housings.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="px-2.5 py-2">
                                    <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                        {camera.name}
                                    </p>
                                    {camera.cameraMount && (
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{camera.cameraMount.name}</p>
                                    )}
                                    {camera.priceAmount && (
                                        <p className="text-xs font-medium text-green-600 mt-1">
                                            ${parseFloat(camera.priceAmount).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </Link>
                            {isSuperuser && (
                                <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={() => openEdit(camera)}
                                        title="Edit camera"
                                        className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => openDelete(camera)}
                                        title="Delete camera"
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

                    {/* Add camera card — superuser only */}
                    {isSuperuser && (
                        <button
                            onClick={openAdd}
                            className="min-h-[9rem] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs font-medium">Add camera</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <div className="text-6xl mb-4">📷</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras found</h3>
                    <p className="text-gray-600 mb-4">
                        No camera models are currently available for {manufacturer.name}.
                    </p>
                    <Link href="/cameras" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
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
                            {modal === 'edit' ? 'Edit camera' : 'Add camera'}
                        </h3>

                        {/* Name */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} A7R V`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Description */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={descriptionInput}
                            onChange={e => setDescriptionInput(e.target.value)}
                            placeholder="Short description of the camera..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 resize-none"
                        />

                        {/* Interchangeable lens */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Lens type</p>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => { setInterchangeableLens(false); setMountId('') }}
                                    className={`flex-1 py-1.5 transition-colors ${!interchangeableLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Fixed
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInterchangeableLens(true)}
                                    className={`flex-1 py-1.5 border-l border-gray-200 transition-colors ${interchangeableLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Interchangeable
                                </button>
                            </div>
                            {interchangeableLens ? (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Camera mount</label>
                                    <select
                                        value={mountId}
                                        onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    >
                                        <option value="">— None —</option>
                                        {cameraMounts.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fixed lens optics</p>

                                    {/* Prime / Zoom selector */}
                                    <div className="flex mb-3 rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => { setIsZoomLens(false); setFocalLengthWide(''); setMinFocusWide('') }}
                                            className={`flex-1 py-1.5 transition-colors ${!isZoomLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            Prime
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsZoomLens(true)}
                                            className={`flex-1 py-1.5 border-l border-gray-200 transition-colors ${isZoomLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            Zoom
                                        </button>
                                    </div>

                                    {/* Focal length(s) */}
                                    {isZoomLens ? (
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Focal length — wide (mm)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    value={focalLengthWide}
                                                    onChange={e => setFocalLengthWide(e.target.value !== '' ? parseInt(e.target.value) : '')}
                                                    placeholder="e.g. 25"
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Focal length — tele (mm)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    value={focalLengthTele}
                                                    onChange={e => setFocalLengthTele(e.target.value !== '' ? parseInt(e.target.value) : '')}
                                                    placeholder="e.g. 100"
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Focal length (mm)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={focalLengthTele}
                                                onChange={e => setFocalLengthTele(e.target.value !== '' ? parseInt(e.target.value) : '')}
                                                placeholder="e.g. 90"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                    )}

                                    {/* Minimum focus distance */}
                                    {isZoomLens ? (
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus — wide (m)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={minFocusWide}
                                                    onChange={e => setMinFocusWide(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                                    placeholder="e.g. 0.10"
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus — tele (m)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={minFocusTele}
                                                    onChange={e => setMinFocusTele(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                                    placeholder="e.g. 0.20"
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus distance (m)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={minFocusTele}
                                                onChange={e => setMinFocusTele(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                                placeholder="e.g. 0.28"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Max magnification (e.g. 4.0 for 4×)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={maxMagnification}
                                            onChange={e => setMaxMagnification(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                            placeholder="e.g. 4.0"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Waterproof without housing */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={canBeUsedWithoutAHousing}
                                    onChange={e => setCanBeUsedWithoutAHousing(e.target.checked)}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm font-medium text-gray-700">Camera is waterproof without a housing</span>
                            </label>
                            {canBeUsedWithoutAHousing && (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Depth rating (m)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={depthRating}
                                        onChange={e => setDepthRating(e.target.value !== '' ? parseInt(e.target.value) : '')}
                                        placeholder="e.g. 15"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Sensor */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sensor</p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sensor width (mm)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={sensorWidth}
                                        onChange={e => setSensorWidth(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                        placeholder="e.g. 35.9"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sensor height (mm)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={sensorHeight}
                                        onChange={e => setSensorHeight(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                        placeholder="e.g. 24.0"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Megapixels</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={megapixels}
                                    onChange={e => setMegapixels(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                    placeholder="e.g. 61"
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pricing</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={priceAmount}
                                        onChange={e => setPriceAmount(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                                        placeholder="e.g. 3499"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={priceCurrency}
                                        onChange={e => setPriceCurrency(e.target.value.toUpperCase())}
                                        placeholder="USD"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* EXIF ID */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">EXIF camera ID</label>
                        <input
                            type="text"
                            value={exifIdInput}
                            onChange={e => setExifIdInput(e.target.value)}
                            placeholder="e.g. ILCE-7RM5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

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
                                disabled={loading || !nameInput.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save' : 'Add'}
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete camera?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{target.name}</strong>?
                        </p>
                        {target.housings.length > 0 && (
                            <p className="text-sm text-amber-600 mb-4">
                                This camera has {target.housings.length} housing{target.housings.length !== 1 ? 's' : ''} associated with it and cannot be deleted.
                            </p>
                        )}
                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={handleDelete}
                                disabled={loading || target.housings.length > 0}
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
