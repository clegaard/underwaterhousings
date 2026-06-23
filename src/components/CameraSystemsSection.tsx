'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import CameraSystemPicker, {
    type PickerCamera,
    type PickerLens,
    type PickerHousing,
    type PickerPortAdapter,
    type PickerExtensionRing,
    type PickerPort,
    type CameraSystemSavePayload,
    type CameraSystemInitialValues,
} from './CameraSystemPicker'
import {
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getHousingImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCameraSystem {
    id: number
    name: string
    imagePath: string | null
    isActive: boolean
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
    portAdapter: {
        id: number
        name: string
        productPhotos: string[]
        manufacturer: { name: string }
    } | null
    extensionRings: {
        id: number
        name: string
        productPhotos: string[]
    }[]
    port: {
        id: number
        name: string
        productPhotos: string[]
    } | null
    _count: { galleryPhotos: number }
}

interface EquipmentData {
    cameras: PickerCamera[]
    lenses: PickerLens[]
    housings: PickerHousing[]
    portAdapters: PickerPortAdapter[]
    extensionRings: PickerExtensionRing[]
    ports: PickerPort[]
}

interface Props {
    userId: number
    isOwnProfile: boolean
    prefillCamera?: string
    prefillLens?: string
}

// ─── Rig Card ─────────────────────────────────────────────────────────────────

function CameraSystemCard({
    cameraSystem,
    userId,
    isOwnProfile,
    isFavorite,
    onSetFavorite,
    onToggleActive,
    onEdit,
    onClone,
    onDelete,
}: {
    cameraSystem: SavedCameraSystem
    userId: number
    isOwnProfile: boolean
    isFavorite: boolean
    onSetFavorite: () => void
    onToggleActive: () => void
    onEdit: () => void
    onClone: () => void
    onDelete: () => void
}) {
    const cameraImg = getCameraImagePathWithFallback(cameraSystem.camera.productPhotos)
    const lensImg = cameraSystem.lens ? getLensImagePathWithFallback(cameraSystem.lens.productPhotos) : null
    const housingImg = cameraSystem.housing ? getHousingImagePathWithFallback(cameraSystem.housing.productPhotos) : null
    const portImg = cameraSystem.port ? getPortImagePathWithFallback(cameraSystem.port.productPhotos) : null

    const items = [
        { label: 'Camera', name: cameraSystem.camera.name, subtitle: cameraSystem.camera.brand.name, img: cameraImg },
        ...(cameraSystem.lens ? [{ label: 'Lens', name: cameraSystem.lens.name, subtitle: '', img: lensImg! }] : []),
        ...(cameraSystem.housing
            ? [{ label: 'Housing', name: cameraSystem.housing.name, subtitle: cameraSystem.housing.manufacturer.name, img: housingImg! }]
            : []),
        ...(cameraSystem.portAdapter
            ? [{ label: 'Adapter', name: cameraSystem.portAdapter.name, subtitle: cameraSystem.portAdapter.manufacturer.name, img: getPortImagePathWithFallback(cameraSystem.portAdapter.productPhotos) }]
            : []),
        ...cameraSystem.extensionRings.map(r => ({ label: 'Ring', name: r.name, subtitle: '', img: getPortImagePathWithFallback(r.productPhotos) })),
        ...(cameraSystem.port ? [{ label: 'Port', name: cameraSystem.port.name, subtitle: '', img: portImg! }] : []),
    ]

    return (
        <div className={`relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-opacity ${cameraSystem.isActive ? '' : 'opacity-60'}`}>
            {/* Unified toolbar — all controls consistent w-8 h-8 */}
            {isOwnProfile && (
                <div className="absolute top-2 right-2 z-10 flex gap-0.5">
                    {/* Activate / deactivate toggle */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={onToggleActive}
                            aria-label={cameraSystem.isActive ? 'Deactivate camera system' : 'Activate camera system'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 ${cameraSystem.isActive
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                {cameraSystem.isActive ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
                                )}
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-52 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {cameraSystem.isActive
                                ? 'Camera system is active. It will be matched automatically when uploading photos. Click to deactivate.'
                                : 'Camera system is inactive and will not be matched when uploading photos. Click to activate.'}
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Favorite button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={onSetFavorite}
                            aria-label={isFavorite ? 'Default camera system' : 'Set as default camera system'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 ${isFavorite
                                ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-400'
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
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-56 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {isFavorite
                                ? 'This is your default camera system. It is pre-selected when uploading photos to the gallery.'
                                : 'Set as default camera system. Your default camera system is pre-selected when uploading photos to the gallery.'}
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Clone button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={onClone}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-150"
                            aria-label="Clone camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-44 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Clone camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Edit button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 hover:scale-110 transition-all duration-150"
                            aria-label="Edit camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-36 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Edit camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Delete button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={onDelete}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-100 hover:scale-110 transition-all duration-150"
                            aria-label="Delete camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-40 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Delete camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>
                </div>
            )}

            {/* Layout: photo left, name right, components below */}
            <div className="p-3">
                <div className="flex items-start gap-3">
                    {/* System cover photo — 1:1, left-aligned */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-blue-50 border border-gray-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={cameraSystem.imagePath ? `/api/media${cameraSystem.imagePath}` : '/housings/camera-system-placeholder.png'}
                            alt={`${cameraSystem.name} assembled`}
                            className={`w-full h-full ${cameraSystem.imagePath ? 'object-cover' : 'object-contain p-2'}`}
                        />
                    </div>

                    {/* Name + photo link */}
                    <div className="min-w-0 pr-16 sm:pr-8 pt-1">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-snug">{cameraSystem.name}</h3>
                        {cameraSystem._count.galleryPhotos > 0 && (
                            <a
                                href={`/users/${userId}/camera-systems/${cameraSystem.id}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {cameraSystem._count.galleryPhotos} {cameraSystem._count.galleryPhotos === 1 ? 'photo' : 'photos'}
                            </a>
                        )}
                    </div>
                </div>

                {/* Components section — dedicated divider + vertical list */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Components</span>
                    <div className="mt-1.5 space-y-1">
                        {items.map(item => (
                            <div key={item.label} className="flex items-center gap-1.5 text-xs">
                                <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                    <Image
                                        src={item.img.src}
                                        alt={item.name}
                                        fill
                                        className="object-contain p-0.5"
                                        onError={(e) => {
                                            const img = e.currentTarget as HTMLImageElement
                                            if (img.src !== item.img.fallback) img.src = item.img.fallback
                                        }}
                                        sizes="20px"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide w-12 shrink-0">{item.label}</span>
                                <span className="text-gray-700 truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
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

export default function CameraSystemsSection({ userId, isOwnProfile, prefillCamera, prefillLens }: Props) {
    const [cameraSystems, setCameraSystems] = useState<SavedCameraSystem[]>([])
    const [equipment, setEquipment] = useState<EquipmentData | null>(null)
    const [defaultCameraSystemId, setDefaultCameraSystemId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCameraSystem, setEditingCameraSystem] = useState<SavedCameraSystem | null>(null)
    const [cloneSource, setCloneSource] = useState<SavedCameraSystem | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    // Banner shown when prefill params are present and no camera system matched
    const [showPrefillBanner, setShowPrefillBanner] = useState(!!(prefillCamera || prefillLens))

    const fetchCameraSystems = useCallback(async () => {
        try {
            const res = await fetch(`/api/camera-systems?userId=${userId}`)
            const json = await res.json()
            if (json.success) {
                setCameraSystems(json.data.cameraSystems)
                setDefaultCameraSystemId(json.data.defaultCameraSystemId)
            }
        } catch {
            setError('Failed to load camera systems')
        }
    }, [userId])

    useEffect(() => {
        async function load() {
            try {
                const [equipRes, cameraSystemsRes] = await Promise.all([
                    fetch('/api/camera-systems'),
                    fetch(`/api/camera-systems?userId=${userId}`),
                ])
                const [equipJson, cameraSystemsJson] = await Promise.all([equipRes.json(), cameraSystemsRes.json()])
                if (equipJson.success) setEquipment(equipJson.data)
                if (cameraSystemsJson.success) {
                    setCameraSystems(cameraSystemsJson.data.cameraSystems)
                    setDefaultCameraSystemId(cameraSystemsJson.data.defaultCameraSystemId)
                }
                // Auto-open the add camera system modal when arriving from the gallery upload "create camera system" link
                if (isOwnProfile && (prefillCamera || prefillLens)) {
                    setIsModalOpen(true)
                }
            } catch {
                setError('Failed to load camera systems')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [userId])

    function openAdd() {
        setEditingCameraSystem(null)
        setCloneSource(null)
        setIsModalOpen(true)
    }

    function openEdit(cameraSystem: SavedCameraSystem) {
        setEditingCameraSystem(cameraSystem)
        setCloneSource(null)
        setIsModalOpen(true)
    }

    function openClone(source: SavedCameraSystem) {
        setEditingCameraSystem(null)
        setCloneSource(source)
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingCameraSystem(null)
        setCloneSource(null)
    }

    async function handleSave(payload: CameraSystemSavePayload) {
        setIsSaving(true)
        try {
            // Upload new photo if one was selected
            let imagePath = payload.imagePath
            if (payload.cameraSystemPhoto) {
                const fd = new FormData()
                fd.append('file', payload.cameraSystemPhoto)
                const uploadRes = await fetch('/api/camera-systems/photos', { method: 'POST', body: fd })
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
            if (editingCameraSystem) {
                res = await fetch(`/api/camera-systems?id=${editingCameraSystem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: payload.name,
                        cameraId: payload.cameraId,
                        lensId: payload.lensId,
                        housingId: payload.housingId,
                        portAdapterId: payload.portAdapterId,
                        extensionRingIds: payload.extensionRingIds,
                        portId: payload.portId,
                        imagePath,
                    }),
                })
            } else {
                res = await fetch('/api/camera-systems', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: payload.name,
                        cameraId: payload.cameraId,
                        lensId: payload.lensId,
                        housingId: payload.housingId,
                        portAdapterId: payload.portAdapterId,
                        extensionRingIds: payload.extensionRingIds,
                        portId: payload.portId,
                        imagePath,
                    }),
                })
            }
            if (res.ok) {
                await fetchCameraSystems()
                closeModal()
            } else {
                const json = await res.json()
                setError(json.error ?? 'Failed to save camera system')
            }
        } catch {
            setError('Failed to save camera system')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleSetFavorite(cameraSystemId: number) {
        try {
            const res = await fetch(`/api/camera-systems/favorite?id=${cameraSystemId}`, { method: 'PATCH' })
            if (res.ok) {
                const json = await res.json()
                setDefaultCameraSystemId(json.defaultCameraSystemId)
            } else {
                setError('Failed to set default camera system')
            }
        } catch {
            setError('Failed to set default camera system')
        }
    }

    async function handleToggleActive(cameraSystemId: number) {
        try {
            const res = await fetch(`/api/camera-systems/active?id=${cameraSystemId}`, { method: 'PATCH' })
            if (res.ok) {
                const json = await res.json()
                setCameraSystems(prev => prev.map(r => r.id === cameraSystemId ? { ...r, isActive: json.isActive } : r))
            } else {
                setError('Failed to update camera system')
            }
        } catch {
            setError('Failed to update camera system')
        }
    }

    async function handleDelete(cameraSystemId: number) {
        if (!confirm('Delete this camera system?')) return
        try {
            const res = await fetch(`/api/camera-systems?id=${cameraSystemId}`, { method: 'DELETE' })
            if (res.ok) {
                setCameraSystems(prev => prev.filter(r => r.id !== cameraSystemId))
                if (defaultCameraSystemId === cameraSystemId) setDefaultCameraSystemId(null)
            } else {
                const json = await res.json().catch(() => ({}))
                setError((json as { error?: string }).error ?? 'Failed to delete camera system')
            }
        } catch {
            setError('Failed to delete camera system')
        }
    }

    const editingInitialValues: CameraSystemInitialValues | undefined = cloneSource
        ? {
            name: '',
            imagePath: null,
            cameraId: cloneSource.camera.id,
            lensId: cloneSource.lens?.id ?? null,
            housingId: cloneSource.housing?.id ?? null,
            portAdapterId: cloneSource.portAdapter?.id ?? null,
            extensionRingIds: cloneSource.extensionRings.map(r => r.id),
            portId: cloneSource.port?.id ?? null,
        }
        : editingCameraSystem
            ? {
                id: editingCameraSystem.id,
                name: editingCameraSystem.name,
                imagePath: editingCameraSystem.imagePath,
                cameraId: editingCameraSystem.camera.id,
                lensId: editingCameraSystem.lens?.id ?? null,
                housingId: editingCameraSystem.housing?.id ?? null,
                portAdapterId: editingCameraSystem.portAdapter?.id ?? null,
                extensionRingIds: editingCameraSystem.extensionRings.map(r => r.id),
                portId: editingCameraSystem.port?.id ?? null,
            }
            : (() => {
                // When adding a new camera system, pre-select camera/lens by EXIF id if prefill params are present
                if (!equipment || (!prefillCamera && !prefillLens)) return undefined
                const matchedCamera = prefillCamera
                    ? equipment.cameras.find((c: { exifId: string | null }) => c.exifId === prefillCamera) ?? null
                    : null
                const matchedLens = prefillLens
                    ? equipment.lenses.find((l: { exifId: string | null }) => l.exifId === prefillLens) ?? null
                    : null
                if (!matchedCamera && !matchedLens) return undefined
                return {
                    name: '',
                    cameraId: matchedCamera?.id ?? null,
                    lensId: matchedLens?.id ?? null,
                    housingId: null,
                    portAdapterId: null,
                    extensionRingIds: [],
                    portId: null,
                } satisfies CameraSystemInitialValues
            })()

    return (
        <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Camera Systems</h2>

            {/* Prefill banner — shown when arriving from gallery upload "create camera system" link */}
            {showPrefillBanner && isOwnProfile && (
                <div className="mb-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                    </svg>
                    <div className="flex-1 text-sm text-blue-800">
                        <p className="font-medium">Create a camera system for your camera</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {[prefillCamera, prefillLens].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPrefillBanner(false)}
                        className="text-blue-400 hover:text-blue-600"
                        aria-label="Dismiss"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {loading && <p className="text-sm text-gray-400">Loading camera systems…</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !isOwnProfile && cameraSystems.length === 0 && (
                <p className="text-sm text-gray-400">No camera systems shared yet.</p>
            )}

            {!loading && (cameraSystems.length > 0 || isOwnProfile) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cameraSystems.map((cameraSystem, i) => (
                        <CameraSystemCard
                            key={cameraSystem.id}
                            cameraSystem={cameraSystem}
                            userId={userId}
                            isOwnProfile={isOwnProfile}
                            isFavorite={cameraSystem.id === defaultCameraSystemId}
                            onSetFavorite={() => handleSetFavorite(cameraSystem.id)}
                            onToggleActive={() => handleToggleActive(cameraSystem.id)}
                            onEdit={() => openEdit(cameraSystem)}
                            onClone={() => openClone(cameraSystem)}
                            onDelete={() => handleDelete(cameraSystem.id)}
                        />
                    ))}
                    {isOwnProfile && (
                        <button
                            type="button"
                            onClick={openAdd}
                            className="min-h-24 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs font-medium">Add camera system</span>
                        </button>
                    )}
                </div>
            )}

            {isModalOpen && equipment && (
                <Modal
                    title={
                        cloneSource
                            ? 'Clone camera system'
                            : editingCameraSystem
                                ? 'Edit camera system'
                                : 'Add camera system'
                    }
                    onClose={closeModal}
                >
                    <CameraSystemPicker
                        cameras={equipment.cameras}
                        lenses={equipment.lenses}
                        housings={equipment.housings}
                        portAdapters={equipment.portAdapters}
                        extensionRings={equipment.extensionRings}
                        ports={equipment.ports}
                        initialValues={editingInitialValues}
                        onSave={handleSave}
                        onCancel={closeModal}
                        isSaving={isSaving}
                        readOnly={!!editingCameraSystem}
                    />
                </Modal>
            )}
        </section>
    )
}
