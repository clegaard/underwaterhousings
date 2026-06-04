'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { withBase, getCameraImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'
import { useCurrency } from '@/components/CurrencyContext'
import PhotoUploadField from '@/components/PhotoUploadField'
import { uploadPhotoSlots, type PhotoSlot } from '@/lib/photoUpload'

interface Camera {
    id: number
    name: string
    slug: string
    description: string | null
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
    housings: { id: number }[]
    cameraMount: { id: number; name: string; slug: string } | null
    interchangeableLens: boolean
    canBeUsedWithoutAHousing: boolean
    exifId: string | null
    sensorWidth: number | null
    sensorHeight: number | null
    megapixels: number | null
    isZoomLens: boolean
    focalLengthTele: number | null
    focalLengthWide: number | null
    minimumFocusDistanceTele: number | null
    minimumFocusDistanceWide: number | null
    maximumMagnification: number | null
    depthRating: number | null
}

interface Manufacturer {
    id: number
    name: string
    slug: string
    logoPath: string | null
    logoContainsName: boolean
    _count: { cameras: number }
    cameras: Camera[]
}

interface CameraMount {
    id: number
    name: string
    slug: string
}

interface Props {
    manufacturers: Manufacturer[]
    cameraMounts: CameraMount[]
    isSuperuser: boolean
}

