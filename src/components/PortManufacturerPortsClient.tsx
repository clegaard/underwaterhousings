'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductPhotoUpload from '@/components/ProductPhotoUpload'
import { uploadPhotoSlots, type PhotoSlot } from '@/lib/photoUpload'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'

interface Port {
    id: number
    name: string
    slug: string
    housingMount: { id: number; name: string; slug: string } | null
    productPhotos: string[]
    productId: string | null
    productUrl: string | null
    imageInfo: { src: string; fallback: string }
    isFlatPort: boolean
    portRadius: number | null
    portDepth: number | null
    radiusOfCurvature: number | null
    depthRating: number | null
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

interface Props {
    ports: Port[]
    manufacturer: Manufacturer
    housingMounts: HousingMount[]
    isSuperuser: boolean
}

export default function PortManufacturerPortsClient({ ports: initial, manufacturer, housingMounts, isSuperuser }: Props) {
    const router = useRouter()
    const [ports, setPorts] = useState(initial)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Port | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [productIdInput, setProductIdInput] = useState('')
    const [productUrlInput, setProductUrlInput] = useState('')
    // Optics fields
    const [isFlatPort, setIsFlatPort] = useState(false)
    const [portRadius, setPortRadius] = useState('')
    const [portDepth, setPortDepth] = useState('')
    const [radiusOfCurvature, setRadiusOfCurvature] = useState('')
    const [opticsTab, setOpticsTab] = useState<'dome' | 'flat'>('dome')
    const [depthRatingInput, setDepthRatingInput] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setMountId('')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setProductIdInput('')
        setProductUrlInput('')
        setIsFlatPort(false)
        setPortRadius('')
        setPortDepth('')
        setRadiusOfCurvature('')
        setOpticsTab('dome')
        setDepthRatingInput('')
    }

    function openAdd() { resetForm(); setError(null); setModal('add') }

