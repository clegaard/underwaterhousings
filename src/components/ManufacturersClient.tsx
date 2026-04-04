'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import { withBase } from '@/lib/images'

interface Manufacturer {
    id: number
    name: string
    slug: string
    description: string | null
    logoPath: string | null
    _count: { cameras: number; housings: number; lenses: number; ports: number }
}

type LogoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; file: File; previewUrl: string }
    | { kind: 'none' }

interface Props {
    manufacturers: Manufacturer[]
    isSuperuser: boolean
}

export default function ManufacturersClient({ manufacturers: initial, isSuperuser }: Props) {
    const router = useRouter()
    const [manufacturers, setManufacturers] = useState(initial)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Manufacturer | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [descriptionInput, setDescriptionInput] = useState('')
    const [logoSlot, setLogoSlot] = useState<LogoSlot>({ kind: 'none' })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setDescriptionInput('')
        if (logoSlot.kind === 'new') URL.revokeObjectURL(logoSlot.previewUrl)
        setLogoSlot({ kind: 'none' })
    }

    function openAdd() { resetForm(); setError(null); setModal('add') }

    function openEdit(m: Manufacturer) {
        setTarget(m)
        setNameInput(m.name)
        setDescriptionInput(m.description ?? '')
        setLogoSlot(m.logoPath ? { kind: 'existing', path: m.logoPath } : { kind: 'none' })
        setError(null)
        setModal('edit')
    }

    function openDelete(m: Manufacturer) { setTarget(m); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    function handleLogoFile(file: File | null) {
        if (!file) return
        if (!file.type.startsWith('image/')) return
        if (logoSlot.kind === 'new') URL.revokeObjectURL(logoSlot.previewUrl)
        setLogoSlot({ kind: 'new', file, previewUrl: URL.createObjectURL(file) })
    }

    const handlePasteEvent = useCallback((e: ClipboardEvent) => {
        const items = Array.from(e.clipboardData?.items ?? [])
        for (const item of items) {
            if (!item.type.startsWith('image/')) continue
            const file = item.getAsFile()
            if (!file) continue
            const ext = item.type.split('/')[1] ?? 'png'
            const renamedFile = new File([file], `paste-${Date.now()}.${ext}`, { type: item.type })
            e.preventDefault()
            handleLogoFile(renamedFile)
            break
        }
    }, [logoSlot]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!modal) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [modal, handlePasteEvent])

    async function uploadLogo(slug: string): Promise<string | null> {
        if (logoSlot.kind === 'existing') return logoSlot.path
        if (logoSlot.kind === 'none') return null
        const fd = new FormData()
        fd.append('file', logoSlot.file)
        fd.append('manufacturerSlug', slug)
        const res = await fetch('/api/admin/manufacturers/logo', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to upload logo')
        return data.path as string
    }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            // First create with no logo to get the slug
            const slugPreview = nameInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
            let logoPath: string | null = null
            if (logoSlot.kind === 'new') {
                logoPath = await uploadLogo(slugPreview)
            }
            const res = await fetch('/api/admin/manufacturers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim(), description: descriptionInput.trim() || null, logoPath }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            setManufacturers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            let logoPath: string | null = logoSlot.kind === 'existing' ? logoSlot.path : logoSlot.kind === 'none' ? null : null
            if (logoSlot.kind === 'new') {
                logoPath = await uploadLogo(target.slug)
            }
            const res = await fetch(`/api/admin/manufacturers?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim(), description: descriptionInput.trim() || null, logoPath }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            setManufacturers(prev => prev.map(m => m.id !== target.id ? m : { ...m, name: data.name, slug: data.slug, description: data.description, logoPath: data.logoPath, _count: m._count }))
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/manufacturers?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.filter(m => m.id !== target.id)); close()
        } catch {
            setError('Network error')
        } finally { setLoading(false) }
    }

    const logoPreview = logoSlot.kind === 'existing' ? withBase(logoSlot.path) : logoSlot.kind === 'new' ? logoSlot.previewUrl : null

    return (
        <>
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">All Manufacturers</h2>
                {isSuperuser && (
                    <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add manufacturer
                    </button>
                )}
            </div>

            {manufacturers.length > 0 ? (
                <div className="flex justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full">
                        {manufacturers.map((m) => (
                            <div key={m.id} className="relative group/card bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200">
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        {m.logoPath ? (
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                                <HousingImage
                                                    src={withBase(m.logoPath)}
                                                    fallback="/manufacturers/fallback.png"
                                                    alt={`${m.name} logo`}
                                                    className="object-contain p-1"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl font-bold text-blue-600">{m.name[0]}</span>
                                            </div>
                                        )}
                                        <h3 className="text-lg font-semibold text-blue-900">{m.name}</h3>
                                    </div>
                                    {m.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{m.description}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                                        <span>{m._count.cameras} cameras</span>
                                        <span>{m._count.housings} housings</span>
                                        <span>{m._count.lenses} lenses</span>
                                        <span>{m._count.ports} ports</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap text-xs">
                                        {m._count.cameras > 0 && <Link href={`/cameras/${m.slug}`} className="text-blue-600 hover:text-blue-800">Cameras →</Link>}
                                        {m._count.housings > 0 && <Link href={`/housings/${m.slug}`} className="text-blue-600 hover:text-blue-800">Housings →</Link>}
                                        {m._count.lenses > 0 && <Link href={`/lenses/${m.slug}`} className="text-blue-600 hover:text-blue-800">Lenses →</Link>}
                                        {m._count.ports > 0 && <Link href={`/ports/${m.slug}`} className="text-blue-600 hover:text-blue-800">Ports →</Link>}
                                    </div>
                                </div>

                                {isSuperuser && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(m)} title="Edit" className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => openDelete(m)} title="Delete" className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <div className="text-6xl mb-4">🏭</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No manufacturers found</h3>
                </div>
            )}

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{modal === 'edit' ? 'Edit manufacturer' : 'Add manufacturer'}</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder="e.g. Nauticam"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={descriptionInput}
                            onChange={e => setDescriptionInput(e.target.value)}
                            placeholder="Brief description of the manufacturer…"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 resize-none"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                        {logoPreview ? (
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-800">Replace logo</button>
                                    <button type="button" onClick={() => { if (logoSlot.kind === 'new') URL.revokeObjectURL(logoSlot.previewUrl); setLogoSlot({ kind: 'none' }) }} className="text-sm text-red-500 hover:text-red-700">Remove logo</button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                                onDrop={e => { e.preventDefault(); handleLogoFile(e.dataTransfer.files[0] ?? null) }}
                            >
                                <p className="text-sm text-gray-500">Click, drag & drop, or paste logo image</p>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoFile(e.target.files?.[0] ?? null)} />

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={modal === 'edit' ? handleEdit : handleAdd} disabled={loading || !nameInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add manufacturer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm modal */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete manufacturer</h3>
                        <p className="text-sm text-gray-600 mb-1">Are you sure you want to delete <strong>{target.name}</strong>?</p>
                        <p className="text-xs text-red-600 mb-4">This will also delete all cameras, housings, lenses and ports belonging to this manufacturer.</p>
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
