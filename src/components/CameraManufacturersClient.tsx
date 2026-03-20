'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Manufacturer {
    id: number
    name: string
    slug: string
    _count: { cameras: number }
    cameras: { housings: { id: number }[] }[]
}

interface Props {
    manufacturers: Manufacturer[]
    isSuperuser: boolean
}

export default function CameraManufacturersClient({ manufacturers: initial, isSuperuser }: Props) {
    const router = useRouter()
    const [manufacturers, setManufacturers] = useState(initial)

    // Modal state
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Manufacturer | null>(null)
    const [nameInput, setNameInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function openAdd() {
        setNameInput('')
        setError(null)
        setModal('add')
    }

    function openEdit(m: Manufacturer) {
        setTarget(m)
        setNameInput(m.name)
        setError(null)
        setModal('edit')
    }

    function openDelete(m: Manufacturer) {
        setTarget(m)
        setError(null)
        setModal('delete')
    }

    function close() {
        setModal(null)
        setTarget(null)
        setError(null)
    }

    async function handleAdd() {
        if (!nameInput.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/camera-manufacturers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            router.refresh()
            close()
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleEdit() {
        if (!target || !nameInput.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/camera-manufacturers?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            setManufacturers(prev => prev.map(m => m.id === target.id ? { ...m, name: data.name, slug: data.slug } : m))
            close()
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/camera-manufacturers?id=${target.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
            setManufacturers(prev => prev.filter(m => m.id !== target.id))
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
                <h2 className="text-2xl font-bold text-gray-900">All Camera Manufacturers</h2>
                <div className="flex items-center gap-3">
                    {isSuperuser && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add brand
                        </button>
                    )}
                    <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        ← Back to Search
                    </Link>
                </div>
            </div>

            {manufacturers.length > 0 ? (
                <div className="flex justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full">
                        {manufacturers.map((manufacturer) => {
                            const totalHousings = manufacturer.cameras.reduce((acc, c) => acc + c.housings.length, 0)
                            return (
                                <div key={manufacturer.id} className="relative group/card">
                                    <Link
                                        href={`/cameras/${manufacturer.slug}`}
                                        className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group"
                                    >
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                    {manufacturer.name}
                                                </h3>
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    Cameras
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Camera Models:</span>
                                                    <span className="font-medium text-blue-800">{manufacturer._count.cameras}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Available Housings:</span>
                                                    <span className="font-medium text-green-700">{totalHousings}</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-gray-100">
                                                <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                    <span>View cameras</span>
                                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Superuser action buttons */}
                                    {isSuperuser && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(manufacturer)}
                                                title="Edit"
                                                className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => openDelete(manufacturer)}
                                                title="Delete"
                                                className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex justify-center">
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm max-w-md">
                        <div className="text-6xl mb-4">📷</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No camera manufacturers found</h3>
                        <p className="text-gray-600">No camera manufacturers are currently available.</p>
                    </div>
                </div>
            )}

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {modal === 'add' ? 'Add camera brand' : 'Edit camera brand'}
                        </h3>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') modal === 'add' ? handleAdd() : handleEdit() }}
                            placeholder="e.g. Canon"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        />
                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button onClick={close} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={modal === 'add' ? handleAdd : handleEdit}
                                disabled={loading || !nameInput.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Saving…' : modal === 'add' ? 'Add' : 'Save'}
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete brand?</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            Are you sure you want to delete <strong>{target.name}</strong>?
                        </p>
                        {target._count.cameras > 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                This brand has {target._count.cameras} camera{target._count.cameras !== 1 ? 's' : ''} and cannot be deleted until they are removed.
                            </p>
                        )}
                        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                        <div className="flex justify-end gap-3 mt-4">
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
            )}
        </>
    )
}
