'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { withBase, getHousingImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'
import { useCurrency } from '@/components/CurrencyContext'
import PhotoUploadField from '@/components/PhotoUploadField'
import { uploadPhotoSlots, type PhotoSlot } from '@/lib/photoUpload'

interface Housing {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
    depthRating: number | null
    housingMountId: number | null
    interchangeablePort: boolean
    cameras: Array<{ id: number; name: string; brand: { name: string } }>
}

interface HousingMount {
    id: number
    name: string
    slug: string
}

interface Manufacturer {
    id: number
    name: string
    slug: string
    logoPath: string | null
    logoContainsName: boolean
    _count: { housings: number }
    housings: Housing[]
    housingMounts: HousingMount[]
}

interface Camera {
    id: number
    name: string
    brand: { name: string }
}

interface Props {
    manufacturers: Manufacturer[]
    cameras: Camera[]
    isSuperuser: boolean
}

export default function HousingManufacturersClient({ manufacturers: initial, cameras, isSuperuser }: Props) {
    const router = useRouter()
    const { formatMoney } = useCurrency()
    const [manufacturers, setManufacturers] = useState(initial)

    // ── Manufacturer modal state ──────────────────────────────────────────────
    const [modal, setModal] = useState<'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Manufacturer | null>(null)
    const [mfrNameInput, setMfrNameInput] = useState('')
    const [mfrLoading, setMfrLoading] = useState(false)
    const [mfrError, setMfrError] = useState<string | null>(null)

    function openMfrEdit(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setMfrNameInput(m.name); setMfrError(null); setModal('edit')
    }
    function openMfrDelete(m: Manufacturer, e: React.MouseEvent) {
        e.preventDefault()
        setTarget(m); setMfrError(null); setModal('delete')
    }
    function closeMfr() { setModal(null); setTarget(null); setMfrError(null) }

    async function handleMfrEdit() {
        if (!target || !mfrNameInput.trim()) return
        setMfrLoading(true); setMfrError(null)
        try {
            const res = await fetch(`/api/admin/manufacturers?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: mfrNameInput.trim() }),
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

    // ── Housing modal state ───────────────────────────────────────────────────
    const [housingModal, setHousingModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [housingTarget, setHousingTarget] = useState<Housing | null>(null)
    const [housingTargetMfr, setHousingTargetMfr] = useState<Manufacturer | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [cameraSearch, setCameraSearch] = useState('')
    const [selectedCameraIds, setSelectedCameraIds] = useState<number[]>([])
    const [mountId, setMountId] = useState<number | ''>('')
    const [depthRating, setDepthRating] = useState('')
    const [priceAmount, setPriceAmount] = useState('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [interchangeablePort, setInterchangeablePort] = useState(true)
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [housingLoading, setHousingLoading] = useState(false)
    const [housingError, setHousingError] = useState<string | null>(null)

    const filteredCameras = cameras.filter(c =>
        cameraSearch.trim() === '' ||
        `${c.brand.name} ${c.name}`.toLowerCase().includes(cameraSearch.toLowerCase())
    )

    function resetHousingForm() {
        setNameInput(''); setCameraSearch(''); setSelectedCameraIds([])
        setMountId(''); setDepthRating(''); setPriceAmount(''); setPriceCurrency('USD')
        setInterchangeablePort(true)
        setPhotos(prev => { prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) }); return [] })
    }

    function openHousingAdd(mfr: Manufacturer) {
        resetHousingForm(); setHousingError(null)
        setHousingTargetMfr(mfr); setHousingModal('add')
    }

    function openHousingEdit(h: Housing, mfr: Manufacturer) {
        setHousingTarget(h); setHousingTargetMfr(mfr)
        setNameInput(h.name)
        setSelectedCameraIds(h.cameras.map(c => c.id)); setCameraSearch('')
        setMountId(h.housingMountId ?? '')
        setDepthRating(h.depthRating != null ? String(h.depthRating) : '')
        setPriceAmount(h.priceAmount != null ? String(h.priceAmount) : '')
        setPriceCurrency(h.priceCurrency ?? 'USD')
        setInterchangeablePort(h.interchangeablePort)
        setPhotos(h.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setHousingError(null)
        setHousingModal('edit')
    }

    function openHousingDelete(h: Housing, mfr: Manufacturer) {
        setHousingTarget(h); setHousingTargetMfr(mfr); setHousingError(null); setHousingModal('delete')
    }

    function closeHousingModal() {
        resetHousingForm(); setHousingModal(null); setHousingTarget(null); setHousingTargetMfr(null); setHousingError(null)
    }

    async function handleHousingAdd() {
        if (!nameInput.trim() || selectedCameraIds.length === 0 || !housingTargetMfr) return
        setHousingLoading(true); setHousingError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/housings/photos', { manufacturerSlug: housingTargetMfr.slug })
            const res = await fetch('/api/admin/housings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: housingTargetMfr.id,
                    cameraIds: selectedCameraIds,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount || undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setHousingError(data.error ?? 'Failed to create'); return }
            const selectedCameras = cameras.filter(c => selectedCameraIds.includes(c.id))
            const newHousing: Housing = {
                id: data.id, name: nameInput.trim(), slug: data.slug,
                productPhotos,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                depthRating: depthRating ? parseInt(depthRating) : null,
                housingMountId: mountId !== '' ? (mountId as number) : null,
                interchangeablePort,
                cameras: selectedCameras.map(c => ({ id: c.id, name: c.name, brand: c.brand })),
            }
            setManufacturers(prev => prev.map(m => m.id === housingTargetMfr.id
                ? { ...m, housings: [...m.housings, newHousing], _count: { housings: m._count.housings + 1 } }
                : m
            ))
            router.refresh()
            closeHousingModal()
        } catch (err) {
            setHousingError(err instanceof Error ? err.message : 'Network error')
        } finally { setHousingLoading(false) }
    }

    async function handleHousingEdit() {
        if (!housingTarget || !housingTargetMfr || !nameInput.trim() || selectedCameraIds.length === 0) return
        setHousingLoading(true); setHousingError(null)
        try {
            const productPhotos = await uploadPhotoSlots(photos, '/api/admin/housings/photos', { manufacturerSlug: housingTargetMfr!.slug })
            const res = await fetch(`/api/admin/housings?id=${housingTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: housingTargetMfr.id,
                    cameraIds: selectedCameraIds,
                    housingMountId: mountId !== '' ? mountId : null,
                    depthRating: depthRating ? parseInt(depthRating) : undefined,
                    priceAmount: priceAmount || undefined,
                    priceCurrency,
                    interchangeablePort,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setHousingError(data.error ?? 'Failed to update'); return }
            const selectedCameras = cameras.filter(c => selectedCameraIds.includes(c.id))
            setManufacturers(prev => prev.map(m => m.id !== housingTargetMfr.id ? m : {
                ...m,
                housings: m.housings.map(h => h.id !== housingTarget.id ? h : {
                    ...h, name: nameInput.trim(), slug: data.slug, productPhotos,
                    priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                    priceCurrency, depthRating: depthRating ? parseInt(depthRating) : null,
                    housingMountId: mountId !== '' ? (mountId as number) : null,
                    interchangeablePort,
                    cameras: selectedCameras.map(c => ({ id: c.id, name: c.name, brand: c.brand })),
                }),
            }))
            router.refresh()
            closeHousingModal()
        } catch (err) {
            setHousingError(err instanceof Error ? err.message : 'Network error')
        } finally { setHousingLoading(false) }
    }

    async function handleHousingDelete() {
        if (!housingTarget || !housingTargetMfr) return
        setHousingLoading(true); setHousingError(null)
        try {
            const res = await fetch(`/api/admin/housings?id=${housingTarget.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setHousingError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.map(m => m.id !== housingTargetMfr.id ? m : {
                ...m,
                housings: m.housings.filter(h => h.id !== housingTarget.id),
                _count: { housings: m._count.housings - 1 },
            }))
            closeHousingModal()
        } catch { setHousingError('Network error') }
        finally { setHousingLoading(false) }
    }

    const visibleManufacturers = manufacturers.filter(m => m._count.housings > 0 || isSuperuser)

    if (visibleManufacturers.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="text-5xl mb-4">🤿</div>
                <p className="text-gray-500">No housings found.</p>
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
                                {manufacturer._count.housings} housing{manufacturer._count.housings !== 1 ? 's' : ''}
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

                        {/* Housing cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {manufacturer.housings.map(housing => {
                                const imageInfo = getHousingImagePathWithFallback(housing.productPhotos)
                                return (
                                    <div key={housing.id} className="group/card relative">
                                        <Link
                                            href={`/products/${manufacturer.slug}/housings/${housing.slug}`}
                                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                                        >
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
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
                                                {housing.cameras.length > 0 && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                                        {housing.cameras.map((c: { brand: { name: string }; name: string }) => `${c.brand.name} ${c.name}`).join(', ')}
                                                    </p>
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
                                                    onClick={() => openHousingEdit(housing, manufacturer)}
                                                    title="Edit housing"
                                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openHousingDelete(housing, manufacturer)}
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
                                )
                            })}

                            {isSuperuser && (
                                <button
                                    onClick={() => openHousingAdd(manufacturer)}
                                    className="min-h-36 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-xs font-medium">Add housing</span>
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* ── Manufacturer edit modal ──────────────────────────────────────── */}
            {modal === 'edit' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeMfr() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit manufacturer</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input autoFocus type="text" value={mfrNameInput}
                            onChange={e => setMfrNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleMfrEdit() }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />
                        {mfrError && <p className="text-sm text-red-600 mb-3">{mfrError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeMfr} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleMfrEdit} disabled={mfrLoading || !mfrNameInput.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {mfrLoading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Manufacturer delete modal ────────────────────────────────────── */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeMfr() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete manufacturer?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{target.name}</strong>?
                        </p>
                        {target._count.housings > 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                This manufacturer has {target._count.housings} housing{target._count.housings !== 1 ? 's' : ''} and cannot be deleted until they are removed.
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

            {/* ── Housing add / edit modal ─────────────────────────────────────── */}
            {(housingModal === 'add' || housingModal === 'edit') && housingTargetMfr && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeHousingModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {housingModal === 'edit' ? 'Edit housing' : `Add housing — ${housingTargetMfr.name}`}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus type="text" value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder={`e.g. ${housingTargetMfr.name} NA-A7IV`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

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
                        <input type="text" value={cameraSearch} onChange={e => setCameraSearch(e.target.value)}
                            placeholder="Search cameras to add…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1" />
                        <div className="border border-gray-200 rounded-lg mb-4 max-h-44 overflow-y-auto">
                            {filteredCameras.filter(c => !selectedCameraIds.includes(c.id)).length === 0 ? (
                                <p className="px-3 py-2 text-sm text-gray-400">No cameras found</p>
                            ) : filteredCameras.filter(c => !selectedCameraIds.includes(c.id)).map(c => (
                                <button key={c.id} type="button"
                                    onClick={() => { setSelectedCameraIds(prev => [...prev, c.id]); setCameraSearch('') }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0">
                                    <span className="text-gray-500 mr-1">{c.brand.name}</span>{c.name}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                            <input type="checkbox" checked={interchangeablePort}
                                onChange={e => { setInterchangeablePort(e.target.checked); if (!e.target.checked) setMountId('') }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm font-medium text-gray-700">Interchangeable port</span>
                        </label>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Port system (optional)</label>
                        <select value={mountId} onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            disabled={!interchangeablePort}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
                            <option value="">— None —</option>
                            {housingTargetMfr.housingMounts.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Max depth rating (m)</label>
                        <input type="number" min="0" value={depthRating} onChange={e => setDepthRating(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4" />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
                        <div className="flex gap-2 mb-4">
                            <input type="number" min="0" step="0.01" value={priceAmount} onChange={e => setPriceAmount(e.target.value)}
                                placeholder="e.g. 3595"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900" />
                            <select value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900">
                                <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>AUD</option>
                            </select>
                        </div>


                        <PhotoUploadField variant="rich" showCoverLabel value={photos} onChange={setPhotos} pasteListenerActive={!!housingModal} />

                        {housingError && <p className="text-sm text-red-600 mb-3">{housingError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeHousingModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={housingModal === 'edit' ? handleHousingEdit : handleHousingAdd}
                                disabled={housingLoading || !nameInput.trim() || selectedCameraIds.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {housingLoading ? 'Saving…' : housingModal === 'edit' ? 'Save' : 'Add housing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Housing delete modal ─────────────────────────────────────────── */}
            {housingModal === 'delete' && housingTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeHousingModal() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete housing?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{housingTarget.name}</strong>? This cannot be undone.
                        </p>
                        {housingError && <p className="text-sm text-red-600 mb-3">{housingError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closeHousingModal} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handleHousingDelete} disabled={housingLoading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {housingLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
