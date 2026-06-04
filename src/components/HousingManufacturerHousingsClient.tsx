'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { getHousingImagePathWithFallback } from '@/lib/images'
import { useCurrency } from '@/components/CurrencyContext'
import ProductPhotoUpload from '@/components/ProductPhotoUpload'
import { uploadPhotoSlots, type PhotoSlot } from '@/lib/photoUpload'

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
    productId: string | null
    productUrl: string | null
    interchangeablePort: boolean
    cameras: Array<{ id: number; name: string; brand: { name: string } }>
    imageInfo: { src: string; fallback: string }
    cameraMountRecession: number | null
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
    const { formatMoney } = useCurrency()

    const [housings, setHousings] = useState(initial)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Housing | null>(null)

    // Form state
    const [nameInput, setNameInput] = useState('')
    const [cameraSearch, setCameraSearch] = useState('')
    const [selectedCameraIds, setSelectedCameraIds] = useState<number[]>([])
    const [mountId, setMountId] = useState<number | ''>('')
    const [depthRating, setDepthRating] = useState('')
    const [priceAmount, setPriceAmount] = useState('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [interchangeablePort, setInterchangeablePort] = useState(true)
    const [cameraMountRecession, setCameraMountRecession] = useState('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [productIdInput, setProductIdInput] = useState('')
    const [productUrlInput, setProductUrlInput] = useState('')
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filtered cameras for the search dropdown
    const filteredCameras = cameras.filter(c =>
        cameraSearch.trim() === '' ||
        `${c.brand.name} ${c.name}`.toLowerCase().includes(cameraSearch.toLowerCase())
    )

    function resetForm() {
        setNameInput('')
        setCameraSearch('')
        setSelectedCameraIds([])
        setMountId('')
        setDepthRating('')
        setPriceAmount('')
        setPriceCurrency('USD')
        setInterchangeablePort(true)
        setCameraMountRecession('')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setProductIdInput('')
        setProductUrlInput('')
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
        setSelectedCameraIds(h.cameras.map(c => c.id))
        setCameraSearch('')
        setMountId(h.housingMountId ?? '')
        setDepthRating(h.depthRating != null ? String(h.depthRating) : '')
        setPriceAmount(h.priceAmount != null ? String(h.priceAmount) : '')
        setPriceCurrency(h.priceCurrency ?? 'USD')
        setInterchangeablePort(h.interchangeablePort)
        setCameraMountRecession(h.cameraMountRecession != null ? String(h.cameraMountRecession) : '')
        setPhotos(h.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setProductIdInput(h.productId ?? '')
        setProductUrlInput(h.productUrl ?? '')
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

    async function handleAdd() {
        if (!nameInput.trim() || selectedCameraIds.length === 0) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/housings/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch('/api/admin/housings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraIds: selectedCameraIds,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount ? priceAmount : undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                    cameraMountRecession: cameraMountRecession ? parseFloat(cameraMountRecession) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const selectedCameras = cameras.filter(c => selectedCameraIds.includes(c.id))
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
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                cameras: selectedCameras.map(c => ({ id: c.id, name: c.name, brand: c.brand })),
                imageInfo: getHousingImagePathWithFallback(productPhotos),
                cameraMountRecession: cameraMountRecession ? parseFloat(cameraMountRecession) : null,
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
        if (!target || !nameInput.trim() || selectedCameraIds.length === 0) return
        setLoading(true)
        setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/housings/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch(`/api/admin/housings?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    cameraIds: selectedCameraIds,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount ? priceAmount : undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                    cameraMountRecession: cameraMountRecession ? parseFloat(cameraMountRecession) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const selectedCameras = cameras.filter(c => selectedCameraIds.includes(c.id))
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
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                cameras: selectedCameras.map(c => ({ id: c.id, name: c.name, brand: c.brand })),
                imageInfo: getHousingImagePathWithFallback(productPhotos),
                cameraMountRecession: cameraMountRecession ? parseFloat(cameraMountRecession) : null,
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {housings.map((housing) => (
                    <div key={housing.id} className="group/card relative">
                        <Link
                            href={`/products/${manufacturer.slug}/housings/${housing.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={housing.imageInfo.src}
                                    fallback={housing.imageInfo.fallback}
                                    alt={housing.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                    {housing.name}
                                </p>
                                {housing.cameras.length > 0 && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        {housing.cameras.map(c => `${c.brand.name} ${c.name}`).join(', ')}
                                    </p>
                                )}
                                {housing.depthRating != null && (
                                    <p className="text-[10px] text-blue-600 mt-0.5">Rated to {housing.depthRating}m</p>
                                )}
                                {housing.priceAmount != null && (
                                    <p className="text-xs font-medium text-green-600 mt-1">
                                        {formatMoney(housing.priceAmount, housing.priceCurrency)}
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
                        className="min-h-36 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
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
                    <Link href="/products" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
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

                        {/* Product Name */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder={`e.g. ${manufacturer.name} NA-A7IV`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Product ID */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (optional)</label>
                        <input
                            type="text"
                            value={productIdInput}
                            onChange={e => setProductIdInput(e.target.value)}
                            placeholder="e.g. NAU-NA-A7IV"
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

                        {/* Compatible camera body */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Compatible camera bodies
                        </label>
                        {/* Selected cameras tags */}
                        {selectedCameraIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedCameraIds.map(id => {
                                    const cam = cameras.find(c => c.id === id)!
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium px-2 py-1 rounded-full">
                                            {cam.brand.name} {cam.name}
                                            <button type="button" onClick={() => setSelectedCameraIds(prev => prev.filter(i => i !== id))} className="text-blue-400 hover:text-red-600">&times;</button>
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                        <input
                            type="text"
                            value={cameraSearch}
                            onChange={e => setCameraSearch(e.target.value)}
                            placeholder="Search cameras to add…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                        />
                        <div className="border border-gray-200 rounded-lg mb-4 max-h-44 overflow-y-auto">
                            {filteredCameras.filter(c => !selectedCameraIds.includes(c.id)).length === 0 ? (
                                <p className="px-3 py-2 text-sm text-gray-400">No cameras found</p>
                            ) : (
                                filteredCameras.filter(c => !selectedCameraIds.includes(c.id)).map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => { setSelectedCameraIds(prev => [...prev, c.id]); setCameraSearch('') }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                                    >
                                        <span className="text-gray-500 mr-1">{c.brand.name}</span>
                                        {c.name}
                                    </button>
                                ))
                            )}
                        </div>

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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port system (optional)</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max depth rating (m) (optional)</label>
                        <input
                            type="number"
                            min="0"
                            value={depthRating}
                            onChange={e => setDepthRating(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Camera mount recession */}
                        <div className="flex items-center gap-1 mb-1">
                            <label className="block text-sm font-medium text-gray-700">Camera mount recession (mm) (optional)</label>
                            <div className="relative group/tt inline-block">
                                <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 hidden group-hover/tt:block z-50 shadow-lg pointer-events-none">
                                    The distance from the camera&apos;s lens mount flange to the front face of the housing&apos;s port mount along the optical axis, in mm. This measurement is needed to calculate how much extension is required to place a dome port&apos;s centre of curvature at the lens entrance pupil.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                </div>
                            </div>
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={cameraMountRecession}
                            onChange={e => setCameraMountRecession(e.target.value)}
                            placeholder="e.g. 28.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        {/* Price */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
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
                        <ProductPhotoUpload value={photos} onChange={setPhotos} pasteListenerActive={!!modal} />

                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleAdd}
                                disabled={loading || !nameInput.trim() || selectedCameraIds.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save' : 'Add housing'}
                            </button>
                        </div>
                    </div>
                </div >
            )
            }

            {/* Delete confirmation modal */}
            {
                modal === 'delete' && target && (
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
                )
            }
        </>
    )
}
