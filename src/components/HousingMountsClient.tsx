'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HousingMount {
    id: number
    name: string
    slug: string
    description: string | null
    innerDiameter: number | null
}

interface Manufacturer {
    id: number
    name: string
    slug: string
}

interface Props {
    mounts: HousingMount[]
    manufacturer: Manufacturer
    isSuperuser: boolean
}

export default function HousingMountsClient({ mounts: initial, manufacturer, isSuperuser }: Props) {
    const router = useRouter()
    const [mounts, setMounts] = useState(initial)

    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<HousingMount | null>(null)

    const [nameInput, setNameInput] = useState('')
    const [descriptionInput, setDescriptionInput] = useState('')
    const [innerDiameter, setInnerDiameter] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function resetForm() {
        setNameInput('')
        setDescriptionInput('')
        setInnerDiameter('')
        setError(null)
    }

    function openAdd() { resetForm(); setTarget(null); setModal('add') }

    function openEdit(m: HousingMount) {
        setTarget(m)
        setNameInput(m.name)
        setDescriptionInput(m.description ?? '')
        setInnerDiameter(m.innerDiameter != null ? String(m.innerDiameter) : '')
        setError(null)
        setModal('edit')
    }

    function openDelete(m: HousingMount) { setTarget(m); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const res = await fetch('/api/admin/housing-mounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    description: descriptionInput.trim() || null,
                    innerDiameter: innerDiameter || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            const newMount: HousingMount = {
                id: data.id,
                name: nameInput.trim(),
                slug: data.slug,
                description: descriptionInput.trim() || null,
                innerDiameter: innerDiameter ? parseFloat(innerDiameter) : null,
            }
            setMounts(prev => [...prev, newMount].sort((a, b) => a.name.localeCompare(b.name)))
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/housing-mounts?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameInput.trim(),
                    manufacturerId: manufacturer.id,
                    description: descriptionInput.trim() || null,
                    innerDiameter: innerDiameter || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            setMounts(prev =>
                prev
                    .map(m => m.id !== target.id ? m : {
                        ...m,
                        name: nameInput.trim(),
                        slug: data.slug,
                        description: descriptionInput.trim() || null,
                        innerDiameter: innerDiameter ? parseFloat(innerDiameter) : null,
                    })
                    .sort((a, b) => a.name.localeCompare(b.name)),
            )
            router.refresh(); close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/housing-mounts?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setMounts(prev => prev.filter(m => m.id !== target.id))
            router.refresh(); close()
        } catch {
            setError('Network error')
        } finally { setLoading(false) }
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {mounts.map(mount => (
                    <div key={mount.id} className="group/card relative">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Title-as-visual */}
                            <div className="h-28 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-3">
                                <span className="text-blue-800 font-bold text-center text-sm leading-tight">
                                    {mount.name}
                                </span>
                            </div>
                            <div className="px-2.5 py-2">
                                <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                                    {mount.name}
                                </p>
                                {mount.innerDiameter != null && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">⌀ {mount.innerDiameter} mm</p>
                                )}
                                {mount.description && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{mount.description}</p>
                                )}
                            </div>
                        </div>
                        {isSuperuser && (
                            <div className="absolute top-1.5 left-1.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openEdit(mount)}
                                    title="Edit housing mount"
                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => openDelete(mount)}
                                    title="Delete housing mount"
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
                        <span className="text-xs font-medium">Add mount</span>
                    </button>
                )}
            </div>

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {modal === 'edit' ? 'Edit housing mount' : 'Add housing mount'}
                        </h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'edit' ? handleEdit() : handleAdd() }}
                            placeholder={`e.g. ${manufacturer.name} N120`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Inner diameter (mm)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={innerDiameter}
                            onChange={e => setInnerDiameter(e.target.value)}
                            placeholder="e.g. 120"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <textarea
                            value={descriptionInput}
                            onChange={e => setDescriptionInput(e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4 resize-none"
                        />

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleAdd}
                                disabled={loading || !nameInput.trim()}
                                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add mount'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {modal === 'delete' && target && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete housing mount</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{target.name}</strong>? This may affect housings, ports, and rings referencing this mount.
                        </p>
                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
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