    function openEdit(p: Port) {
        setTarget(p)
        setNameInput(p.name)
        setMountId(p.housingMount?.id ?? '')
        setPhotos(p.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setProductIdInput(p.productId ?? '')
        setProductUrlInput(p.productUrl ?? '')
        setIsFlatPort(p.isFlatPort)
        setPortRadius(p.portRadius != null ? String(p.portRadius) : '')
        setPortDepth(p.portDepth != null ? String(p.portDepth) : '')
        setRadiusOfCurvature(p.radiusOfCurvature != null ? String(p.radiusOfCurvature) : '')
        setOpticsTab(p.isFlatPort ? 'flat' : 'dome')
        setDepthRatingInput(p.depthRating != null ? String(p.depthRating) : '')
        setError(null)
        setModal('edit')
    }

    function openDelete(p: Port) { setTarget(p); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/ports/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch('/api/admin/ports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim(), manufacturerId: manufacturer.id, housingMountId: mountId || null, productPhotos, productId: productIdInput.trim() || null, productUrl: productUrlInput.trim() || null, isFlatPort, portRadius: portRadius || null, portDepth: portDepth || null, radiusOfCurvature: radiusOfCurvature || null, depthRating: depthRatingInput || null }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            setPorts(prev => [...prev, { id: data.id, name: nameInput.trim(), slug: data.slug, housingMount: resolvedMount, productPhotos, productId: productIdInput.trim() || null, productUrl: productUrlInput.trim() || null, imageInfo: getPortImagePathWithFallback(productPhotos), isFlatPort, portRadius: portRadius ? parseFloat(portRadius) : null, portDepth: portDepth ? parseFloat(portDepth) : null, radiusOfCurvature: radiusOfCurvature ? parseFloat(radiusOfCurvature) : null, depthRating: depthRatingInput ? parseInt(depthRatingInput) : null }])
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/ports/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch(`/api/admin/ports?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim(), manufacturerId: manufacturer.id, housingMountId: mountId || null, productPhotos, productId: productIdInput.trim() || null, productUrl: productUrlInput.trim() || null, isFlatPort, portRadius: portRadius || null, portDepth: portDepth || null, radiusOfCurvature: radiusOfCurvature || null, depthRating: depthRatingInput || null }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            setPorts(prev => prev.map(p => p.id !== target.id ? p : { ...p, name: nameInput.trim(), slug: data.slug, housingMount: resolvedMount, productPhotos, productId: productIdInput.trim() || null, productUrl: productUrlInput.trim() || null, imageInfo: getPortImagePathWithFallback(productPhotos), isFlatPort, portRadius: portRadius ? parseFloat(portRadius) : null, portDepth: portDepth ? parseFloat(portDepth) : null, radiusOfCurvature: radiusOfCurvature ? parseFloat(radiusOfCurvature) : null, depthRating: depthRatingInput ? parseInt(depthRatingInput) : null }))
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/ports?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setPorts(prev => prev.filter(p => p.id !== target.id)); close()
        } catch {
            setError('Network error')
        } finally { setLoading(false) }
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {ports.map((port) => (
                    <div key={port.id} className="group/card relative">
                        <Link
                            href={`/products/${manufacturer.slug}/ports/${port.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={port.imageInfo.src}
                                    fallback={port.imageInfo.fallback}
                                    alt={port.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                    {port.name}
                                </p>
                                {port.housingMount && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        {port.housingMount.name}
                                    </p>
                                )}
                            </div>
                        </Link>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button onClick={() => openEdit(port)} title="Edit port" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button onClick={() => openDelete(port)} title="Delete port" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
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
                        className="min-h-36 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs font-medium">Add port</span>
                    </button>
                )}
            </div>

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{modal === 'edit' ? 'Edit port' : 'Add port'}</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} Wide Port`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Product ID */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (optional)</label>
                        <input
                            type="text"
                            value={productIdInput}
                            onChange={e => setProductIdInput(e.target.value)}
                            placeholder="e.g. N100-330"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Product URL */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product URL (optional)</label>
                        <input
                            type="url"
                            value={productUrlInput}
                            onChange={e => setProductUrlInput(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Housing mount (optional)</label>
                        <select
                            value={mountId}
                            onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— None —</option>
                            {housingMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Max depth rating (m) (optional)</label>
                        <input
                            type="number"
                            min="0"
                            value={depthRatingInput}
                            onChange={e => setDepthRatingInput(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* ── Optics section ── */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Optics</p>

                            {/* Port Radius */}
                            <label className="block text-sm font-medium text-gray-700 mb-1">Port radius (mm) (optional)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={portRadius}
                                onChange={e => setPortRadius(e.target.value)}
                                placeholder="e.g. 67"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                            />
                            <p className="text-xs text-gray-400 mb-4">The radius of the port opening circle in mm. Applies to both flat and dome ports.</p>

                            {/* Port Depth */}
                            <div className="flex items-center gap-1 mb-1">
                                <label className="block text-sm font-medium text-gray-700">Port depth (mm) (optional)</label>
                                <div className="relative group/tt inline-block">
                                    <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                        <strong>Dome port:</strong> distance from the flange to the start of the spherical cap along the optical axis — i.e. how much extension the flange itself contributes.<br /><br />
                                        <strong>Flat port:</strong> distance from the flange to the front face of the flat glass element along the optical axis.
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                    </div>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={portDepth}
                                onChange={e => setPortDepth(e.target.value)}
                                placeholder="e.g. 12"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                            />

                            {/* Port type tabs */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setOpticsTab('dome'); setIsFlatPort(false) }}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${opticsTab === 'dome' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Dome port
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setOpticsTab('flat'); setIsFlatPort(true) }}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${opticsTab === 'flat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                >
                                    Flat port
                                </button>
                            </div>

                            {opticsTab === 'dome' && (() => {
                                const roc = parseFloat(radiusOfCurvature)
                                const pr = parseFloat(portRadius)
                                const rocValid = !isNaN(roc) && roc > 0
                                const prValid = !isNaN(pr) && pr > 0
                                const rocTooSmall = rocValid && prValid && roc < pr
                                const fovDeg = rocValid && prValid && !rocTooSmall
                                    ? Math.round(2 * Math.asin(pr / roc) * (180 / Math.PI) * 10) / 10
                                    : null
                                return (
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            <label className="block text-sm font-medium text-gray-700">Radius of curvature (mm) (optional)</label>
                                            <div className="relative group/tt inline-block">
                                                <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                                    The radius of the imaginary sphere that the dome is a part of. Most domes are not full hemispheres, so their radius of curvature is typically larger than their port radius. When the radius of curvature equals the port radius, the dome is a perfect hemisphere covering a 180° field of view.
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min={portRadius || '0'}
                                            step="0.1"
                                            value={radiusOfCurvature}
                                            onChange={e => setRadiusOfCurvature(e.target.value)}
                                            placeholder="e.g. 100"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1 ${rocTooSmall ? 'border-red-400' : 'border-gray-300'}`}
                                        />
                                        {rocTooSmall && (
                                            <p className="text-xs text-red-500 mb-2">Radius of curvature must be ≥ port radius ({portRadius} mm).</p>
                                        )}
                                        {fovDeg !== null && (
                                            <div className="flex items-center gap-1 mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                                <span className="text-sm text-blue-800 font-medium">Maximum Field of View: {fovDeg}°</span>
                                                <div className="relative group/tt inline-block ml-1">
                                                    <svg className="w-3.5 h-3.5 text-blue-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                                        Calculated as 2 × arcsin(portRadius / radiusOfCurvature), assuming the lens entrance pupil is placed at the dome&apos;s center of curvature. This is the widest angle of light the dome can accept without vignetting. Using a lens with a wider angle of view than this value will cause vignetting at the corners.
                                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>


                        <ProductPhotoUpload value={photos} onChange={setPhotos} pasteListenerActive={!!modal} />

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={modal === 'edit' ? handleEdit : handleAdd} disabled={loading || !nameInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add port'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete port</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{target.name}</strong>? This cannot be undone.</p>
                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                                {loading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
