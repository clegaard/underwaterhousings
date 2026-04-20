'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { withBase, getPortImagePathWithFallback } from '@/lib/images'

interface PortAdapter {
    id: number
    name: string
    slug: string
    inputHousingMount: { id: number; name: string; slug: string } | null
    outputHousingMount: { id: number; name: string; slug: string } | null
    priceAmount: number | null
    priceCurrency: string | null
    productPhotos: string[]
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

type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

interface Props {
    adapters: PortAdapter[]
    manufacturer: Manufacturer
    housingMounts: HousingMount[]
    isSuperuser: boolean
}

export default function PortAdaptersClient({ adapters: initial, manufacturer, housingMounts, isSuperuser }: Props) {
    const router = useRouter()
    const [adapters, setAdapters] = useState(initial)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<PortAdapter | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [inputMountId, setInputMountId] = useState<number | ''>('')
    const [outputMountId, setOutputMountId] = useState<number | ''>('')
    const [priceAmount, setPriceAmount] = useState('')
    const [priceCurrency, setPriceCurrency] = useState('USD')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setInputMountId('')
        setOutputMountId('')
        setPriceAmount('')
        setPriceCurrency('USD')
        setPhotos(prev => {
            prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) })
            return []
        })
        setDragPhotoIdx(null)
        setError(null)
    }

    function openAdd() { resetForm(); setTarget(null); setModal('add') }

    function openEdit(a: PortAdapter) {
        setTarget(a)
        setNameInput(a.name)
        setInputMountId(a.inputHousingMount?.id ?? '')
        setOutputMountId(a.outputHousingMount?.id ?? '')
        setPriceAmount(a.priceAmount != null ? String(a.priceAmount) : '')
        setPriceCurrency(a.priceCurrency ?? 'USD')
        setPhotos(a.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null)
        setError(null)
        setModal('edit')
    }

    function openDelete(a: PortAdapter) { setTarget(a); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    function handleFilesAdd(files: FileList | null) {
        if (!files) return
        const items: PhotoSlot[] = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .map(file => ({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file, previewUrl: URL.createObjectURL(file) }))
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

    function handlePhotoDragStart(e: React.DragEvent, idx: number) { e.dataTransfer.effectAllowed = 'move'; setDragPhotoIdx(idx) }

    function handlePhotoDragOver(e: React.DragEvent, idx: number) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'
        if (dragPhotoIdx === null || dragPhotoIdx === idx) return
        setPhotos(prev => {
            const arr = [...prev]
            const [item] = arr.splice(dragPhotoIdx, 1)
            arr.splice(idx, 0, item)
            return arr
        })
        setDragPhotoIdx(idx)
    }

    function handlePhotoDragEnd() { setDragPhotoIdx(null) }

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
                const res = await fetch('/api/admin/port-adapters/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch('/api/admin/port-adapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    inputHousingMountId: inputMountId || null,
                    outputHousingMountId: outputMountId || null,
                    priceAmount: priceAmount || null,
                    priceCurrency,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const resolvedInput = housingMounts.find(m => m.id === inputMountId) ?? null
            const resolvedOutput = housingMounts.find(m => m.id === outputMountId) ?? null
            const newAdapter: PortAdapter = {
                id: data.id,
                name: nameInput.trim(),
                slug: data.slug,
                inputHousingMount: resolvedInput,
                outputHousingMount: resolvedOutput,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                productPhotos,
                imageInfo: getPortImagePathWithFallback(productPhotos),
            }
            setAdapters(prev => [...prev, newAdapter])
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths()
            const res = await fetch(`/api/admin/port-adapters?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    inputHousingMountId: inputMountId || null,
                    outputHousingMountId: outputMountId || null,
                    priceAmount: priceAmount || null,
                    priceCurrency,
                    productPhotos,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            const resolvedInput = housingMounts.find(m => m.id === inputMountId) ?? null
            const resolvedOutput = housingMounts.find(m => m.id === outputMountId) ?? null
            setAdapters(prev => prev.map(a => a.id !== target.id ? a : {
                ...a,
                name: nameInput.trim(),
                slug: data.slug,
                inputHousingMount: resolvedInput,
                outputHousingMount: resolvedOutput,
                priceAmount: priceAmount ? parseFloat(priceAmount) : null,
                priceCurrency,
                productPhotos,
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
            const res = await fetch(`/api/admin/port-adapters?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setAdapters(prev => prev.filter(a => a.id !== target.id))
            close()
        } catch {
            setError('Network error')
        } finally { setLoading(false) }
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {adapters.map((adapter) => (
                    <div key={adapter.id} className="group/card relative">
                        <Link
                            href={`/gear/${manufacturer.slug}/${adapter.slug}`}
                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                        >
                            <div className="relative h-28 bg-gray-50">
                                <HousingImage
                                    src={adapter.imageInfo.src}
                                    fallback={adapter.imageInfo.fallback}
                                    alt={adapter.name}
                                    className="object-contain p-3 w-full h-full"
                                />
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                    {adapter.name}
                                </p>
                                {(adapter.inputHousingMount || adapter.outputHousingMount) && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                        {adapter.inputHousingMount?.slug.toUpperCase() ?? '?'}
                                        {' → '}
                                        {adapter.outputHousingMount?.slug.toUpperCase() ?? '?'}
                                    </p>
                                )}
                                {adapter.priceAmount != null && (
                                    <p className="text-xs font-medium text-green-600 mt-1">${adapter.priceAmount.toFixed(2)}</p>
                                )}
                            </div>
                        </Link>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button onClick={() => openEdit(adapter)} title="Edit port adapter" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button onClick={() => openDelete(adapter)} title="Delete port adapter" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
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
                        <span className="text-xs font-medium">Add adapter</span>
                    </button>
                )}
            </div>

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{modal === 'edit' ? 'Edit port adapter' : 'Add port adapter'}</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} N85 to N120 Adapter`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Input mount (housing side)</label>
                        <select
                            value={inputMountId}
                            onChange={e => setInputMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— None —</option>
                            {housingMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Output mount (port side)</label>
                        <select
                            value={outputMountId}
                            onChange={e => setOutputMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— None —</option>
                            {housingMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

                        <div className="flex gap-3 mb-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={priceAmount}
                                    onChange={e => setPriceAmount(e.target.value)}
                                    placeholder="e.g. 249.00"
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

                        <label className="block text-sm font-medium text-gray-700 mb-1">Product photos</label>
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                            onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
                        >
                            <p className="text-sm text-gray-500">Click, drag & drop, or paste images here</p>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFilesAdd(e.target.files)} />
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
                                        <button type="button" onClick={() => removePhoto(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={modal === 'edit' ? handleEdit : handleAdd} disabled={loading || !nameInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add adapter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete port adapter</h3>
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
