'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { isHeicFile, convertHeicToAvif, type MultiFileProgress } from '@/lib/heicConvert'
import { useUploadQueue } from '@/lib/UploadQueueContext'
import PhotoMetadataEditor, {
    type PendingPhoto,
    type UserRig,
    type UploadForm,
    EMPTY_FORM,
    computeAutoMatches,
} from './PhotoMetadataEditor'

// Re-export PendingPhoto so callers that import from this module still work
export type { PendingPhoto, UserRig, UploadForm }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShutterSpeed(exposureTime: number): string {
    if (exposureTime >= 1) return String(Math.round(exposureTime))
    const denom = Math.round(1 / exposureTime)
    return `1/${denom}`
}

function toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GalleryUploadButtonProps {
    /** When provided, the component acts as a controlled modal — the trigger button is hidden */
    controlledOpen?: boolean
    onControlledClose?: () => void
}

export default function GalleryUploadButton({ controlledOpen, onControlledClose }: GalleryUploadButtonProps = {}) {
    const { data: session } = useSession()
    const isLoggedIn = !!session?.user
    const { enqueue } = useUploadQueue()

    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen

    const [isDragging, setIsDragging] = useState(false)
    const [photos, setPhotos] = useState<PendingPhoto[]>([])
    const [userRigs, setUserRigs] = useState<UserRig[]>([])
    const [rigsLoaded, setRigsLoaded] = useState(false)
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [batchProgress, setBatchProgress] = useState<MultiFileProgress | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const addMoreInputRef = useRef<HTMLInputElement>(null)
    const previewUrlsRef = useRef<Map<string, string>>(new Map())
    // Stable ref so async callbacks always see the latest rigs
    const userRigsRef = useRef<UserRig[]>([])
    userRigsRef.current = userRigs

    // ── Load rigs when modal opens ──────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return
        const userId = session?.user?.id
        if (!userId) return
        setRigsLoaded(false)
        fetch(`/api/camera-rigs?userId=${userId}`)
            .then(r => r.json())
            .then(rigsJson => {
                if (!rigsJson?.success) return
                const { rigs, defaultRigId } = rigsJson.data
                setUserRigs(rigs)
                setPhotos(prev => prev.map(p => {
                    if (p.selectedRigId) return p
                    if (p.exifCameraModel) {
                        const matches = computeAutoMatches(p, (rigs as UserRig[]).filter(r => r.isActive))
                        if (matches.length === 1) return { ...p, selectedRigId: String(matches[0].id) }
                    }
                    if (!p.exifCameraModel && defaultRigId) {
                        const def = (rigs as UserRig[]).find((r: UserRig) => r.id === defaultRigId)
                        if (def) return { ...p, selectedRigId: String(def.id) }
                    }
                    return p
                }))
            })
            .catch(() => { })
            .finally(() => setRigsLoaded(true))
    }, [isOpen, session])

    // ── Cleanup all preview URLs on unmount ─────────────────────────────────
    useEffect(() => {
        const urls = previewUrlsRef.current
        return () => { urls.forEach(url => URL.revokeObjectURL(url)) }
    }, [])

    // ── Core state helpers ───────────────────────────────────────────────────
    const updatePhoto = useCallback((id: string, patch: Partial<PendingPhoto>) => {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    }, [])

    const removePhoto = useCallback((id: string) => {
        const url = previewUrlsRef.current.get(id)
        if (url) { URL.revokeObjectURL(url); previewUrlsRef.current.delete(id) }
        setPhotos(prev => prev.filter(p => p.id !== id))
    }, [])

    // ── EXIF extraction ──────────────────────────────────────────────────────
    const extractExif = useCallback(async (photoId: string, f: File) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, exifLoading: true } : p))
        try {
            const exifr = (await import('exifr')).default
            const [exif, gps] = await Promise.all([
                exifr.parse(f, {
                    pick: ['FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal', 'Model', 'LensModel'],
                }),
                exifr.gps(f).catch(() => null),
            ])
            const patch: Partial<PendingPhoto> = { exifLoading: false }
            if (exif) {
                const formUpdates: Partial<UploadForm> = {}
                if (exif.ISO != null) formUpdates.iso = String(exif.ISO)
                if (exif.FocalLength != null) formUpdates.focalLength = String(Math.round(exif.FocalLength))
                if (exif.FNumber != null) formUpdates.aperture = String(exif.FNumber)
                if (exif.ExposureTime != null) formUpdates.shutterSpeed = formatShutterSpeed(exif.ExposureTime)
                if (exif.DateTimeOriginal) formUpdates.takenAt = toDatetimeLocal(new Date(exif.DateTimeOriginal))
                if (exif.Model) patch.exifCameraModel = String(exif.Model).trim()
                if (exif.LensModel) patch.exifLensModel = String(exif.LensModel).trim()
                patch.form = { ...EMPTY_FORM, ...formUpdates }
                // Track which fields came from EXIF so they are locked read-only (Rule G1)
                patch.exifFields = Object.keys(formUpdates) as (keyof UploadForm)[]
            }
            if (gps?.latitude != null && gps?.longitude != null) {
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${gps.latitude}&lon=${gps.longitude}&format=json`,
                        { headers: { 'Accept-Language': 'en', 'User-Agent': 'UnderwaterHousings/1.0' } }
                    )
                    const data = res.ok ? await res.json() : null
                    const rawName: string = data?.display_name ?? ''
                    const parts = rawName.split(',').map((s: string) => s.trim())
                    const name = parts.length > 3 ? parts.slice(-3).join(', ') : rawName
                    patch.locationValue = { lat: gps.latitude, lng: gps.longitude, radius: 1000, name }
                } catch {
                    patch.locationValue = { lat: gps.latitude, lng: gps.longitude, radius: 1000, name: '' }
                }
            }
            const cameraModel = (patch.exifCameraModel as string | undefined) ?? null
            const lensModel = (patch.exifLensModel as string | undefined) ?? null
            if (cameraModel) {
                const tempSlot = { exifCameraModel: cameraModel, exifLensModel: lensModel }
                const matches = computeAutoMatches(tempSlot, userRigsRef.current.filter(r => r.isActive))
                if (matches.length === 1) patch.selectedRigId = String(matches[0].id)
            }
            setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...patch } : p))
        } catch {
            setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, exifLoading: false } : p))
        }
    }, [])

    // ── File processing (HEIC conversion + dimension detection) ─────────────
    const processFiles = useCallback(async (rawFiles: FileList | File[]) => {
        const allFiles = Array.from(rawFiles).filter(f => f.type.startsWith('image/') || isHeicFile(f))
        if (allFiles.length === 0) return

        const oversized = allFiles.filter(f => f.size > 20 * 1024 * 1024)
        if (oversized.length > 0) setGlobalError(`${oversized.length} file(s) exceed 20 MB and were skipped.`)
        const validFiles = allFiles.filter(f => f.size <= 20 * 1024 * 1024)
        if (validFiles.length === 0) return

        const heicFiles = validFiles.filter(isHeicFile)
        let heicIdx = 0
        const newPhotos: PendingPhoto[] = []

        for (const f of validFiles) {
            let processedFile = f
            if (isHeicFile(f)) {
                try {
                    processedFile = await convertHeicToAvif(f, stage =>
                        setBatchProgress({ current: heicIdx, total: heicFiles.length, stage })
                    )
                    heicIdx++
                } catch {
                    continue
                }
            }
            const id = Math.random().toString(36).slice(2)
            const preview = URL.createObjectURL(processedFile)
            previewUrlsRef.current.set(id, preview)
            const dims = await new Promise<{ width: number; height: number } | null>(resolve => {
                const img = new Image()
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
                img.onerror = () => resolve(null)
                img.src = preview
            })
            newPhotos.push({
                id,
                file: processedFile,
                preview,
                dimensions: dims,
                form: { ...EMPTY_FORM },
                locationValue: null,
                exifCameraModel: null,
                exifLensModel: null,
                exifLoading: false,
                selectedRigId: '',
                exifCheckResult: null,
            })
        }
        setBatchProgress(null)

        if (newPhotos.length === 0) return
        setPhotos(prev => [...prev, ...newPhotos])

        for (const p of newPhotos) {
            extractExif(p.id, p.file!)
        }
    }, [extractExif])

    const closeModal = useCallback(() => {
        if (isControlled) onControlledClose?.()
        else setInternalOpen(false)
        previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
        previewUrlsRef.current.clear()
        setPhotos([])
        setUserRigs([])
        setRigsLoaded(false)
        setGlobalError(null)
        setBatchProgress(null)
    }, [isControlled, onControlledClose])

    const handleSubmit = useCallback(() => {
        const readyPhotos = photos.filter(p => p.dimensions)
        if (readyPhotos.length === 0) return
        setGlobalError(null)
        for (const photo of readyPhotos) {
            const fd = new FormData()
            fd.append('file', photo.file!)
            fd.append('width', String(photo.dimensions!.width))
            fd.append('height', String(photo.dimensions!.height))
            if (photo.form.caption) fd.append('caption', photo.form.caption)
            if (photo.locationValue) {
                if (photo.locationValue.name) fd.append('location', photo.locationValue.name)
                fd.append('locationLat', String(photo.locationValue.lat))
                fd.append('locationLng', String(photo.locationValue.lng))
                fd.append('locationRadius', String(photo.locationValue.radius))
            }
            if (photo.form.takenAt) fd.append('takenAt', photo.form.takenAt)
            if (photo.form.iso) fd.append('iso', photo.form.iso)
            if (photo.form.focalLength) fd.append('focalLength', photo.form.focalLength)
            if (photo.form.aperture) fd.append('aperture', photo.form.aperture)
            if (photo.form.shutterSpeed) fd.append('shutterSpeed', photo.form.shutterSpeed)
            if (photo.selectedRigId) fd.append('rigId', photo.selectedRigId)
            enqueue(fd, photo.file!.name)
        }
        closeModal()
    }, [photos, enqueue, closeModal])

    const isSubmittable = photos.length > 0 && photos.every(p => p.dimensions !== null && !!p.selectedRigId)

    // ── Drop zone component ──────────────────────────────────────────────────
    const dropZone = (
        <div
            onDragEnter={() => setIsDragging(true)}
            onDragOver={e => e.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-16 px-8 text-center cursor-pointer transition-colors
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'}`}
        >
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-700 font-medium mb-1">Drag & drop photos here</p>
            <p className="text-gray-400 text-sm">or tap to browse — select multiple at once</p>
            <p className="text-gray-400 text-xs mt-2">JPG, PNG, WebP, HEIC, AVIF · max 20 MB each</p>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,.avif"
                multiple
                className="hidden"
                onChange={e => { processFiles(e.target.files ?? []); e.target.value = '' }}
            />
        </div>
    )

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Trigger button — only rendered in uncontrolled mode */}
            {!isControlled && (
                <div className="relative group">
                    <button
                        onClick={() => isLoggedIn && setInternalOpen(true)}
                        disabled={!isLoggedIn}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${isLoggedIn
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload photo
                    </button>
                    {!isLoggedIn && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Log in to upload photos
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) closeModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {photos.length > 1 ? `Upload ${photos.length} photos` : 'Upload photo'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Editor */}
                        <PhotoMetadataEditor
                            photos={photos}
                            onUpdatePhoto={updatePhoto}
                            onRemovePhoto={removePhoto}
                            userRigs={userRigs}
                            rigsLoaded={rigsLoaded}
                            userId={session?.user?.id}
                            onAddFiles={() => addMoreInputRef.current?.click()}
                            batchProgress={batchProgress}
                            onSubmit={handleSubmit}
                            onCancel={closeModal}
                            isSubmittable={isSubmittable}
                            globalError={globalError}
                            onClearGlobalError={() => setGlobalError(null)}
                            emptySlot={dropZone}
                        />

                        {/* Hidden "add more" input — triggered by the editor's Add button */}
                        <input
                            ref={addMoreInputRef}
                            type="file"
                            accept="image/*,.heic,.heif,.avif"
                            multiple
                            className="hidden"
                            onChange={e => { processFiles(e.target.files ?? []); e.target.value = '' }}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
