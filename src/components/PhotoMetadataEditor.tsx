'use client'

import { useState, useRef, useEffect } from 'react'
import LocationPicker, { type LocationValue } from './LocationPicker'
import { type MultiFileProgress } from '@/lib/heicConvert'
import { HeicMultiProgressBar } from '@/components/HeicProgressBar'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface UserRig {
    id: number
    name: string
    isActive: boolean
    camera: {
        id: number
        name: string
        brand: { name: string }
        exifId: string | null
        interchangeableLens: boolean
    }
    lens: { id: number; name: string; exifId: string | null } | null
    housing: { id: number; name: string; manufacturer: { name: string } } | null
    port: { id: number; name: string } | null
}

export interface UploadForm {
    caption: string
    takenAt: string
    iso: string
    focalLength: string
    aperture: string
    shutterSpeed: string
}

export const EMPTY_FORM: UploadForm = {
    caption: '',
    takenAt: '',
    iso: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
}

export interface PendingPhoto {
    id: string
    /** Blob URL for device files; CDN URL for Instagram photos */
    preview: string
    /** Only present for device file uploads */
    file?: File
    dimensions: { width: number; height: number } | null
    form: UploadForm
    locationValue: LocationValue | null
    exifCameraModel: string | null
    exifLensModel: string | null
    exifLoading: boolean
    selectedRigId: string
    /** Form fields populated from the photo's embedded EXIF metadata — locked read-only (Rule G1) */
    exifFields?: ReadonlyArray<keyof UploadForm>
    /** Form fields pre-filled from Instagram caption parsing — editable but badged */
    captionFields?: ReadonlyArray<keyof UploadForm>
    exifCheckResult: { cameraExists: boolean | null; lensExists: boolean | null } | null
    /** Only present for Instagram imports */
    instagram?: { mediaId: string; mediaUrl: string; timestamp: string }
}

// ─── Helpers (exported so parents can reuse) ──────────────────────────────────

export function computeAutoMatches(
    photo: Pick<PendingPhoto, 'exifCameraModel' | 'exifLensModel'>,
    activeRigs: UserRig[]
): UserRig[] {
    if (!photo.exifCameraModel) return []
    const builtIn = !!(photo.exifLensModel && photo.exifLensModel.startsWith(photo.exifCameraModel))
    return activeRigs.filter(r => {
        if (r.camera.exifId !== photo.exifCameraModel) return false
        if (!r.camera.interchangeableLens || builtIn) return true
        if (photo.exifLensModel && r.lens !== null) return r.lens.exifId === photo.exifLensModel
        return true
    })
}

export type TabStatus = 'loading' | 'matched' | 'ambiguous' | 'warning' | 'none'

export function getPhotoTabStatus(photo: PendingPhoto, userRigs: UserRig[], rigsLoaded: boolean): TabStatus {
    if (photo.exifLoading) return 'loading'
    if (photo.selectedRigId) return 'matched'
    if (!rigsLoaded) return 'none'
    if (!photo.exifCameraModel) return 'none'
    const matches = computeAutoMatches(photo, userRigs.filter(r => r.isActive))
    if (matches.length > 1) return 'ambiguous'
    if (matches.length === 0) return 'warning'
    return 'none'
}

