'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LocationPicker, { type LocationValue } from './LocationPicker'

interface UserRig {
    id: number
    name: string
    isActive: boolean
    camera: { id: number; name: string; brand: { name: string }; exifId: string | null; interchangeableLens: boolean }
    lens: { id: number; name: string; exifId: string | null } | null
    housing: { id: number; name: string; manufacturer: { name: string } } | null
    port: { id: number; name: string } | null
}

interface UploadForm {
    title: string
    description: string
    takenAt: string
    iso: string
    focalLength: string
    aperture: string
    shutterSpeed: string
}

const EMPTY_FORM: UploadForm = {
    title: '',
    description: '',
    takenAt: '',
    iso: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
}

function formatShutterSpeed(exposureTime: number): string {
    if (exposureTime >= 1) return String(Math.round(exposureTime))
    const denom = Math.round(1 / exposureTime)
    return `1/${denom}`
}

function toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function GalleryUploadButton() {
    const { data: session } = useSession()
    const router = useRouter()
    const isLoggedIn = !!session?.user

    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
    const [form, setForm] = useState<UploadForm>(EMPTY_FORM)
    const [userRigs, setUserRigs] = useState<UserRig[]>([])
    const [selectedRigId, setSelectedRigId] = useState('')
    const [exifCameraModel, setExifCameraModel] = useState<string | null>(null)
    const [exifLensModel, setExifLensModel] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exifLoading, setExifLoading] = useState(false)
    const [rigTab, setRigTab] = useState<'auto' | 'manual'>('auto')
    const [rigsLoaded, setRigsLoaded] = useState(false)
    const [locationValue, setLocationValue] = useState<LocationValue | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const previewUrlRef = useRef<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        const userId = session?.user?.id
        if (!userId) return
        setRigsLoaded(false)
        fetch(`/api/camera-rigs?userId=${userId}`)
            .then(r => r.json())
            .then(rigsJson => {
                if (rigsJson?.success) {
                    const { rigs, defaultRigId } = rigsJson.data
                    setUserRigs(rigs)
                    if (defaultRigId) {
                        const def = rigs.find((r: UserRig) => r.id === defaultRigId)
                        if (def) setSelectedRigId(String(def.id))
                    }
                }
            })
            .catch(() => { })
            .finally(() => setRigsLoaded(true))
    }, [isOpen, session])

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        }
    }, [])

    // Auto-select only among active rigs with an exact camera+lens match.
    // Lens filter only applies when: rig has a lens configured AND camera is interchangeable AND EXIF has lens data.
    // If there are multiple matches the user must disambiguate, so selectedRigId stays empty.
    useEffect(() => {
        if (!exifCameraModel || userRigs.length === 0) return
        const activeRigs = userRigs.filter(r => r.isActive)
        const matches = activeRigs.filter(r => {
            if (r.camera.exifId !== exifCameraModel) return false
            if (exifLensModel && r.camera.interchangeableLens && r.lens !== null) {
                return r.lens.exifId === exifLensModel
            }
            return true
        })
        setSelectedRigId(matches.length === 1 ? String(matches[0].id) : '')
    }, [exifCameraModel, exifLensModel, userRigs])

    const extractExif = useCallback(async (f: File) => {
        setExifLoading(true)
        try {
            const exifr = (await import('exifr')).default
            const [exif, gps] = await Promise.all([
                exifr.parse(f, {
                    pick: ['FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal', 'Model', 'LensModel'],
                }),
                exifr.gps(f).catch(() => null),
            ])
            if (exif) {
                const updates: Partial<UploadForm> = {}
                if (exif.ISO != null) updates.iso = String(exif.ISO)
                if (exif.FocalLength != null) updates.focalLength = String(Math.round(exif.FocalLength))
                if (exif.FNumber != null) updates.aperture = String(exif.FNumber)
                if (exif.ExposureTime != null) updates.shutterSpeed = formatShutterSpeed(exif.ExposureTime)
                if (exif.DateTimeOriginal) updates.takenAt = toDatetimeLocal(new Date(exif.DateTimeOriginal))
                if (exif.Model) setExifCameraModel(String(exif.Model).trim())
                if (exif.LensModel) setExifLensModel(String(exif.LensModel).trim())
                setForm(prev => ({ ...prev, ...updates }))
            }
            // Pre-populate location from GPS EXIF when available (e.g. smartphone photos)
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
                    setLocationValue({ lat: gps.latitude, lng: gps.longitude, radius: 1000, name })
                } catch {
                    setLocationValue({ lat: gps.latitude, lng: gps.longitude, radius: 1000, name: '' })
                }
            }
        } catch {
            // EXIF extraction is non-critical
        } finally {
            setExifLoading(false)
        }
    }, [])

    const processFile = useCallback((f: File) => {
        if (!f.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }
        if (f.size > 20 * 1024 * 1024) {
            setError('File must be under 20MB.')
            return
        }
        setError(null)
        setFile(f)

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const url = URL.createObjectURL(f)
        previewUrlRef.current = url
        setPreview(url)

        const img = new Image()
        img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
        img.src = url

        extractExif(f)
    }, [extractExif])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) processFile(dropped)
    }, [processFile])

    const handleSubmit = async () => {
        if (!file || !dimensions) return
        setIsUploading(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('width', String(dimensions.width))
            fd.append('height', String(dimensions.height))
            if (form.title) fd.append('title', form.title)
            if (form.description) fd.append('description', form.description)
            if (locationValue) {
                if (locationValue.name) fd.append('location', locationValue.name)
                fd.append('locationLat', String(locationValue.lat))
                fd.append('locationLng', String(locationValue.lng))
                fd.append('locationRadius', String(locationValue.radius))
            }
            if (form.takenAt) fd.append('takenAt', form.takenAt)
            if (form.iso) fd.append('iso', form.iso)
            if (form.focalLength) fd.append('focalLength', form.focalLength)
            if (form.aperture) fd.append('aperture', form.aperture)
            if (form.shutterSpeed) fd.append('shutterSpeed', form.shutterSpeed)
            if (selectedRigId) fd.append('rigId', selectedRigId)

            const res = await fetch('/api/gallery/upload', { method: 'POST', body: fd })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`)

            closeModal()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setIsUploading(false)
        }
    }

    const closeModal = () => {
        setIsOpen(false)
        setFile(null)
        setPreview(null)
        setDimensions(null)
        setForm(EMPTY_FORM)
        setError(null)
        setExifCameraModel(null)
        setExifLensModel(null)
        setUserRigs([])
        setRigsLoaded(false)
        setSelectedRigId('')
        setRigTab('auto')
        setLocationValue(null)

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current)
            previewUrlRef.current = null
        }
    }

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
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
        </div>
    )

    const exifDone = !exifLoading && file !== null
    // Only active rigs are candidates for auto-matching
    const activeRigs = userRigs.filter(r => r.isActive)
    // Detect if the EXIF camera is a fixed-lens camera (exifId: string | null is on the camera property of the first rig that matches)
    const exifCameraRig = exifCameraModel ? activeRigs.find(r => r.camera.exifId === exifCameraModel) : undefined
    const isFixedLensCamera = exifCameraRig ? !exifCameraRig.camera.interchangeableLens : false
    // All active rigs that match EXIF: lens filter only when rig has a lens AND camera is interchangeable AND EXIF has lens data
    const autoMatches = exifCameraModel
        ? activeRigs.filter(r => {
            if (r.camera.exifId !== exifCameraModel) return false
            if (exifLensModel && r.camera.interchangeableLens && r.lens !== null) {
                return r.lens.exifId === exifLensModel
            }
            return true
        })
        : []
    // The rig the user has confirmed (either auto-selected when unique, or manually picked)
    const autoMatchedRig = selectedRigId
        ? autoMatches.find(r => String(r.id) === selectedRigId) ?? null
        : null
    const showDisambiguation = exifDone && rigsLoaded && autoMatches.length > 1 && !autoMatchedRig
    const showNoMatch = exifDone && rigsLoaded && exifCameraModel !== null && activeRigs.length > 0 && autoMatches.length === 0
    const showNoRigs = exifDone && rigsLoaded && activeRigs.length === 0

    const createRigUrl = (() => {
        const uid = session?.user?.id
        if (!uid) return '#'
        const params = new URLSearchParams()
        if (exifCameraModel) params.set('prefillCamera', exifCameraModel)
        if (exifLensModel) params.set('prefillLens', exifLensModel)
        return `/users/${uid}?${params.toString()}`
    })()

    return (
        <>
            {/* Upload trigger button */}
            <div className="relative group">
                <button
                    onClick={() => isLoggedIn && setIsOpen(true)}
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

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Upload photo</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            {/* Drop zone */}
                            {!file ? (
                                <div
                                    onDragEnter={() => setIsDragging(true)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl py-16 px-8 text-center cursor-pointer transition-colors
                                        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                                >
                                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-700 font-medium mb-1">Drag & drop your photo here</p>
                                    <p className="text-gray-400 text-sm">or tap to browse your gallery</p>
                                    <p className="text-gray-400 text-xs mt-2">JPG, PNG, WebP, HEIC · max 20MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                                    />
                                </div>
                            ) : (
                                <div className="flex gap-4 items-start">
                                    {/* Preview */}
                                    <div className="relative shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {dimensions ? `${dimensions.width} × ${dimensions.height}px · ` : ''}
                                            {(file.size / 1024 / 1024).toFixed(1)} MB
                                        </p>
                                        {exifLoading && (
                                            <p className="text-xs text-blue-500 mt-1">Reading EXIF data…</p>
                                        )}
                                        <button
                                            onClick={() => { setFile(null); setPreview(null); setDimensions(null) }}
                                            className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}

                            {file && (
                                <>
                                    {/* Title / location / description — always editable */}
                                    <div className="space-y-3">
                                        {editableField('title', 'Title', 'e.g. Nudibranch on coral')}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                            <LocationPicker value={locationValue} onChange={setLocationValue} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                value={form.description}
                                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Optional description"
                                                rows={2}
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Automatic / Manual tabbed box */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        {/* Tab bar */}
                                        <div className="flex border-b border-gray-200 bg-gray-50">
                                            {(['auto', 'manual'] as const).map(tab => (
                                                <button
                                                    key={tab}
                                                    type="button"
                                                    onClick={() => setRigTab(tab)}
                                                    className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${rigTab === tab
                                                        ? 'bg-white text-blue-600 border-b-2 border-blue-500 -mb-px'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    {tab === 'auto' ? 'Automatic' : 'Manual'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {rigTab === 'auto' ? (
                                                <>
                                                    {/* Read-only EXIF grid */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                            Extracted from photo
                                                            {exifLoading && <span className="font-normal normal-case text-blue-500 ml-1">(reading…)</span>}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {readonlyField('Camera', exifCameraModel ?? '')}
                                                            {!isFixedLensCamera && readonlyField('Lens', exifLensModel ?? '')}
                                                            {readonlyField('Date taken', form.takenAt.replace('T', ' '))}
                                                            {readonlyField('ISO Speed Rating', form.iso)}
                                                            {readonlyField('Focal length (mm)', form.focalLength)}
                                                            {readonlyField('Aperture (f/)', form.aperture)}
                                                            {readonlyField('Shutter speed', form.shutterSpeed)}
                                                        </div>
                                                    </div>

                                                    {/* Rig match status */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camera rig</p>

                                                        {(exifLoading || !rigsLoaded) && (
                                                            <p className="text-xs text-gray-400 italic">Matching rig…</p>
                                                        )}

                                                        {/* Multiple matches — user must pick one */}
                                                        {showDisambiguation && (
                                                            <div className="space-y-2">
                                                                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                                                    Multiple rigs match this camera and lens. Please select one:
                                                                </p>
                                                                {autoMatches.map(r => (
                                                                    <button
                                                                        key={r.id}
                                                                        type="button"
                                                                        onClick={() => setSelectedRigId(String(r.id))}
                                                                        className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                                                                            <p className="text-[10px] text-gray-500 truncate">
                                                                                {r.camera.brand.name} {r.camera.name}
                                                                                {r.lens ? ` · ${r.lens.name}` : ''}
                                                                                {r.housing ? ` · ${r.housing.manufacturer.name} ${r.housing.name}` : ''}
                                                                            </p>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {exifDone && rigsLoaded && autoMatchedRig && (
                                                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-medium text-green-800 truncate">{autoMatchedRig.name}</p>
                                                                    <p className="text-[10px] text-green-600 truncate">
                                                                        {autoMatchedRig.camera.brand.name} {autoMatchedRig.camera.name}
                                                                        {autoMatchedRig.lens ? ` · ${autoMatchedRig.lens.name}` : ''}
                                                                    </p>
                                                                </div>
                                                                {autoMatches.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedRigId('')}
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
                                                                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                                    </svg>
                                                                    <p className="text-xs text-amber-800">
                                                                        No saved rig matched{exifCameraModel ? ` camera "${exifCameraModel}"` : ''}
                                                                        {exifLensModel ? ` with lens "${exifLensModel}"` : ''}.
                                                                    </p>
                                                                </div>
                                                                <a
                                                                    href={createRigUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                                                                >
                                                                    Create a rig for this camera
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                    </svg>
                                                                </a>
                                                            </div>
                                                        )}

                                                        {showNoRigs && (
                                                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 space-y-1.5">
                                                                <div className="flex items-start gap-2">
                                                                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                                    </svg>
                                                                    <p className="text-xs text-amber-800">You have no camera rigs set up yet.</p>
                                                                </div>
                                                                <a
                                                                    href={createRigUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                                                                >
                                                                    Create a rig on your profile
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                    </svg>
                                                                </a>
                                                            </div>
                                                        )}

                                                        {exifDone && rigsLoaded && !autoMatchedRig && !showNoMatch && !showNoRigs && !showDisambiguation && (
                                                            <p className="text-xs text-gray-400 italic">No camera data in EXIF. Switch to Manual to pick a rig.</p>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Manual: editable shot details + rig picker */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shot details</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {editableField('takenAt', 'Date taken', '', 'datetime-local')}
                                                            {editableField('iso', 'ISO Speed Rating', 'e.g. 400', 'number')}
                                                            {editableField('focalLength', 'Focal length (mm)', 'e.g. 24', 'number')}
                                                            {editableField('aperture', 'Aperture (f/)', 'e.g. 8', 'number')}
                                                            {editableField('shutterSpeed', 'Shutter speed', 'e.g. 1/200')}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camera rig (optional)</p>
                                                        {userRigs.length === 0 ? (
                                                            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                                                No rigs set up yet.{' '}
                                                                <a
                                                                    href={`/users/${session?.user?.id}`}
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
                                                                value={selectedRigId}
                                                                onChange={e => setSelectedRigId(e.target.value)}
                                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                            >
                                                                <option value="">None</option>
                                                                {userRigs.map(r => (
                                                                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    <span className="flex-1">{error}</span>
                                    <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!file || !dimensions || isUploading}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isUploading && (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                )}
                                {isUploading ? 'Uploading…' : 'Upload photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
