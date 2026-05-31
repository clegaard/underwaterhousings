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
    rigTab: 'auto' | 'manual'
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
    const showDisambiguation = exifDone && rigsLoaded && autoMatches.length > 1 && !autoMatchedRig
    const showNoMatch =
        exifDone &&
        rigsLoaded &&
        !!activePhoto?.exifCameraModel &&
        activeRigsForPhoto.length > 0 &&
        autoMatches.length === 0
    const showNoRigs = exifDone && rigsLoaded && activeRigsForPhoto.length === 0

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

    // ── Field renderers ──────────────────────────────────────────────────────
    const readonlyField = (label: string, value: string) => (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <div className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 min-h-8">
                {value || <span className="text-gray-400 italic">—</span>}
            </div>
        </div>
    )

    const editableField = (key: keyof UploadForm, label: string, placeholder?: string, type = 'text') => (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
                value={activePhoto?.form[key] ?? ''}
                onChange={e =>
                    activePhoto &&
                    onUpdatePhoto(activePhoto.id, { form: { ...activePhoto.form, [key]: e.target.value } })
                }
                placeholder={placeholder}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
        </div>
    )

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

                        {/* Caption + location */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Caption</label>
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
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                <LocationPicker
                                    value={activePhoto.locationValue}
                                    onChange={val => onUpdatePhoto(activePhoto.id, { locationValue: val })}
                                />
                            </div>
                        </div>

                        {/* Automatic / Manual rig box */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                {(['auto', 'manual'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => onUpdatePhoto(activePhoto.id, { rigTab: tab })}
                                        className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${activePhoto.rigTab === tab
                                                ? 'bg-white text-blue-600 border-b-2 border-blue-500 -mb-px'
                                                : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab === 'auto' ? 'Automatic' : 'Manual'}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 space-y-4">
                                {activePhoto.rigTab === 'auto' ? (
                                    <>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Extracted from photo
                                                {activePhoto.exifLoading && (
                                                    <span className="font-normal normal-case text-blue-500 ml-1">
                                                        (reading…)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {readonlyField('Camera', activePhoto.exifCameraModel ?? '')}
                                                {!isFixedLensCamera &&
                                                    readonlyField('Lens', activePhoto.exifLensModel ?? '')}
                                                {readonlyField(
                                                    'Date taken',
                                                    activePhoto.form.takenAt.replace('T', ' ')
                                                )}
                                                {readonlyField('ISO', activePhoto.form.iso)}
                                                {readonlyField('Focal length (mm)', activePhoto.form.focalLength)}
                                                {readonlyField('Aperture (f/)', activePhoto.form.aperture)}
                                                {readonlyField('Shutter speed', activePhoto.form.shutterSpeed)}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Camera rig
                                            </p>

                                            {(activePhoto.exifLoading || !rigsLoaded) && (
                                                <p className="text-xs text-gray-400 italic">Matching rig…</p>
                                            )}

                                            {showDisambiguation && (
                                                <div className="space-y-2">
                                                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                                        Multiple rigs match this camera and lens. Please select one:
                                                    </p>
                                                    {autoMatches.map(r => (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() =>
                                                                onUpdatePhoto(activePhoto.id, {
                                                                    selectedRigId: String(r.id),
                                                                })
                                                            }
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-800 truncate">
                                                                    {r.name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 truncate">
                                                                    {r.camera.brand.name} {r.camera.name}
                                                                    {r.lens ? ` · ${r.lens.name}` : ''}
                                                                    {r.housing
                                                                        ? ` · ${r.housing.manufacturer.name} ${r.housing.name}`
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {exifDone && rigsLoaded && autoMatchedRig && (
                                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                    <svg
                                                        className="w-4 h-4 text-green-500 shrink-0"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium text-green-800 truncate">
                                                            {autoMatchedRig.name}
                                                        </p>
                                                        <p className="text-[10px] text-green-600 truncate">
                                                            {autoMatchedRig.camera.brand.name}{' '}
                                                            {autoMatchedRig.camera.name}
                                                            {autoMatchedRig.lens
                                                                ? ` · ${autoMatchedRig.lens.name}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    {autoMatches.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onUpdatePhoto(activePhoto.id, { selectedRigId: '' })
                                                            }
                                                            className="text-[10px] text-blue-600 hover:underline shrink-0"
                                                        >
                                                            Change
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {showNoMatch && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <svg
                                                            className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                                            />
                                                        </svg>
                                                        <p className="text-xs text-amber-800">
                                                            {activePhoto.exifCheckResult?.cameraExists === false ? (
                                                                <>
                                                                    Camera &quot;{activePhoto.exifCameraModel}&quot; is
                                                                    not yet in the database — it needs to be added with
                                                                    its EXIF name set before rigs can be matched.
                                                                </>
                                                            ) : activePhoto.exifCheckResult?.lensExists === false ? (
                                                                <>
                                                                    Lens &quot;{activePhoto.exifLensModel}&quot; is not
                                                                    yet in the database — it needs to be added with its
                                                                    EXIF name set before rigs can be matched.
                                                                </>
                                                            ) : (
                                                                <>
                                                                    No saved rig matched
                                                                    {activePhoto.exifCameraModel
                                                                        ? ` camera "${activePhoto.exifCameraModel}"`
                                                                        : ''}
                                                                    {activePhoto.exifLensModel && !lensIsFixed
                                                                        ? ` with lens "${activePhoto.exifLensModel}"`
                                                                        : ''}
                                                                    .
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                    {activePhoto.exifCheckResult?.cameraExists !== false && (
                                                        <a
                                                            href={createRigUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                                                        >
                                                            Create a rig for this camera
                                                            <svg
                                                                className="w-3 h-3"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                                />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {showNoRigs && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <svg
                                                            className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                                            />
                                                        </svg>
                                                        <p className="text-xs text-amber-800">
                                                            You have no camera rigs set up yet.
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={createRigUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                                                    >
                                                        Create a rig on your profile
                                                        <svg
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                            />
                                                        </svg>
                                                    </a>
                                                </div>
                                            )}

                                            {exifDone &&
                                                rigsLoaded &&
                                                !autoMatchedRig &&
                                                !showNoMatch &&
                                                !showNoRigs &&
                                                !showDisambiguation && (
                                                    <p className="text-xs text-gray-400 italic">
                                                        {activePhoto.instagram
                                                            ? 'No EXIF data for Instagram photos — switch to Manual to pick a rig.'
                                                            : 'No camera data in EXIF — switch to Manual to pick a rig.'}
                                                    </p>
                                                )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Shot details
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {editableField('takenAt', 'Date taken', '', 'datetime-local')}
                                                {editableField('iso', 'ISO', 'e.g. 400', 'number')}
                                                {editableField('focalLength', 'Focal length (mm)', 'e.g. 24', 'number')}
                                                {editableField('aperture', 'Aperture (f/)', 'e.g. 8', 'number')}
                                                {editableField('shutterSpeed', 'Shutter speed', 'e.g. 1/200')}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                Camera rig (optional)
                                            </p>
                                            {userRigs.length === 0 ? (
                                                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                                    No rigs set up yet.{' '}
                                                    <a
                                                        href={`/users/${userId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Create one on your profile
                                                    </a>{' '}
                                                    to tag photos with your equipment.
                                                </p>
                                            ) : (
                                                <select
                                                    value={activePhoto.selectedRigId}
                                                    onChange={e =>
                                                        onUpdatePhoto(activePhoto.id, {
                                                            selectedRigId: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">None</option>
                                                    {userRigs.map(r => (
                                                        <option key={r.id} value={String(r.id)}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </>
                                )}
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