export default function CameraManufacturersClient({ manufacturers: initial, cameraMounts, isSuperuser }: Props) {
    const router = useRouter()
    const { formatMoney } = useCurrency()
    const [manufacturers, setManufacturers] = useState(initial)

    // ── Manufacturer modal state ──────────────────────────────────────────────
    const [modal, setModal] = useState<'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Manufacturer | null>(null)
    const [nameInput, setNameInput] = useState('')
    const [mfrLoading, setMfrLoading] = useState(false)
    const [mfrError, setMfrError] = useState<string | null>(null)

    function openEdit(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setNameInput(m.name); setMfrError(null); setModal('edit')
    }
    function openDelete(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setMfrError(null); setModal('delete')
    }
    function close() { setModal(null); setTarget(null); setMfrError(null) }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setMfrLoading(true); setMfrError(null)
        try {
            const res = await fetch(`/api/admin/camera-manufacturers?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setMfrError(data.error ?? 'Failed to update'); return }
            setManufacturers(prev => prev.map(m => m.id === target.id ? { ...m, name: data.name, slug: data.slug } : m))
            close()
        } catch { setMfrError('Network error') }
        finally { setMfrLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setMfrLoading(true); setMfrError(null)
        try {
            const res = await fetch(`/api/admin/camera-manufacturers?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setMfrError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.filter(m => m.id !== target.id))
            close()
        } catch { setMfrError('Network error') }
        finally { setMfrLoading(false) }
    }

    // ── Camera modal state ────────────────────────────────────────────────────
    const [cameraModal, setCameraModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [cameraTarget, setCameraTarget] = useState<Camera | null>(null)
    const [cameraTargetMfr, setCameraTargetMfr] = useState<Manufacturer | null>(null)
    const [camName, setCamName] = useState('')
    const [camDesc, setCamDesc] = useState('')
    const [interchangeableLens, setInterchangeableLens] = useState(true)
    const [canBeUsedWithoutAHousing, setCanBeUsedWithoutAHousing] = useState(false)
    const [mountId, setMountId] = useState<number | ''>('')
    const [exifIdInput, setExifIdInput] = useState('')
    const [priceAmount, setPriceAmount] = useState<number | ''>('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [sensorWidth, setSensorWidth] = useState<number | ''>('')
    const [sensorHeight, setSensorHeight] = useState<number | ''>('')
    const [megapixels, setMegapixels] = useState<number | ''>('')
    const [isZoomLens, setIsZoomLens] = useState(false)
    const [focalLengthTele, setFocalLengthTele] = useState<number | ''>('')
    const [focalLengthWide, setFocalLengthWide] = useState<number | ''>('')
    const [minFocusTele, setMinFocusTele] = useState<number | ''>('')
    const [minFocusWide, setMinFocusWide] = useState<number | ''>('')
    const [maxMagnification, setMaxMagnification] = useState<number | ''>('')
    const [depthRating, setDepthRating] = useState<number | ''>('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [camLoading, setCamLoading] = useState(false)
    const [camError, setCamError] = useState<string | null>(null)

    function resetCameraForm() {
        setCamName(''); setCamDesc('')
        setInterchangeableLens(true); setCanBeUsedWithoutAHousing(false)
        setMountId(''); setExifIdInput('')
        setPriceAmount(''); setPriceCurrency('USD')
        setSensorWidth(''); setSensorHeight(''); setMegapixels('')
        setIsZoomLens(false)
        setFocalLengthTele(''); setFocalLengthWide('')
        setMinFocusTele(''); setMinFocusWide(''); setMaxMagnification('')
        setDepthRating('')
        setPhotos(prev => { prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) }); return [] })
    }

    function openCameraAdd(mfr: Manufacturer) {
        resetCameraForm(); setCamError(null)
        setCameraTargetMfr(mfr); setCameraModal('add')
    }

    function openCameraEdit(c: Camera, mfr: Manufacturer) {
        setCameraTarget(c); setCameraTargetMfr(mfr)
        setCamName(c.name); setCamDesc(c.description ?? '')
        setInterchangeableLens(c.interchangeableLens)
        setCanBeUsedWithoutAHousing(c.canBeUsedWithoutAHousing)
        setMountId(c.cameraMount?.id ?? '')
        setExifIdInput(c.exifId ?? '')
        setPriceAmount(c.priceAmount !== null ? c.priceAmount : '')
        setPriceCurrency(c.priceCurrency ?? 'USD')
        setSensorWidth(c.sensorWidth ?? ''); setSensorHeight(c.sensorHeight ?? ''); setMegapixels(c.megapixels ?? '')
        setIsZoomLens(c.isZoomLens)
        setFocalLengthTele(c.focalLengthTele ?? ''); setFocalLengthWide(c.focalLengthWide ?? '')
        setMinFocusTele(c.minimumFocusDistanceTele ?? ''); setMinFocusWide(c.minimumFocusDistanceWide ?? '')
        setMaxMagnification(c.maximumMagnification ?? ''); setDepthRating(c.depthRating ?? '')
        setPhotos(c.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setCamError(null)
        setCameraModal('edit')
    }

    function openCameraDelete(c: Camera, mfr: Manufacturer) {
        setCameraTarget(c); setCameraTargetMfr(mfr); setCamError(null); setCameraModal('delete')
    }

    function closeCameraModal() {
        resetCameraForm(); setCameraModal(null); setCameraTarget(null); setCameraTargetMfr(null); setCamError(null)
    }

    function buildCameraPayload() {
        return {
            interchangeableLens,
            canBeUsedWithoutAHousing,
            cameraMountId: interchangeableLens && mountId !== '' ? mountId : null,
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
        }
    }

    function buildCameraLocal(productPhotos: string[]): Omit<Camera, 'id' | 'slug'> {
        const resolvedMount = cameraMounts.find(m => m.id === mountId) ?? null
        const p = buildCameraPayload()
        return {
            name: camName.trim(), description: camDesc.trim() || null, productPhotos, housings: [],
            interchangeableLens: p.interchangeableLens, canBeUsedWithoutAHousing: p.canBeUsedWithoutAHousing,
            cameraMount: p.interchangeableLens && resolvedMount ? resolvedMount : null,
            exifId: p.exifId,
            priceAmount: priceAmount !== '' ? Number(priceAmount) : null,
            priceCurrency: p.priceCurrency,
            sensorWidth: sensorWidth !== '' ? Number(sensorWidth) : null,
            sensorHeight: sensorHeight !== '' ? Number(sensorHeight) : null,
            megapixels: megapixels !== '' ? Number(megapixels) : null,
            isZoomLens: p.isZoomLens,
            focalLengthTele: !p.interchangeableLens && focalLengthTele !== '' ? Number(focalLengthTele) : null,
            focalLengthWide: !p.interchangeableLens && p.isZoomLens && focalLengthWide !== '' ? Number(focalLengthWide) : null,
            minimumFocusDistanceTele: !p.interchangeableLens && minFocusTele !== '' ? Number(minFocusTele) : null,
            minimumFocusDistanceWide: !p.interchangeableLens && minFocusWide !== '' ? Number(minFocusWide) : null,
            maximumMagnification: !p.interchangeableLens && maxMagnification !== '' ? Number(maxMagnification) : null,
            depthRating: p.canBeUsedWithoutAHousing && depthRating !== '' ? Number(depthRating) : null,
        }
    }

    async function handleCameraAdd() {
        if (!camName.trim() || !cameraTargetMfr) return
        setCamLoading(true); setCamError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/cameras/photos', { manufacturerSlug: cameraTargetMfr.slug })
            const res = await fetch('/api/admin/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: camName.trim(), description: camDesc.trim() || null, manufacturerId: cameraTargetMfr.id, productPhotos, ...buildCameraPayload() }),
            })
            const data = await res.json()
            if (!res.ok) { setCamError(data.error ?? 'Failed to create'); return }
            const newCamera: Camera = { id: data.id, slug: data.slug, ...buildCameraLocal(productPhotos) }
            setManufacturers(prev => prev.map(m => m.id === cameraTargetMfr.id
                ? { ...m, cameras: [...m.cameras, newCamera], _count: { cameras: m._count.cameras + 1 } }
                : m
            ))
            router.refresh()
            closeCameraModal()
        } catch (err) {
            setCamError(err instanceof Error ? err.message : 'Network error')
        } finally { setCamLoading(false) }
    }

    async function handleCameraEdit() {
        if (!cameraTarget || !cameraTargetMfr || !camName.trim()) return
        setCamLoading(true); setCamError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/cameras/photos', { manufacturerSlug: cameraTargetMfr!.slug })
            const res = await fetch(`/api/admin/cameras?id=${cameraTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: camName.trim(), description: camDesc.trim() || null, manufacturerId: cameraTargetMfr.id, productPhotos, ...buildCameraPayload() }),
            })
            const data = await res.json()
            if (!res.ok) { setCamError(data.error ?? 'Failed to update'); return }
            const updated = { id: cameraTarget.id, slug: data.slug, ...buildCameraLocal(productPhotos) }
            setManufacturers(prev => prev.map(m => m.id !== cameraTargetMfr.id ? m : {
                ...m,
                cameras: m.cameras.map(c => c.id !== cameraTarget.id ? c : { ...c, ...updated }),
            }))
            router.refresh()
            closeCameraModal()
        } catch (err) {
            setCamError(err instanceof Error ? err.message : 'Network error')
        } finally { setCamLoading(false) }
    }

    async function handleCameraDelete() {
        if (!cameraTarget || !cameraTargetMfr) return
        setCamLoading(true); setCamError(null)
        try {
            const res = await fetch(`/api/admin/cameras?id=${cameraTarget.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setCamError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.map(m => m.id !== cameraTargetMfr.id ? m : {
                ...m,
                cameras: m.cameras.filter(c => c.id !== cameraTarget.id),
                _count: { cameras: m._count.cameras - 1 },
            }))
            closeCameraModal()
        } catch { setCamError('Network error') }
        finally { setCamLoading(false) }
    }

    const withCameras = manufacturers.filter(m => m._count.cameras > 0 || isSuperuser)

    if (withCameras.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-gray-500">No cameras found.</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-10">
                {withCameras.map(manufacturer => (
                    <section key={manufacturer.id}>
                        {/* Manufacturer heading */}
                        <div className="flex items-center gap-3 mb-4 group/mfr">
                            {manufacturer.logoPath && manufacturer.logoContainsName ? (
                                <Link href={`/products/${manufacturer.slug}`} className="shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={withBase(manufacturer.logoPath)} alt={`${manufacturer.name} logo`} className="h-9 w-auto max-w-40 object-contain" />
                                </Link>
                            ) : (
                                <>
                                    {manufacturer.logoPath && (
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={withBase(manufacturer.logoPath)} alt="" className="w-full h-full object-contain p-0.5" />
                                        </div>
                                    )}
                                    <Link
                                        href={`/products/${manufacturer.slug}`}
                                        className="text-lg font-semibold text-gray-900 hover:text-blue-700 transition-colors"
                                    >
                                        {manufacturer.name}
                                    </Link>
                                </>
                            )}
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 shrink-0">
                                {manufacturer._count.cameras} camera{manufacturer._count.cameras !== 1 ? 's' : ''}
                            </span>
                            {isSuperuser && (
                                <div className="flex gap-1 opacity-0 group-hover/mfr:opacity-100 transition-opacity">
                                    <button onClick={e => openEdit(manufacturer, e)} title="Edit manufacturer"
                                        className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                        </svg>
                                    </button>
                                    <button onClick={e => openDelete(manufacturer, e)} title="Delete manufacturer"
                                        className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Camera cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {manufacturer.cameras.map(camera => {
                                const imageInfo = getCameraImagePathWithFallback(camera.productPhotos)
                                const price = camera.priceAmount ? Number(camera.priceAmount) : null
                                return (
                                    <div key={camera.id} className="group/card relative">
                                        <Link
                                            href={`/products/${manufacturer.slug}/cameras/${camera.slug}`}
                                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                                        >
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
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
                                                {price !== null && (
                                                    <p className="text-xs font-medium text-green-600 mt-1">
                                                        {formatMoney(price, camera.priceCurrency)}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                        {isSuperuser && (
                                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={() => openCameraEdit(camera, manufacturer)}
                                                    title="Edit camera"
                                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openCameraDelete(camera, manufacturer)}
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
                                )
                            })}

                            {/* Add camera card — superuser only */}
                            {isSuperuser && (
                                <button
                                    onClick={() => openCameraAdd(manufacturer)}
                                    className="min-h-36 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-xs font-medium">Add camera</span>
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* Manufacturer edit modal */}
            {modal === 'edit' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit camera brand</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input autoFocus type="text" value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdit() }}
                            placeholder="e.g. Canon"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />
                        {mfrError && <p className="text-sm text-red-600 mb-3">{mfrError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleEdit} disabled={mfrLoading || !nameInput.trim()}
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
                    onClick={e => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete brand?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{target.name}</strong>?
                        </p>
                        {target._count.cameras > 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                This brand has {target._count.cameras} camera{target._count.cameras !== 1 ? 's' : ''} and cannot be deleted until they are removed.
                            </p>
                        )}
                        {mfrError && <p className="text-sm text-red-600 mb-3">{mfrError}</p>}
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleDelete} disabled={mfrLoading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {mfrLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera add / edit modal */}
            {(cameraModal === 'add' || cameraModal === 'edit') && cameraTargetMfr && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeCameraModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {cameraModal === 'edit' ? 'Edit camera' : `Add camera — ${cameraTargetMfr.name}`}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus type="text" value={camName}
                            onChange={e => setCamName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') cameraModal === 'edit' ? handleCameraEdit() : handleCameraAdd() }}
                            placeholder={`e.g. ${cameraTargetMfr.name} A7R V`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea value={camDesc} onChange={e => setCamDesc(e.target.value)}
                            placeholder="Short description of the camera..." rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 resize-none"
                        />

                        {/* Lens type */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Lens type</p>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                                <button type="button" onClick={() => { setInterchangeableLens(false); setMountId('') }}
                                    className={`flex-1 py-1.5 transition-colors ${!interchangeableLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                    Fixed
                                </button>
                                <button type="button" onClick={() => setInterchangeableLens(true)}
                                    className={`flex-1 py-1.5 border-l border-gray-200 transition-colors ${interchangeableLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                    Interchangeable
                                </button>
                            </div>
                            {interchangeableLens ? (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Camera mount</label>
                                    <select value={mountId} onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                                        <option value="">— None —</option>
                                        {cameraMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fixed lens optics</p>
                                    <div className="flex mb-3 rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                                        <button type="button" onClick={() => { setIsZoomLens(false); setFocalLengthWide(''); setMinFocusWide('') }}
                                            className={`flex-1 py-1.5 transition-colors ${!isZoomLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Prime</button>
                                        <button type="button" onClick={() => setIsZoomLens(true)}
                                            className={`flex-1 py-1.5 border-l border-gray-200 transition-colors ${isZoomLens ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Zoom</button>
                                    </div>
                                    {isZoomLens ? (
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Focal length — wide (mm)</label>
                                                <input type="number" min={0} step={1} value={focalLengthWide} onChange={e => setFocalLengthWide(e.target.value !== '' ? parseInt(e.target.value) : '')} placeholder="e.g. 25" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Focal length — tele (mm)</label>
                                                <input type="number" min={0} step={1} value={focalLengthTele} onChange={e => setFocalLengthTele(e.target.value !== '' ? parseInt(e.target.value) : '')} placeholder="e.g. 100" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Focal length (mm)</label>
                                            <input type="number" min={0} step={1} value={focalLengthTele} onChange={e => setFocalLengthTele(e.target.value !== '' ? parseInt(e.target.value) : '')} placeholder="e.g. 90" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                        </div>
                                    )}
                                    {isZoomLens ? (
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus — wide (m)</label>
                                                <input type="number" min={0} step={0.01} value={minFocusWide} onChange={e => setMinFocusWide(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 0.10" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus — tele (m)</label>
                                                <input type="number" min={0} step={0.01} value={minFocusTele} onChange={e => setMinFocusTele(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 0.20" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Min. focus distance (m)</label>
                                            <input type="number" min={0} step={0.01} value={minFocusTele} onChange={e => setMinFocusTele(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 0.28" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Max magnification (e.g. 4.0 for 4×)</label>
                                        <input type="number" min={0} step={0.01} value={maxMagnification} onChange={e => setMaxMagnification(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 4.0" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Waterproof without housing */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input type="checkbox" checked={canBeUsedWithoutAHousing} onChange={e => setCanBeUsedWithoutAHousing(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Camera is waterproof without a housing</span>
                            </label>
                            {canBeUsedWithoutAHousing && (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Depth rating (m)</label>
                                    <input type="number" min={0} step={1} value={depthRating} onChange={e => setDepthRating(e.target.value !== '' ? parseInt(e.target.value) : '')} placeholder="e.g. 15" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                </div>
                            )}
                        </div>

                        {/* Sensor */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sensor</p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sensor width (mm)</label>
                                    <input type="number" min={0} step={0.01} value={sensorWidth} onChange={e => setSensorWidth(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 35.9" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Sensor height (mm)</label>
                                    <input type="number" min={0} step={0.01} value={sensorHeight} onChange={e => setSensorHeight(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 24.0" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Megapixels</label>
                                <input type="number" min={0} step={0.1} value={megapixels} onChange={e => setMegapixels(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 61" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="border border-gray-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pricing</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                    <input type="number" min={0} step={0.01} value={priceAmount} onChange={e => setPriceAmount(e.target.value !== '' ? parseFloat(e.target.value) : '')} placeholder="e.g. 3499" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                                    <input type="text" maxLength={3} value={priceCurrency} onChange={e => setPriceCurrency(e.target.value.toUpperCase())} placeholder="USD" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 uppercase" />
                                </div>
                            </div>
                        </div>

                        {/* EXIF ID */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">EXIF camera ID</label>
                        <input type="text" value={exifIdInput} onChange={e => setExifIdInput(e.target.value)} placeholder="e.g. ILCE-7RM5" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />

                        {/* Product photos */}
                        <PhotoUploadField variant="rich" showCoverLabel value={photos} onChange={setPhotos} pasteListenerActive={!!cameraModal} />

                        {camError && <p className="text-sm text-red-600 mb-3">{camError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeCameraModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={cameraModal === 'edit' ? handleCameraEdit : handleCameraAdd}
                                disabled={camLoading || !camName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {camLoading ? 'Saving…' : cameraModal === 'edit' ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera delete modal */}
            {cameraModal === 'delete' && cameraTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeCameraModal() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete camera?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{cameraTarget.name}</strong>?
                        </p>
                        {cameraTarget.housings.length > 0 && (
                            <p className="text-sm text-amber-600 mb-4">
                                This camera has {cameraTarget.housings.length} housing{cameraTarget.housings.length !== 1 ? 's' : ''} associated with it and cannot be deleted.
                            </p>
                        )}
                        {camError && <p className="text-sm text-red-600 mb-3">{camError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeCameraModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleCameraDelete} disabled={camLoading || cameraTarget.housings.length > 0}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {camLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

