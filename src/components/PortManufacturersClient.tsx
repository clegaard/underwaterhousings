'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { withBase, getPortImagePathWithFallback } from '@/lib/images'
import { useCurrency } from '@/components/CurrencyContext'
import { HousingImage } from '@/components/HousingImage'

interface Port {
    id: number
    name: string
    slug: string
    housingMount: { id: number; name: string; slug: string } | null
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
}

interface ExtensionRing {
    id: number
    name: string
    slug: string
    housingMount: { id: number; name: string; slug: string } | null
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
    lengthMm: number | null
}

interface PortAdapter {
    id: number
    name: string
    slug: string
    inputHousingMount: { id: number; name: string; slug: string } | null
    outputHousingMount: { id: number; name: string; slug: string } | null
    productPhotos: string[]
    priceAmount: number | null
    priceCurrency: string | null
}

interface Manufacturer {
    id: number
    name: string
    slug: string
    logoPath: string | null
    _count: { ports: number; extensionRings: number; portAdapters: number }
    ports: Port[]
    extensionRings: ExtensionRing[]
    portAdapters: PortAdapter[]
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
    manufacturers: Manufacturer[]
    housingMounts: HousingMount[]
    isSuperuser: boolean
}

export default function PortManufacturersClient({ manufacturers: initial, housingMounts, isSuperuser }: Props) {
    const router = useRouter()
    const { formatMoney } = useCurrency()
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

    // ── Port modal state ──────────────────────────────────────────────────────
    const [portModal, setPortModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [portTarget, setPortTarget] = useState<Port | null>(null)
    const [portTargetMfr, setPortTargetMfr] = useState<Manufacturer | null>(null)
    const [portName, setPortName] = useState('')
    const [mountId, setMountId] = useState<number | ''>('')
    const [photos, setPhotos] = useState<PhotoSlot[]>([])
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)
    const [portLoading, setPortLoading] = useState(false)
    const [portError, setPortError] = useState<string | null>(null)

    function resetPortForm() {
        setPortName(''); setMountId('')
        setPhotos(prev => { prev.forEach(p => { if (p.kind === 'new') URL.revokeObjectURL(p.previewUrl) }); return [] })
        setDragPhotoIdx(null)
    }

    function openPortAdd(mfr: Manufacturer) {
        resetPortForm(); setPortError(null)
        setPortTargetMfr(mfr); setPortModal('add')
    }

    function openPortEdit(p: Port, mfr: Manufacturer) {
        setPortTarget(p); setPortTargetMfr(mfr)
        setPortName(p.name)
        setMountId(p.housingMount?.id ?? '')
        setPhotos(p.productPhotos.map(path => ({ kind: 'existing' as const, path })))
        setDragPhotoIdx(null); setPortError(null)
        setPortModal('edit')
    }

    function openPortDelete(p: Port, mfr: Manufacturer) {
        setPortTarget(p); setPortTargetMfr(mfr); setPortError(null); setPortModal('delete')
    }

    function closePortModal() {
        resetPortForm(); setPortModal(null); setPortTarget(null); setPortTargetMfr(null); setPortError(null)
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
        if (!portModal) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [portModal, handlePasteEvent])

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
                const res = await fetch('/api/admin/ports/photos', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
                paths.push(data.path)
            }
        }
        return paths
    }

    async function handlePortAdd() {
        if (!portName.trim() || !portTargetMfr) return
        setPortLoading(true); setPortError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths(portTargetMfr.slug)
            const res = await fetch('/api/admin/ports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: portName.trim(), manufacturerId: portTargetMfr.id, housingMountId: mountId || null, productPhotos }),
            })
            const data = await res.json()
            if (!res.ok) { setPortError(data.error ?? 'Failed to create'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            const newPort: Port = {
                id: data.id, name: portName.trim(), slug: data.slug,
                housingMount: resolvedMount, productPhotos,
                priceAmount: null, priceCurrency: null,
            }
            setManufacturers(prev => prev.map(m => m.id === portTargetMfr.id
                ? { ...m, ports: [...m.ports, newPort], _count: { ports: m._count.ports + 1, extensionRings: m._count.extensionRings, portAdapters: m._count.portAdapters } }
                : m
            ))
            router.refresh()
            closePortModal()
        } catch (err) {
            setPortError(err instanceof Error ? err.message : 'Network error')
        } finally { setPortLoading(false) }
    }

    async function handlePortEdit() {
        if (!portTarget || !portTargetMfr || !portName.trim()) return
        setPortLoading(true); setPortError(null)
        try {
            const productPhotos = await buildFinalPhotoPaths(portTargetMfr.slug)
            const res = await fetch(`/api/admin/ports?id=${portTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: portName.trim(), manufacturerId: portTargetMfr.id, housingMountId: mountId || null, productPhotos }),
            })
            const data = await res.json()
            if (!res.ok) { setPortError(data.error ?? 'Failed to update'); return }
            const resolvedMount = housingMounts.find(m => m.id === mountId) ?? null
            setManufacturers(prev => prev.map(m => m.id !== portTargetMfr.id ? m : {
                ...m,
                ports: m.ports.map(p => p.id !== portTarget.id ? p : {
                    ...p, name: portName.trim(), slug: data.slug, productPhotos, housingMount: resolvedMount,
                }),
            }))
            router.refresh()
            closePortModal()
        } catch (err) {
            setPortError(err instanceof Error ? err.message : 'Network error')
        } finally { setPortLoading(false) }
    }

    async function handlePortDelete() {
        if (!portTarget || !portTargetMfr) return
        setPortLoading(true); setPortError(null)
        try {
            const res = await fetch(`/api/admin/ports?id=${portTarget.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setPortError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.map(m => m.id !== portTargetMfr.id ? m : {
                ...m,
                ports: m.ports.filter(p => p.id !== portTarget.id),
                _count: { ports: m._count.ports - 1, extensionRings: m._count.extensionRings, portAdapters: m._count.portAdapters },
            }))
            closePortModal()
        } catch { setPortError('Network error') }
        finally { setPortLoading(false) }
    }

    const visibleManufacturers = manufacturers.filter(m =>
        m._count.ports > 0 || m._count.extensionRings > 0 || m._count.portAdapters > 0 || isSuperuser
    )

    if (visibleManufacturers.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="text-5xl mb-4">🔌</div>
                <p className="text-gray-500">No ports found.</p>
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
                                href={`/gear/${manufacturer.slug}`}
                                className="text-lg font-semibold text-gray-900 hover:text-blue-700 transition-colors"
                            >
                                {manufacturer.name}
                            </Link>
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {manufacturer._count.ports + manufacturer._count.extensionRings + manufacturer._count.portAdapters} item{manufacturer._count.ports + manufacturer._count.extensionRings + manufacturer._count.portAdapters !== 1 ? 's' : ''}
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

                        {/* Port cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {manufacturer.ports.map(port => {
                                const imageInfo = getPortImagePathWithFallback(port.productPhotos)
                                const price = port.priceAmount ? Number(port.priceAmount) : null
                                return (
                                    <div key={`port-${port.id}`} className="group/card relative">
                                        <Link
                                            href={`/ports/${manufacturer.slug}/${port.slug}`}
                                            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden block"
                                        >
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
                                                    alt={port.name}
                                                    className="object-contain p-3 w-full h-full"
                                                />
                                                {port.housingMount && (
                                                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-gray-100 text-gray-600 font-medium px-1.5 py-0.5 rounded-full">
                                                        {port.housingMount.slug.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-2.5 py-2">
                                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                                                    {port.name}
                                                </p>
                                                {port.housingMount && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{port.housingMount.name}</p>
                                                )}
                                                {price !== null && (
                                                    <p className="text-xs font-medium text-green-600 mt-1">
                                                        {formatMoney(price, port.priceCurrency)}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                        {isSuperuser && (
                                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={() => openPortEdit(port, manufacturer)}
                                                    title="Edit port"
                                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => openPortDelete(port, manufacturer)}
                                                    title="Delete port"
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

                            {/* Extension ring cards */}
                            {manufacturer.extensionRings.map(ring => {
                                const imageInfo = getPortImagePathWithFallback(ring.productPhotos)
                                const price = ring.priceAmount ? Number(ring.priceAmount) : null
                                return (
                                    <div key={`ring-${ring.id}`} className="group/card relative">
                                        <div className="bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all overflow-hidden block">
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
                                                    alt={ring.name}
                                                    className="object-contain p-3 w-full h-full"
                                                />
                                                <span className="absolute top-1.5 left-1.5 text-[10px] bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">
                                                    Ext. Ring
                                                </span>
                                                {ring.housingMount && (
                                                    <span className="absolute top-1.5 right-1.5 text-[10px] bg-gray-100 text-gray-600 font-medium px-1.5 py-0.5 rounded-full">
                                                        {ring.housingMount.slug.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-2.5 py-2">
                                                <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                                                    {ring.name}
                                                </p>
                                                {ring.lengthMm !== null && (
                                                    <p className="text-[10px] text-amber-600 mt-0.5">{ring.lengthMm} mm</p>
                                                )}
                                                {price !== null && (
                                                    <p className="text-xs font-medium text-green-600 mt-1">
                                                        {formatMoney(price, ring.priceCurrency)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Port adapter cards */}}
                            {manufacturer.portAdapters.map(adapter => {
                                const imageInfo = getPortImagePathWithFallback(adapter.productPhotos)
                                const price = adapter.priceAmount ? Number(adapter.priceAmount) : null
                                return (
                                    <div key={`adapter-${adapter.id}`} className="group/card relative">
                                        <div className="bg-white rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all overflow-hidden block">
                                            <div className="relative h-28 bg-gray-50">
                                                <HousingImage
                                                    src={imageInfo.src}
                                                    fallback={imageInfo.fallback}
                                                    alt={adapter.name}
                                                    className="object-contain p-3 w-full h-full"
                                                />
                                                <span className="absolute top-1.5 left-1.5 text-[10px] bg-purple-100 text-purple-700 font-medium px-1.5 py-0.5 rounded-full">
                                                    Adapter
                                                </span>
                                            </div>
                                            <div className="px-2.5 py-2">
                                                <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                                                    {adapter.name}
                                                </p>
                                                {(adapter.inputHousingMount || adapter.outputHousingMount) && (
                                                    <p className="text-[10px] text-purple-600 mt-0.5 truncate">
                                                        {adapter.inputHousingMount?.slug.toUpperCase() ?? '?'} → {adapter.outputHousingMount?.slug.toUpperCase() ?? '?'}
                                                    </p>
                                                )}
                                                {price !== null && (
                                                    <p className="text-xs font-medium text-green-600 mt-1">
                                                        {formatMoney(price, adapter.priceCurrency)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Add port card — superuser only */}
                            {isSuperuser && (
                                <button
                                    onClick={() => openPortAdd(manufacturer)}
                                    className="min-h-[9rem] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-xs font-medium">Add port</span>
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
                            placeholder="e.g. Nauticam"
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
                        {target._count.ports > 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                This manufacturer has {target._count.ports} port{target._count.ports !== 1 ? 's' : ''} and cannot be deleted until they are removed.
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

            {/* Port add / edit modal */}
            {(portModal === 'add' || portModal === 'edit') && portTargetMfr && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closePortModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {portModal === 'edit' ? 'Edit port' : `Add port — ${portTargetMfr.name}`}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus type="text" value={portName}
                            onChange={e => setPortName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') portModal === 'edit' ? handlePortEdit() : handlePortAdd() }}
                            placeholder={`e.g. ${portTargetMfr.name} Wide Port`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Housing mount</label>
                        <select value={mountId} onChange={e => setMountId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4">
                            <option value="">— None —</option>
                            {housingMounts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>

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

                        {portError && <p className="text-red-600 text-sm mb-3">{portError}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={closePortModal} disabled={portLoading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={portModal === 'edit' ? handlePortEdit : handlePortAdd} disabled={portLoading || !portName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {portLoading ? 'Saving…' : portModal === 'edit' ? 'Save changes' : 'Add port'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Port delete modal */}
            {portModal === 'delete' && portTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closePortModal() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete port</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{portTarget.name}</strong>? This cannot be undone.</p>
                        {portError && <p className="text-sm text-red-600 mb-3">{portError}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={closePortModal} disabled={portLoading} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button onClick={handlePortDelete} disabled={portLoading}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {portLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
