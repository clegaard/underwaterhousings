'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import CameraRigPicker, {
    type PickerCamera,
    type PickerLens,
    type PickerHousing,
    type PickerPort,
    type RigSavePayload,
    type RigInitialValues,
} from './CameraRigPicker'
import {
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getHousingImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedRig {
    id: number
    name: string
    imagePath: string | null
    camera: {
        id: number
        name: string
        productPhotos: string[]
        brand: { name: string }
    }
    lens: {
        id: number
        name: string
        productPhotos: string[]
    } | null
    housing: {
        id: number
        name: string
        productPhotos: string[]
        manufacturer: { name: string }
    } | null
    port: {
        id: number
        name: string
        productPhotos: string[]
    } | null
}

interface EquipmentData {
    cameras: PickerCamera[]
    lenses: PickerLens[]
    housings: PickerHousing[]
    ports: PickerPort[]
}

interface Props {
    userId: number
    isOwnProfile: boolean
}

// ─── Rig Card ─────────────────────────────────────────────────────────────────

function RigCard({
    rig,
    isOwnProfile,
    isFavorite,
    onSetFavorite,
    onEdit,
    onDelete,
}: {
    rig: SavedRig
    isOwnProfile: boolean
    isFavorite: boolean
    onSetFavorite: () => void
    onEdit: () => void
    onDelete: () => void
}) {
    const cameraImg = getCameraImagePathWithFallback(rig.camera.productPhotos)
    const lensImg = rig.lens ? getLensImagePathWithFallback(rig.lens.productPhotos) : null
    const housingImg = rig.housing ? getHousingImagePathWithFallback(rig.housing.productPhotos) : null
    const portImg = rig.port ? getPortImagePathWithFallback(rig.port.productPhotos) : null

    const items = [
        { label: 'Camera', name: rig.camera.name, subtitle: rig.camera.brand.name, img: cameraImg },
        ...(rig.lens ? [{ label: 'Lens', name: rig.lens.name, subtitle: '', img: lensImg! }] : []),
        ...(rig.housing
            ? [{ label: 'Housing', name: rig.housing.name, subtitle: rig.housing.manufacturer.name, img: housingImg! }]
            : []),
        ...(rig.port ? [{ label: 'Port', name: rig.port.name, subtitle: '', img: portImg! }] : []),
    ]

    return (
        <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Star / favorite button */}
            {isOwnProfile && (
                <div className="group absolute top-2 right-2 z-10">
                    <button
                        type="button"
                        onClick={onSetFavorite}
                        aria-label={isFavorite ? 'Default rig' : 'Set as default rig'}
                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                            isFavorite
                                ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                                : 'bg-white/80 text-gray-300 hover:text-amber-400 hover:bg-white shadow-sm'
                        }`}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill={isFavorite ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-56 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFavorite
                            ? 'This is your default rig. It is pre-selected when uploading photos to the gallery.'
                            : 'Set as default rig. Your default rig is pre-selected when uploading photos to the gallery.'}
                        <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                    </div>
                </div>
            )}            {/* Rig cover photo */}
            <div className="relative w-full h-40 bg-blue-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={rig.imagePath ? `/api/media${rig.imagePath}` : '/housings/rig-placeholder.png'}
                    alt={`${rig.name} assembled`}
                    className={`w-full h-full ${rig.imagePath ? 'object-cover' : 'object-contain p-2'}`}
                />
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-semibold text-gray-800 text-sm">{rig.name}</h4>
                    {isOwnProfile && (
                        <div className="flex gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 flex-wrap">
                    {items.map(item => (
                        <div key={item.label} className="flex flex-col items-center gap-1 w-16">
                            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                <Image
                                    src={item.img.src}
                                    alt={item.name}
                                    fill
                                    className="object-contain p-1"
                                    onError={(e) => {
                                        ; (e.currentTarget as HTMLImageElement).src = item.img.fallback
                                    }}
                                    sizes="56px"
                                />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</span>
                            <span className="text-xs text-gray-700 text-center leading-tight line-clamp-2">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CameraRigsSection({ userId, isOwnProfile }: Props) {
    const [rigs, setRigs] = useState<SavedRig[]>([])
    const [equipment, setEquipment] = useState<EquipmentData | null>(null)
    const [defaultRigId, setDefaultRigId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRig, setEditingRig] = useState<SavedRig | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const fetchRigs = useCallback(async () => {
        try {
            const res = await fetch(`/api/camera-rigs?userId=${userId}`)
            const json = await res.json()
            if (json.success) {
                setRigs(json.data.rigs)
                setDefaultRigId(json.data.defaultRigId)
            }
        } catch {
            setError('Failed to load rigs')
        }
    }, [userId])

    useEffect(() => {
        async function load() {
            try {
                const [equipRes, rigsRes] = await Promise.all([
                    fetch('/api/camera-rigs'),
                    fetch(`/api/camera-rigs?userId=${userId}`),
                ])
                const [equipJson, rigsJson] = await Promise.all([equipRes.json(), rigsRes.json()])
                if (equipJson.success) setEquipment(equipJson.data)
                if (rigsJson.success) {
                    setRigs(rigsJson.data.rigs)
                    setDefaultRigId(rigsJson.data.defaultRigId)
                }
            } catch {
                setError('Failed to load camera rigs')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [userId])

    function openAdd() {
        setEditingRig(null)
        setIsModalOpen(true)
    }

    function openEdit(rig: SavedRig) {
        setEditingRig(rig)
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingRig(null)
    }

    async function handleSave(payload: RigSavePayload) {
        setIsSaving(true)
        try {
            // Upload new photo if one was selected
            let imagePath = payload.imagePath
            if (payload.rigPhoto) {
                const fd = new FormData()
                fd.append('file', payload.rigPhoto)
                const uploadRes = await fetch('/api/camera-rigs/photos', { method: 'POST', body: fd })
                if (uploadRes.ok) {
                    const uploadJson = await uploadRes.json()
                    imagePath = uploadJson.path
                } else {
                    const uploadJson = await uploadRes.json()
                    setError(uploadJson.error ?? 'Failed to upload photo')
                    setIsSaving(false)
                    return
                }
            }
            let res: Response
            if (editingRig) {
                res = await fetch(`/api/camera-rigs?id=${editingRig.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: payload.name,
                        cameraId: payload.cameraId,
                        lensId: payload.lensId,
                        housingId: payload.housingId,
                        portId: payload.portId,
                        imagePath,
                    }),
                })
            } else {
                res = await fetch('/api/camera-rigs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: payload.name,
                        cameraId: payload.cameraId,
                        lensId: payload.lensId,
                        housingId: payload.housingId,
                        portId: payload.portId,
                        imagePath,
                    }),
                })
            }
            if (res.ok) {
                await fetchRigs()
                closeModal()
            } else {
                const json = await res.json()
                setError(json.error ?? 'Failed to save rig')
            }
        } catch {
            setError('Failed to save rig')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleSetFavorite(rigId: number) {
        try {
            const res = await fetch(`/api/camera-rigs/favorite?id=${rigId}`, { method: 'PATCH' })
            if (res.ok) {
                const json = await res.json()
                setDefaultRigId(json.defaultRigId)
            } else {
                setError('Failed to set default rig')
            }
        } catch {
            setError('Failed to set default rig')
        }
    }

    async function handleDelete(rigId: number) {
        if (!confirm('Delete this rig?')) return
        try {
            const res = await fetch(`/api/camera-rigs?id=${rigId}`, { method: 'DELETE' })
            if (res.ok) {
                setRigs(prev => prev.filter(r => r.id !== rigId))
                if (defaultRigId === rigId) setDefaultRigId(null)
            } else {
                setError('Failed to delete rig')
            }
        } catch {
            setError('Failed to delete rig')
        }
    }

    const editingInitialValues: RigInitialValues | undefined = editingRig
        ? {
            id: editingRig.id,
            name: editingRig.name,
            imagePath: editingRig.imagePath,
            cameraId: editingRig.camera.id,
            lensId: editingRig.lens?.id ?? null,
            housingId: editingRig.housing?.id ?? null,
            portId: editingRig.port?.id ?? null,
        }
        : undefined

    return (
        <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Camera Rigs</h2>

            {loading && <p className="text-sm text-gray-400">Loading rigs…</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !isOwnProfile && rigs.length === 0 && (
                <p className="text-sm text-gray-400">No camera rigs shared yet.</p>
            )}

            {!loading && (rigs.length > 0 || isOwnProfile) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rigs.map(rig => (
                        <RigCard
                            key={rig.id}
                            rig={rig}
                            isOwnProfile={isOwnProfile}
                            isFavorite={rig.id === defaultRigId}
                            onSetFavorite={() => handleSetFavorite(rig.id)}
                            onEdit={() => openEdit(rig)}
                            onDelete={() => handleDelete(rig.id)}
                        />
                    ))}
                    {isOwnProfile && (
                        <button
                            type="button"
                            onClick={openAdd}
                            className="min-h-[9rem] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs font-medium">Add rig</span>
                        </button>
                    )}
                </div>
            )}

            {isModalOpen && equipment && (
                <Modal
                    title={editingRig ? 'Edit camera rig' : 'Add camera rig'}
                    onClose={closeModal}
                >
                    <CameraRigPicker
                        cameras={equipment.cameras}
                        lenses={equipment.lenses}
                        housings={equipment.housings}
                        ports={equipment.ports}
                        initialValues={editingInitialValues}
                        onSave={handleSave}
                        onCancel={closeModal}
                        isSaving={isSaving}
                    />
                </Modal>
            )}
        </section>
    )
}
