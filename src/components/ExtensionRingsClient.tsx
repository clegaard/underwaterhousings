'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PhotoUploadField from '@/components/PhotoUploadField'
import { uploadPhotoSlots, type PhotoSlot } from '@/lib/photoUpload'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'
import { useCurrency } from '@/components/CurrencyContext'

interface ExtensionRing {
    id: number
    name: string
    slug: string
    housingMount: { id: number; name: string; slug: string } | null
    lengthMm: number | null
    priceAmount: number | null
    priceCurrency: string | null
    productPhotos: string[]
    productId: string | null
    productUrl: string | null
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

interface Props {
    rings: ExtensionRing[]
    manufacturer: Manufacturer
    housingMounts: HousingMount[]
    isSuperuser: boolean
}

export default function ExtensionRingsClient({ rings: initial, manufacturer, housingMounts, isSuperuser }: Props) {
    const router = useRouter()
    const { formatMoney } = useCurrency()
    const [rings, setRings] = useState(initial)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<ExtensionRing | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [lengthMm, setLengthMm] = useState('')
    const [priceAmount, setPriceAmount] = useState('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [productIdInput, setProductIdInput] = useState('')
    const [productUrlInput, setProductUrlInput] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setMountId('')
        setLengthMm('')
        setPriceAmount('')
        setPriceCurrency('USD')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setProductIdInput('')
        setProductUrlInput('')
        setError(null)
    }

    function openAdd() { resetForm(); setTarget(null); setModal('add') }

    function openEdit(r: ExtensionRing) {
        setTarget(r)
        setNameInput(r.name)
        setMountId(r.housingMount?.id ?? '')
        setLengthMm(r.lengthMm != null ? String(r.lengthMm) : '')
        setPriceAmount(r.priceAmount != null ? String(r.priceAmount) : '')
        setPriceCurrency(r.priceCurrency ?? 'USD')
        setPhotos(r.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setProductIdInput(r.productId ?? '')
        setProductUrlInput(r.productUrl ?? '')
        setError(null)
        setModal('edit')
    }

    function openDelete(r: ExtensionRing) { setTarget(r); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/extension-rings/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch('/api/admin/extension-rings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    housingMountId: mountId || null,
                    lengthMm: lengthMm || null,
                    priceAmount: priceAmount || null,
                    priceCurrency,
                    productPhotos,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            const newRing: ExtensionRing = {
                id: data.id,
                name: nameInput.trim(),
                slug: data.slug,
                housingMount: resolvedMount,
                lengthMm: lengthMm ? parseInt(lengthMm) : null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                productPhotos,
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                imageInfo: getPortImagePathWithFallback(productPhotos),
            }
            setRings(prev => [...prev, newRing])
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/extension-rings/photos', { manufacturerSlug: manufacturer.slug })
            const res = await fetch(`/api/admin/extension-rings?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    housingMountId: mountId || null,
                    lengthMm: lengthMm || null,
                    priceAmount: priceAmount || null,
                    priceCurrency,
                    productPhotos,
                    productId: productIdInput.trim() || null,
                    productUrl: productUrlInput.trim() || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            setRings(prev => prev.map(r => r.id !== target.id ? r : {
                ...r,
                name: nameInput.trim(),
                slug: data.slug,
                housingMount: resolvedMount,
                lengthMm: lengthMm ? parseInt(lengthMm) : null,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                productPhotos,
                productId: productIdInput.trim() || null,
                productUrl: productUrlInput.trim() || null,
                imageInfo: getPortImagePathWithFallback(productPhotos),
            }))
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/extension-rings?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setRings(prev => prev.filter(r => r.id !== target.id))
            close()
        } catch {
            setError('Network error')
        } finally { setLoading(false) }
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {rings.map((ring) => (
                    <div key={ring.id} className="group/card relative">
                        <Link
                            href={`/gear/${manufacturer.slug}/extension-rings/${ring.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={ring.imageInfo.src}
                                    fallback={ring.imageInfo.fallback}
                                    alt={ring.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                    {ring.name}
                                </p>
                                {ring.housingMount && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{ring.housingMount.name}</p>
                                )}
                                {ring.lengthMm != null && (
                                    <p className="text-[10px] text-gray-400 truncate">{ring.lengthMm} mm</p>
                                )}
                                {ring.priceAmount != null && (
                                    <p className="text-xs font-medium text-green-600 mt-1">{formatMoney(ring.priceAmount, ring.priceCurrency)}</p>
                                )}
                            </div>
                        </Link>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button onClick={() => openEdit(ring)} title="Edit extension ring" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button onClick={() => openDelete(ring)} title="Delete extension ring" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
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
                        <span className="text-xs font-medium">Add ring</span>
                    </button>
                )}
            </div>

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{modal === 'edit' ? 'Edit extension ring' : 'Add extension ring'}</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} Extension Ring 12mm`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                        <input
                            type="text"
                            value={productIdInput}
                            onChange={e => setProductIdInput(e.target.value)}
                            placeholder="e.g. N120-025"
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

                        <label className="block text-sm font-medium text-gray-700 mb-1">Housing mount</label>
                        <select
                            value={mountId}
                            onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— None —</option>
                            {housingMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Length (mm)</label>
                        <input
                            type="number"
                            value={lengthMm}
                            onChange={e => setLengthMm(e.target.value)}
                            placeholder="e.g. 12"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <div className="flex gap-3 mb-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={priceAmount}
                                    onChange={e => setPriceAmount(e.target.value)}
                                    placeholder="e.g. 149.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                />
                            </div>
                            <div className="w-24">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={priceCurrency}
                                    onChange={e => setPriceCurrency(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                >
                                    <option>USD</option>
                                    <option>EUR</option>
                                    <option>GBP</option>
                                </select>
                            </div>
                        </div>


                        <PhotoUploadField value={photos} onChange={setPhotos} pasteListenerActive={!!modal} />

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={modal === 'edit' ? handleEdit : handleAdd} disabled={loading || !nameInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add ring'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete extension ring</h3>
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
