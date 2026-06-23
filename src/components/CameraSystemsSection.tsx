'use client'

import { useState, useEffect, useCallback } from 'react'
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
import CameraSystemCard from './CameraSystemCard'

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
