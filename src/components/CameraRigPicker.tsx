'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getHousingImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraMount {
    id: number
    name: string
    slug: string
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
}

export interface PickerCamera {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    manufacturerId: number
    brand: Manufacturer
    cameraMount: CameraMount | null
    interchangeableLens: boolean
    canBeUsedWithoutAHousing: boolean
}

export interface PickerLens {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    cameraMountId: number
    ports: { id: number }[]
}

export interface PickerHousing {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    cameraId: number
    interchangeablePort: boolean
    housingMount: HousingMount | null
    manufacturer: Manufacturer
}

export interface PickerPort {
    id: number
    name: string
    slug: string
    productPhotos: string[]
    housingMountId: number | null
    lens: { id: number }[]
}

export interface RigInitialValues {
    id?: number
    name: string
    imagePath?: string | null
    cameraId: number | null
    lensId: number | null
    housingId: number | null
    portId: number | null
}

export interface RigSavePayload {
    name: string
    cameraId: number
    lensId: number | null
    housingId: number | null
    portId: number | null
    rigPhoto: File | null
    imagePath: string | null
}

interface Props {
    cameras: PickerCamera[]
    lenses: PickerLens[]
    housings: PickerHousing[]
    ports: PickerPort[]
    initialValues?: RigInitialValues
    onSave: (payload: RigSavePayload) => void
    onCancel: () => void
    isSaving?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EquipmentCard({
    name,
    subtitle,
    imageSrc,
    imageFallback,
    selected,
    onClick,
}: {
    name: string
    subtitle?: string
    imageSrc: string
    imageFallback: string
    selected: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-left w-full ${selected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
        >
            <div className="relative w-full aspect-square rounded overflow-hidden bg-gray-100">
                <Image
                    src={imageSrc}
                    alt={name}
                    fill
                    className="object-contain p-1"
                    onError={(e) => {
                        ; (e.currentTarget as HTMLImageElement).src = imageFallback
                    }}
                    sizes="(max-width: 768px) 50vw, 120px"
                />
            </div>
            <p className="text-xs font-medium text-gray-800 text-center leading-tight line-clamp-2">{name}</p>
            {subtitle && <p className="text-xs text-gray-500 text-center">{subtitle}</p>}
        </button>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CameraRigPicker({
    cameras,
    lenses,
    housings,
    ports,
    initialValues,
    onSave,
    onCancel,
    isSaving = false,
}: Props) {
    const [rigName, setRigName] = useState(initialValues?.name ?? '')
    const [rigPhotoFile, setRigPhotoFile] = useState<File | null>(null)
    const [rigPhotoPreview, setRigPhotoPreview] = useState<string | null>(null)
    const [rigIsDragging, setRigIsDragging] = useState(false)
    const [rigPhotoError, setRigPhotoError] = useState<string | null>(null)
    const [rigPhotoRemoved, setRigPhotoRemoved] = useState(false)
    const rigFileInputRef = useRef<HTMLInputElement>(null)
    const rigPreviewUrlRef = useRef<string | null>(null)

    useEffect(() => {
        return () => {
            if (rigPreviewUrlRef.current) URL.revokeObjectURL(rigPreviewUrlRef.current)
        }
    }, [])

    const processRigPhoto = useCallback((f: File) => {
        if (!f.type.startsWith('image/')) {
            setRigPhotoError('Please select an image file.')
            return
        }
        if (f.size > 20 * 1024 * 1024) {
            setRigPhotoError('File must be under 20MB.')
            return
        }
        setRigPhotoError(null)
        setRigPhotoFile(f)
        if (rigPreviewUrlRef.current) URL.revokeObjectURL(rigPreviewUrlRef.current)
        const url = URL.createObjectURL(f)
        rigPreviewUrlRef.current = url
        setRigPhotoPreview(url)
    }, [])

    const handleRigDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setRigIsDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) processRigPhoto(dropped)
    }, [processRigPhoto])

    function removeRigPhoto() {
        setRigPhotoFile(null)
        setRigPhotoPreview(null)
        setRigPhotoError(null)
        setRigPhotoRemoved(true)
        if (rigPreviewUrlRef.current) {
            URL.revokeObjectURL(rigPreviewUrlRef.current)
            rigPreviewUrlRef.current = null
        }
        if (rigFileInputRef.current) rigFileInputRef.current.value = ''
    }
    const [selectedBrandId, setSelectedBrandId] = useState<number | null>(() => {
        if (initialValues?.cameraId) {
            const cam = cameras.find(c => c.id === initialValues.cameraId)
            return cam?.brand.id ?? null
        }
        return null
    })
    const [selectedCameraId, setSelectedCameraId] = useState<number | null>(initialValues?.cameraId ?? null)
    const [selectedLensId, setSelectedLensId] = useState<number | null>(initialValues?.lensId ?? null)
    const [selectedHousingId, setSelectedHousingId] = useState<number | null>(initialValues?.housingId ?? null)
    const [selectedPortId, setSelectedPortId] = useState<number | null>(initialValues?.portId ?? null)

    // ── Derived selections ────────────────────────────────────────────────────

    const selectedCamera = useMemo(
        () => cameras.find(c => c.id === selectedCameraId) ?? null,
        [cameras, selectedCameraId]
    )
    const selectedLens = useMemo(
        () => lenses.find(l => l.id === selectedLensId) ?? null,
        [lenses, selectedLensId]
    )
    const selectedHousing = useMemo(
        () => housings.find(h => h.id === selectedHousingId) ?? null,
        [housings, selectedHousingId]
    )
    const selectedPort = useMemo(
        () => ports.find(p => p.id === selectedPortId) ?? null,
        [ports, selectedPortId]
    )

    const isFixedLens = selectedCamera?.interchangeableLens === false
    const canSkipHousing = selectedCamera?.canBeUsedWithoutAHousing === true
    const isFixedPort = selectedHousing?.interchangeablePort === false

    // ── Available items (cascade filtered) ───────────────────────────────────

    const brands = useMemo(() => {
        const seen = new Map<number, Manufacturer>()
        cameras.forEach(c => { if (!seen.has(c.brand.id)) seen.set(c.brand.id, c.brand) })
        return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
    }, [cameras])

    const availableCameras = useMemo(
        () => selectedBrandId ? cameras.filter(c => c.brand.id === selectedBrandId) : [],
        [cameras, selectedBrandId]
    )

    const availableLenses = useMemo(() => {
        if (!selectedCamera?.cameraMount) return []
        return lenses.filter(l => l.cameraMountId === selectedCamera.cameraMount!.id)
    }, [lenses, selectedCamera])

    const availableHousings = useMemo(
        () => selectedCamera ? housings.filter(h => h.cameraId === selectedCamera.id) : [],
        [housings, selectedCamera]
    )

    const availablePorts = useMemo(() => {
        if (!selectedHousing?.housingMount) return []
        if (isFixedLens) {
            return ports.filter(p => p.housingMountId === selectedHousing.housingMount!.id)
        }
        if (!selectedLens) return []
        return ports.filter(
            p =>
                p.housingMountId === selectedHousing.housingMount!.id &&
                p.lens.some(l => l.id === selectedLens.id)
        )
    }, [ports, selectedHousing, selectedLens, isFixedLens])

    // ── Step visibility ───────────────────────────────────────────────────────

    const showLensStep = !!selectedCamera && !isFixedLens
    const showHousingStep = !!selectedCamera && !canSkipHousing
    const showPortStep = !!selectedHousing && !isFixedPort && availablePorts.length > 0

    const canSave =
        rigName.trim().length > 0 &&
        selectedCameraId !== null &&
        (isFixedLens || !showLensStep || selectedLensId !== null) &&
        (!showHousingStep || selectedHousingId !== null) &&
        (!showPortStep || selectedPortId !== null)

    // ── Handlers ──────────────────────────────────────────────────────────────

    function handleBrandSelect(brandId: number) {
        if (brandId === selectedBrandId) return
        setSelectedBrandId(brandId)
        setSelectedCameraId(null)
        setSelectedLensId(null)
        setSelectedHousingId(null)
        setSelectedPortId(null)
    }

    function handleCameraSelect(cameraId: number) {
        if (cameraId === selectedCameraId) {
            setSelectedCameraId(null)
        } else {
            setSelectedCameraId(cameraId)
        }
        setSelectedLensId(null)
        setSelectedHousingId(null)
        setSelectedPortId(null)
    }

    function handleLensSelect(lensId: number) {
        setSelectedLensId(lensId === selectedLensId ? null : lensId)
        setSelectedPortId(null)
    }

    function handleHousingSelect(housingId: number) {
        setSelectedHousingId(housingId === selectedHousingId ? null : housingId)
        setSelectedPortId(null)
    }

    function handlePortSelect(portId: number) {
        setSelectedPortId(portId === selectedPortId ? null : portId)
    }

    function handleSave() {
        if (!selectedCameraId) return
        onSave({
            name: rigName.trim(),
            cameraId: selectedCameraId,
            lensId: isFixedLens ? null : selectedLensId,
            housingId: selectedHousingId,
            portId: selectedPortId,
            rigPhoto: rigPhotoFile,
            imagePath: rigPhotoFile ? null : (rigPhotoRemoved ? null : (initialValues?.imagePath ?? null)),
        })
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">
            {/* Rig name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rig name</label>
                <input
                    type="text"
                    value={rigName}
                    onChange={e => setRigName(e.target.value)}
                    placeholder="e.g. Wildlife macro setup"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Rig photo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rig photo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                {!rigPhotoFile && (!initialValues?.imagePath || rigPhotoRemoved) ? (
                    <div
                        onDragEnter={() => setRigIsDragging(true)}
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={() => setRigIsDragging(false)}
                        onDrop={handleRigDrop}
                        onClick={() => rigFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl py-8 px-6 text-center cursor-pointer transition-colors ${rigIsDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                    >
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-700 font-medium text-sm mb-0.5">Drag &amp; drop a photo of your assembled rig</p>
                        <p className="text-gray-400 text-xs">or tap to browse — JPG, PNG, WebP · max 20MB</p>
                        <input
                            ref={rigFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) processRigPhoto(f) }}
                        />
                    </div>
                ) : (
                    <div className="flex items-start gap-3">
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={rigPhotoPreview ?? (initialValues?.imagePath ? `/api/media${initialValues.imagePath}` : '')}
                                alt="Rig preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-gray-600">
                                {rigPhotoFile ? rigPhotoFile.name : 'Current photo'}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => rigFileInputRef.current?.click()}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                    Replace
                                </button>
                                <button
                                    type="button"
                                    onClick={removeRigPhoto}
                                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            </div>
                            <input
                                ref={rigFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) processRigPhoto(f) }}
                            />
                        </div>
                    </div>
                )}
                {rigPhotoError && <p className="mt-1 text-xs text-red-500">{rigPhotoError}</p>}
            </div>

            {/* Step 1 – Camera brand */}
            <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Camera brand</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {brands.map(brand => (
                        <button
                            key={brand.id}
                            type="button"
                            onClick={() => handleBrandSelect(brand.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedBrandId === brand.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                }`}
                        >
                            {brand.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Step 2 – Camera model */}
            {availableCameras.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Camera</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {availableCameras.map(cam => {
                            const img = getCameraImagePathWithFallback(cam.productPhotos)
                            return (
                                <EquipmentCard
                                    key={cam.id}
                                    name={cam.name}
                                    imageSrc={img.src}
                                    imageFallback={img.fallback}
                                    selected={selectedCameraId === cam.id}
                                    onClick={() => handleCameraSelect(cam.id)}
                                />
                            )
                        })}
                    </div>
                    {isFixedLens && (
                        <p className="mt-1.5 text-xs text-gray-500">This camera has a fixed lens — no lens selection needed.</p>
                    )}
                    {canSkipHousing && (
                        <p className="mt-1.5 text-xs text-gray-500">This camera is waterproof — housing is optional.</p>
                    )}
                </section>
            )}

            {/* Step 3 – Lens (only if interchangeable) */}
            {showLensStep && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Lens</h3>
                    {availableLenses.length === 0 ? (
                        <p className="text-xs text-gray-500">No compatible lenses found for this camera mount.</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availableLenses.map(lens => {
                                const img = getLensImagePathWithFallback(lens.productPhotos)
                                return (
                                    <EquipmentCard
                                        key={lens.id}
                                        name={lens.name}
                                        imageSrc={img.src}
                                        imageFallback={img.fallback}
                                        selected={selectedLensId === lens.id}
                                        onClick={() => handleLensSelect(lens.id)}
                                    />
                                )
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Step 4 – Housing */}
            {showHousingStep && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Housing</h3>
                    {availableHousings.length === 0 ? (
                        <p className="text-xs text-gray-500">No housings found for this camera.</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availableHousings.map(housing => {
                                const img = getHousingImagePathWithFallback(housing.productPhotos)
                                return (
                                    <EquipmentCard
                                        key={housing.id}
                                        name={housing.name}
                                        subtitle={housing.manufacturer.name}
                                        imageSrc={img.src}
                                        imageFallback={img.fallback}
                                        selected={selectedHousingId === housing.id}
                                        onClick={() => handleHousingSelect(housing.id)}
                                    />
                                )
                            })}
                        </div>
                    )}
                    {isFixedPort && selectedHousing && (
                        <p className="mt-1.5 text-xs text-gray-500">This housing has a fixed port — no port selection needed.</p>
                    )}
                </section>
            )}

            {/* Step 5 – Port */}
            {showPortStep && (
                <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Port</h3>
                    {availablePorts.length === 0 ? (
                        <p className="text-xs text-gray-500">
                            {!isFixedLens && !selectedLens
                                ? 'Select a lens to see compatible ports.'
                                : 'No compatible ports found.'}
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availablePorts.map(port => {
                                const img = getPortImagePathWithFallback(port.productPhotos)
                                return (
                                    <EquipmentCard
                                        key={port.id}
                                        name={port.name}
                                        imageSrc={img.src}
                                        imageFallback={img.fallback}
                                        selected={selectedPortId === port.id}
                                        onClick={() => handlePortSelect(port.id)}
                                    />
                                )
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || isSaving}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving…' : 'Save rig'}
                </button>
            </div>
        </div>
    )
}