export function toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function TabStatusBadge({ status }: { status: TabStatus }) {
    if (status === 'none') return null
    if (status === 'loading') return (
        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-3 h-3 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
        </span>
    )
    if (status === 'matched') return (
        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        </span>
    )
    return (
        <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm text-white font-bold leading-none
            ${status === 'ambiguous' ? 'bg-blue-500 text-[8px]' : 'bg-amber-500 text-[9px]'}`}>
            {status === 'ambiguous' ? '?' : '!'}
        </span>
    )
}

/**
 * Small inline chip with tooltip explaining the data source.
 * Rule G3: display the source of each metadata field.
 */
function SourceBadge({ source }: { source: 'exif' | 'caption' | 'rig' | 'manual' }) {
    if (source === 'rig') {
        return (
            <span className="relative group/src inline-flex items-center">
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded cursor-help select-none bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Rig
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 leading-relaxed text-center
                    opacity-0 group-hover/src:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                    Populated from the selected camera rig.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </span>
            </span>
        )
    }
    if (source === 'manual') {
        return (
            <span className="relative group/src inline-flex items-center">
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded cursor-help select-none bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Manual
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 leading-relaxed text-center
                    opacity-0 group-hover/src:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                    Entered manually. You can edit this field.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </span>
            </span>
        )
    }
    const isExif = source === 'exif'
    const tooltip = isExif
        ? 'Read from the photo\'s embedded EXIF metadata. Accepted as ground truth and cannot be edited.'
        : 'Extracted from the Instagram caption text. You can edit this if needed.'
    return (
        <span className="relative group/src inline-flex items-center">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded cursor-help select-none
                ${isExif ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                {isExif ? (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ) : (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                )}
                {isExif ? 'EXIF' : 'Caption'}
            </span>
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-2 leading-relaxed text-center
                opacity-0 group-hover/src:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                {tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </span>
        </span>
    )
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface PhotoMetadataEditorProps {
    photos: PendingPhoto[]
    onUpdatePhoto: (id: string, patch: Partial<PendingPhoto>) => void
    onRemovePhoto: (id: string) => void
    userRigs: UserRig[]
    rigsLoaded: boolean
    /** Used for building the "create rig" link */
    userId: string | number | null | undefined
    /** If provided, an "Add" button is shown at the end of the tab strip */
    onAddFiles?: () => void
    batchProgress?: MultiFileProgress | null
    onSubmit: () => void
    onCancel: () => void
    /** Defaults to "Upload photo" / "Upload N photos" */
    submitLabel?: string
    isSubmittable: boolean
    globalError?: string | null
    onClearGlobalError?: () => void
    /** Rendered inside the scroll area when photos.length === 0 (drop zone etc.) */
    emptySlot?: React.ReactNode
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhotoMetadataEditor({
    photos,
    onUpdatePhoto,
    onRemovePhoto,
    userRigs,
    rigsLoaded,
    userId,
    onAddFiles,
    batchProgress,
    onSubmit,
    onCancel,
    submitLabel,
    isSubmittable,
    globalError,
    onClearGlobalError,
    emptySlot,
}: PhotoMetadataEditorProps) {
    const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
    const tabStripRef = useRef<HTMLDivElement>(null)

    // ── Ensure activePhotoId stays valid after photo removal ─────────────────
    useEffect(() => {
        if (photos.length === 0) {
            setActivePhotoId(null)
        } else if (!photos.find(p => p.id === activePhotoId)) {
            setActivePhotoId(photos[0].id)
        }
    }, [photos, activePhotoId])

    // ── Auto-scroll the active tab thumbnail into view ───────────────────────
    useEffect(() => {
        if (!activePhotoId || !tabStripRef.current) return
        const el = tabStripRef.current.querySelector<HTMLElement>(`[data-photo-id="${activePhotoId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [activePhotoId])

    const activePhoto = photos.find(p => p.id === activePhotoId) ?? null

    // ── Fetch exifCheckResult when a no-match situation is shown ─────────────
    useEffect(() => {
        const photo = activePhoto
        if (!photo) return
        const photoId = photo.id
        const activeRigsList = userRigs.filter(r => r.isActive)
        const exifDone = !photo.exifLoading
        const autoMatches = computeAutoMatches(photo, activeRigsList)
        const showNoMatch =
            exifDone &&
            rigsLoaded &&
            photo.exifCameraModel !== null &&
            activeRigsList.length > 0 &&
            autoMatches.length === 0

        if (!showNoMatch || !photo.exifCameraModel || photo.exifCheckResult !== null) return

        const params = new URLSearchParams()
        params.set('camera', photo.exifCameraModel)
        const isBuiltIn = !!(photo.exifLensModel && photo.exifLensModel.startsWith(photo.exifCameraModel))
        if (photo.exifLensModel && !isBuiltIn) params.set('lens', photo.exifLensModel)

        fetch(`/api/exif-check?${params}`)
            .then(r => r.json())
            .then(data => onUpdatePhoto(photoId, { exifCheckResult: data }))
            .catch(() => { })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activePhoto?.id,
        activePhoto?.exifLoading,
        activePhoto?.exifCameraModel,
        activePhoto?.exifLensModel,
        activePhoto?.exifCheckResult,
        rigsLoaded,
    ])

    // ── Derived state for the active photo ───────────────────────────────────
    const activeRigsForPhoto = userRigs.filter(r => r.isActive)
    const exifDone = activePhoto !== null && !activePhoto.exifLoading
    const isBuiltInLensFromExif = !!(
        activePhoto?.exifCameraModel &&
        activePhoto.exifLensModel &&
        activePhoto.exifLensModel.startsWith(activePhoto.exifCameraModel)
    )
    const exifCameraRig = activePhoto?.exifCameraModel
        ? activeRigsForPhoto.find(r => r.camera.exifId === activePhoto.exifCameraModel)
        : undefined
    const isFixedLensCamera = exifCameraRig ? !exifCameraRig.camera.interchangeableLens : false
    const lensIsFixed = isFixedLensCamera || isBuiltInLensFromExif
    const autoMatches = activePhoto ? computeAutoMatches(activePhoto, activeRigsForPhoto) : []
    const autoMatchedRig = activePhoto?.selectedRigId
        ? autoMatches.find(r => String(r.id) === activePhoto.selectedRigId) ?? null
        : null
    const showNoMatch =
        exifDone &&
        rigsLoaded &&
        !!activePhoto?.exifCameraModel &&
        activeRigsForPhoto.length > 0 &&
        autoMatches.length === 0
    const showNoRigs = exifDone && rigsLoaded && activeRigsForPhoto.length === 0

    // Rule G2: when EXIF camera is known, only show rigs that match it.
    // When no EXIF camera, show all active rigs.
    const rigsToShow = activePhoto?.exifCameraModel ? autoMatches : activeRigsForPhoto

    // Rig selected by the user — used to populate camera/lens display when no EXIF data is present
    const selectedRig = activePhoto?.selectedRigId
        ? activeRigsForPhoto.find(r => String(r.id) === activePhoto.selectedRigId) ?? null
        : null

    // Camera & Lens display values (Rule G3) — always shown in Shot Details
    const cameraSource: 'exif' | 'rig' | null =
        activePhoto?.exifCameraModel ? 'exif' : (selectedRig ? 'rig' : null)
    const cameraValue = activePhoto?.exifCameraModel
        ?? (selectedRig ? `${selectedRig.camera.brand.name} ${selectedRig.camera.name}` : '')
    const showExifLens = !isFixedLensCamera && !isBuiltInLensFromExif && !!activePhoto?.exifLensModel
    const showRigLens = !activePhoto?.exifCameraModel && !!selectedRig?.lens
    const lensSource: 'exif' | 'rig' | null = showExifLens ? 'exif' : (showRigLens ? 'rig' : null)
    const lensValue = showExifLens
        ? (activePhoto?.exifLensModel ?? '')
        : (showRigLens ? selectedRig!.lens!.name : '')

    const createRigUrl = (() => {
        if (!userId) return '#'
        const params = new URLSearchParams()
        if (activePhoto?.exifCameraModel) params.set('prefillCamera', activePhoto.exifCameraModel)
        if (activePhoto?.exifLensModel) params.set('prefillLens', activePhoto.exifLensModel)
        return `/users/${userId}?${params.toString()}`
    })()

    const unmatched = photos.filter(p => !p.selectedRigId).length
    const effectiveLabel =
        submitLabel ??
        (photos.length > 1 ? `Upload ${photos.length} photos` : 'Upload photo')

    // ── Field helpers ─────────────────────────────────────────────────────────

    /** Returns the data source for a form field (Rule G3) */
    const fieldSource = (key: keyof UploadForm): 'exif' | 'caption' | null => {
        if (activePhoto?.exifFields?.includes(key)) return 'exif'
        if (activePhoto?.captionFields?.includes(key)) return 'caption'
        return null
    }

    /**
     * Renders a single shot-detail field.
     * EXIF fields are locked read-only (Rule G1). Caption-extracted fields are
     * editable but badged. Unknown-source fields are plain editable inputs.
     */
    const shotField = (
        key: keyof UploadForm,
        label: string,
        opts?: { type?: string; placeholder?: string; optional?: boolean }
    ) => {
        const src = fieldSource(key)
        const value = activePhoto?.form[key] ?? ''
        return (
            <div>
                <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs font-medium text-gray-700">
                        {label}
                        {opts?.optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
                    </label>
                    <SourceBadge source={src ?? 'manual'} />
                </div>
                {src === 'exif' ? (
                    <div className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-100 min-h-[34px] flex items-center cursor-not-allowed select-none">
                        {value || <span className="italic">—</span>}
                    </div>
                ) : (
                    <input
                        type={opts?.type ?? 'text'}
                        value={value}
                        onChange={e =>
                            activePhoto &&
                            onUpdatePhoto(activePhoto.id, { form: { ...activePhoto.form, [key]: e.target.value } })
                        }
                        placeholder={opts?.placeholder}
                        className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900
                            ${src === 'caption' ? 'border-violet-200 bg-violet-50/40' : 'border-gray-300'}`}
                    />
                )}
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* HEIC conversion progress */}
            {batchProgress && (
                <div className="px-6 pt-3 shrink-0">
                    <HeicMultiProgressBar progress={batchProgress} />
                </div>
            )}

            {/* Tab strip — shown when at least one photo is loaded */}
            {photos.length > 0 && (
                <div
                    ref={tabStripRef}
                    className="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b shrink-0"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {photos.map((photo, idx) => {
                        const status = getPhotoTabStatus(photo, userRigs, rigsLoaded)
                        const isActive = photo.id === activePhotoId
                        return (
                            <div
                                key={photo.id}
                                data-photo-id={photo.id}
                                className={`group/thumb relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 animate-upload-thumb-in
                                    ${isActive
                                        ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                                        : 'border-gray-200 hover:border-gray-400'}`}
                                onClick={() => setActivePhotoId(photo.id)}
                                role="button"
                                aria-label={`Photo ${idx + 1}`}
                                aria-pressed={isActive}
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && setActivePhotoId(photo.id)}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.preview}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                                <TabStatusBadge status={status} />
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); onRemovePhoto(photo.id) }}
                                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs transition-opacity opacity-0 group-hover/thumb:opacity-100 touch:opacity-100 focus:opacity-100"
                                    aria-label="Remove photo"
                                >
                                    ×
                                </button>
                            </div>
                        )
                    })}

                    {onAddFiles && (
                        <button
                            type="button"
                            onClick={onAddFiles}
                            className="shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 gap-0.5"
                            aria-label="Add more photos"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-[9px] font-medium">Add</span>
                        </button>
                    )}
                </div>
            )}

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                {/* Empty slot (drop zone or placeholder) */}
                {photos.length === 0 && emptySlot}

                {/* Per-photo form — key triggers re-mount animation on tab switch */}
                {activePhoto && (
                    <div key={activePhoto.id} className="animate-upload-tab-in space-y-5">

                        {/* Preview + info */}
                        <div className="flex gap-4 items-start">
                            <div className="relative shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={activePhoto.preview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {activePhoto.file?.name ?? (activePhoto.instagram ? 'Instagram photo' : 'Photo')}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {activePhoto.dimensions
                                        ? `${activePhoto.dimensions.width} × ${activePhoto.dimensions.height}px`
                                        : ''}
                                    {activePhoto.file
                                        ? ` · ${(activePhoto.file.size / 1024 / 1024).toFixed(1)} MB`
                                        : ''}
                                </p>
                                {activePhoto.exifLoading && (
                                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Reading EXIF data…
                                    </p>
                                )}
                                {photos.length > 1 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Photo {photos.findIndex(p => p.id === activePhoto.id) + 1} of {photos.length}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemovePhoto(activePhoto.id)}
                                    className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {/* Caption — optional */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Caption
                                <span className="text-gray-400 font-normal ml-1">(optional)</span>
                            </label>
                            <textarea
                                value={activePhoto.form.caption}
                                onChange={e =>
                                    onUpdatePhoto(activePhoto.id, {
                                        form: { ...activePhoto.form, caption: e.target.value },
                                    })
                                }
                                placeholder="e.g. Nudibranch on coral"
                                rows={2}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                            />
                        </div>

                        {/* Location — optional */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Location
                                <span className="text-gray-400 font-normal ml-1">(optional)</span>
                            </label>
                            <LocationPicker
                                value={activePhoto.locationValue}
                                onChange={val => onUpdatePhoto(activePhoto.id, { locationValue: val })}
                            />
                        </div>

                        {/* Camera Rig — required */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Camera Rig</p>
                            <div className="space-y-3">

                                {/* Loading / matching state */}
                                {(activePhoto.exifLoading || !rigsLoaded) && (
                                    <p className="text-xs text-gray-400 italic">Looking for matching rig…</p>
                                )}

                                {/* No rigs warning */}
                                {showNoRigs && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-1.5">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            </svg>
                                            <p className="text-xs text-amber-800">You have no camera rigs set up yet.</p>
                                        </div>
                                        <a href={createRigUrl} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                                            Create a rig on your profile
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                )}

                                {/* No matching rig warning (Rule G2: only matching rigs can be selected) */}
                                {showNoMatch && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-1.5">
                                        <div className="flex items-start gap-2">
                                            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            </svg>
                                            <p className="text-xs text-amber-800">
                                                {activePhoto.exifCheckResult?.cameraExists === false ? (
                                                    <>Camera &quot;{activePhoto.exifCameraModel}&quot; is not yet in the database — it needs to be added with its EXIF name set before rigs can be matched.</>
                                                ) : activePhoto.exifCheckResult?.lensExists === false ? (
                                                    <>Lens &quot;{activePhoto.exifLensModel}&quot; is not yet in the database — it needs to be added with its EXIF name set before rigs can be matched.</>
                                                ) : (
                                                    <>
                                                        No saved rig matched
                                                        {activePhoto.exifCameraModel ? ` camera "${activePhoto.exifCameraModel}"` : ''}
                                                        {activePhoto.exifLensModel && !lensIsFixed ? ` with lens "${activePhoto.exifLensModel}"` : ''}.
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        {activePhoto.exifCheckResult?.cameraExists !== false && (
                                            <a href={createRigUrl} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                                                Create a rig for this camera
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Single auto-matched rig — confirmed green box */}
                                {exifDone && rigsLoaded && autoMatchedRig && autoMatches.length === 1 && (
                                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-green-800 truncate">{autoMatchedRig.name}</p>
                                            <p className="text-[10px] text-green-600 truncate">
                                                {autoMatchedRig.camera.brand.name} {autoMatchedRig.camera.name}
                                                {autoMatchedRig.lens ? ` · ${autoMatchedRig.lens.name}` : ''}
                                                {autoMatchedRig.housing ? ` · ${autoMatchedRig.housing.manufacturer.name} ${autoMatchedRig.housing.name}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onUpdatePhoto(activePhoto.id, { selectedRigId: '' })}
                                            className="text-[10px] text-blue-600 hover:underline shrink-0"
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}

                                {/* Rig dropdown — shown when there are eligible rigs and no single confirmed auto-match */}
                                {exifDone && rigsLoaded && rigsToShow.length > 0 && !(autoMatches.length === 1 && autoMatchedRig) && (
                                    <>
                                        {autoMatches.length > 1 && !activePhoto.selectedRigId && (
                                            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                                Multiple rigs match this camera and lens. Please select one:
                                            </p>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Camera rig</label>
                                            <select
                                                value={activePhoto.selectedRigId}
                                                onChange={e => onUpdatePhoto(activePhoto.id, { selectedRigId: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                            >
                                                <option value="">
                                                    {activePhoto.exifCameraModel ? '— select a matching rig —' : '— none —'}
                                                </option>
                                                {rigsToShow.map(r => (
                                                    <option key={r.id} value={String(r.id)}>
                                                        {r.name}{r.camera ? ` (${r.camera.brand.name} ${r.camera.name}${r.lens ? ` · ${r.lens.name}` : ''})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* No camera data fallback hint */}
                                {exifDone && rigsLoaded && !activePhoto.exifCameraModel && rigsToShow.length === 0 && !showNoRigs && (
                                    <p className="text-xs text-gray-400 italic">
                                        {activePhoto.instagram
                                            ? 'No EXIF data available for Instagram photos.'
                                            : 'No camera data found in EXIF.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Shot details — Camera/Lens always shown; EXIF fields locked (Rule G1) */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shot details</p>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Camera — always shown, source-badged when known */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <label className="text-xs font-medium text-gray-700">Camera</label>
                                        {cameraSource && <SourceBadge source={cameraSource} />}
                                    </div>
                                    <div className={`px-3 py-1.5 border rounded-lg text-sm min-h-[34px] flex items-center
                                        ${cameraSource ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed select-none' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                                        {cameraValue || <span className="italic">—</span>}
                                    </div>
                                </div>
                                {/* Lens — always shown, source-badged when known */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <label className="text-xs font-medium text-gray-700">Lens</label>
                                        {lensSource && <SourceBadge source={lensSource} />}
                                    </div>
                                    <div className={`px-3 py-1.5 border rounded-lg text-sm min-h-[34px] flex items-center
                                        ${lensSource ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed select-none' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                                        {lensValue || <span className="italic">—</span>}
                                    </div>
                                </div>
                                {shotField('takenAt', 'Date taken', { type: 'datetime-local', optional: true })}
                                {shotField('iso', 'ISO', { type: 'number', optional: true })}
                                {shotField('focalLength', 'Focal length (mm)', { type: 'number', optional: true })}
                                {shotField('aperture', 'Aperture (f/)', { type: 'number', optional: true })}
                                {shotField('shutterSpeed', 'Shutter speed', { optional: true })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error banner */}
                {globalError && (
                    <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            />
                        </svg>
                        <span className="flex-1">{globalError}</span>
                        <button
                            onClick={onClearGlobalError}
                            className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            {photos.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-3">
                        {unmatched > 0 && (
                            <p className="text-xs text-amber-600 hidden sm:block">
                                {unmatched} photo{unmatched !== 1 ? 's' : ''} without a rig
                            </p>
                        )}
                        <button
                            onClick={onSubmit}
                            disabled={!isSubmittable}
                            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {effectiveLabel}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
