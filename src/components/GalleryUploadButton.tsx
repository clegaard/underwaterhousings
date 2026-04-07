'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Camera {
    id: number
    name: string
    brand: { name: string }
    exifId: string | null
}

interface Housing {
    id: number
    name: string
    manufacturer: { name: string }
}

interface Lens {
    id: number
    name: string
    exifId: string | null
}

interface Port {
    id: number
    name: string
}

interface UserRig {
    id: number
    name: string
    camera: { id: number; name: string; brand: { name: string }; exifId: string | null }
    lens: { id: number; name: string; exifId: string | null } | null
    housing: { id: number; name: string; manufacturer: { name: string } } | null
    port: { id: number; name: string } | null
}

interface Equipment {
    cameras: Camera[]
    housings: Housing[]
    lenses: Lens[]
    ports: Port[]
}

interface UploadForm {
    title: string
    description: string
    location: string
    takenAt: string
    focalLength: string
    aperture: string
    shutterSpeed: string
    cameraId: string
    lensId: string
    housingId: string
    portId: string
}

const EMPTY_FORM: UploadForm = {
    title: '',
    description: '',
    location: '',
    takenAt: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    cameraId: '',
    lensId: '',
    housingId: '',
    portId: '',
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
    const [equipment, setEquipment] = useState<Equipment>({ cameras: [], housings: [], lenses: [], ports: [] })
    const [userRigs, setUserRigs] = useState<UserRig[]>([])
    const [selectedRigId, setSelectedRigId] = useState('')
    const [exifCameraModel, setExifCameraModel] = useState<string | null>(null)
    const [exifLensModel, setExifLensModel] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exifLoading, setExifLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const previewUrlRef = useRef<string | null>(null)

    const applyRigToForm = useCallback((rig: UserRig) => {
        setForm(prev => ({
            ...prev,
            cameraId: String(rig.camera.id),
            lensId: rig.lens ? String(rig.lens.id) : '',
            housingId: rig.housing ? String(rig.housing.id) : '',
            portId: rig.port ? String(rig.port.id) : '',
        }))
    }, [])

    function handleRigChange(rigId: string) {
        setSelectedRigId(rigId)
        if (!rigId) return
        const rig = userRigs.find(r => String(r.id) === rigId)
        if (rig) applyRigToForm(rig)
    }

    useEffect(() => {
        if (!isOpen) return
        const userId = session?.user?.id
        const fetches: Promise<Response>[] = [fetch('/api/camera-rigs')]
        if (userId) fetches.push(fetch(`/api/camera-rigs?userId=${userId}`))
        Promise.all(fetches)
            .then(responses => Promise.all(responses.map(r => r.json())))
            .then(([equipJson, rigsJson]) => {
                setEquipment(equipJson.data ?? { cameras: [], housings: [], lenses: [], ports: [] })
                if (rigsJson?.success) {
                    const { rigs, defaultRigId } = rigsJson.data
                    setUserRigs(rigs)
                    if (defaultRigId) {
                        const def = rigs.find((r: UserRig) => r.id === defaultRigId)
                        if (def) {
                            setSelectedRigId(String(def.id))
                            applyRigToForm(def)
                        }
                    }
                }
            })
            .catch(() => { })
    }, [isOpen, session, applyRigToForm])

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        }
    }, [])

    // Auto-select rig when EXIF camera/lens matches a saved rig
    useEffect(() => {
        if (!exifCameraModel || userRigs.length === 0 || selectedRigId) return
        const matches = userRigs.filter(r => r.camera.exifId === exifCameraModel)
        if (matches.length === 0) return
        let best = matches[0]
        if (exifLensModel) {
            const withLens = matches.find(r => r.lens?.exifId === exifLensModel)
            if (withLens) best = withLens
        }
        setSelectedRigId(String(best.id))
        applyRigToForm(best)
    }, [exifCameraModel, exifLensModel, userRigs, selectedRigId, applyRigToForm])

    // Auto-select camera/lens from EXIF when no rig covers them
    useEffect(() => {
        if (!exifCameraModel && !exifLensModel) return
        setForm(prev => {
            const updates: Partial<UploadForm> = {}
            if (exifCameraModel && !prev.cameraId) {
                const match = equipment.cameras.find(c => c.exifId === exifCameraModel)
                if (match) updates.cameraId = String(match.id)
            }
            if (exifLensModel && !prev.lensId) {
                const match = equipment.lenses.find(l => l.exifId === exifLensModel)
                if (match) updates.lensId = String(match.id)
            }
            return Object.keys(updates).length ? { ...prev, ...updates } : prev
        })
    }, [equipment, exifCameraModel, exifLensModel])

    const extractExif = useCallback(async (f: File) => {
        setExifLoading(true)
        try {
            const exifr = (await import('exifr')).default
            const exif = await exifr.parse(f, {
                pick: ['FocalLength', 'FNumber', 'ExposureTime', 'DateTimeOriginal', 'Model', 'LensModel'],
            })
            if (!exif) return
            const updates: Partial<UploadForm> = {}
            if (exif.FocalLength != null) updates.focalLength = String(Math.round(exif.FocalLength))
            if (exif.FNumber != null) updates.aperture = String(exif.FNumber)
            if (exif.ExposureTime != null) updates.shutterSpeed = formatShutterSpeed(exif.ExposureTime)
            if (exif.DateTimeOriginal) updates.takenAt = toDatetimeLocal(new Date(exif.DateTimeOriginal))
            if (exif.Model) setExifCameraModel(String(exif.Model).trim())
            if (exif.LensModel) setExifLensModel(String(exif.LensModel).trim())
            setForm(prev => ({ ...prev, ...updates }))
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
            if (form.location) fd.append('location', form.location)
            if (form.takenAt) fd.append('takenAt', form.takenAt)
            if (form.focalLength) fd.append('focalLength', form.focalLength)
            if (form.aperture) fd.append('aperture', form.aperture)
            if (form.shutterSpeed) fd.append('shutterSpeed', form.shutterSpeed)
            if (form.cameraId) fd.append('cameraId', form.cameraId)
            if (form.lensId) fd.append('lensId', form.lensId)
            if (form.housingId) fd.append('housingId', form.housingId)
            if (form.portId) fd.append('portId', form.portId)

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
        setSelectedRigId('')
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current)
            previewUrlRef.current = null
        }
    }

    const field = (key: keyof UploadForm, label: string, placeholder?: string, type = 'text') => (
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
                                    <div className="relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
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
                                    {/* Details */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {field('title', 'Title', 'e.g. Nudibranch on coral')}
                                        {field('location', 'Location', 'e.g. Red Sea')}
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                value={form.description}
                                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Optional description"
                                                rows={2}
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                                            />
                                        </div>
                                        {field('takenAt', 'Date taken', '', 'datetime-local')}
                                    </div>

                                    {/* EXIF / Camera settings */}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camera settings {exifLoading && <span className="font-normal normal-case text-blue-500">(reading…)</span>}</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {field('focalLength', 'Focal length (mm)', 'e.g. 24')}
                                            {field('aperture', 'Aperture (f/)', 'e.g. 8')}
                                            {field('shutterSpeed', 'Shutter speed', 'e.g. 1/200')}
                                        </div>
                                    </div>

                                    {/* Equipment */}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Equipment (optional)</p>
                                        {/* Rig selector */}
                                        <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Camera rig</label>
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
                                                    to quickly pre-fill your equipment.
                                                </p>
                                            ) : (
                                                <select
                                                    value={selectedRigId}
                                                    onChange={e => handleRigChange(e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">Select a rig (optional)</option>
                                                    {userRigs.map(r => (
                                                        <option key={r.id} value={String(r.id)}>{r.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Camera</label>
                                                <select
                                                    value={form.cameraId}
                                                    onChange={e => setForm(prev => ({ ...prev, cameraId: e.target.value }))}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">None</option>
                                                    {equipment.cameras.map(c => (
                                                        <option key={c.id} value={String(c.id)}>{c.brand.name} {c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Housing</label>
                                                <select
                                                    value={form.housingId}
                                                    onChange={e => setForm(prev => ({ ...prev, housingId: e.target.value }))}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">None</option>
                                                    {equipment.housings.map(h => (
                                                        <option key={h.id} value={String(h.id)}>{h.manufacturer.name} {h.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Lens</label>
                                                <select
                                                    value={form.lensId}
                                                    onChange={e => setForm(prev => ({ ...prev, lensId: e.target.value }))}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">None</option>
                                                    {equipment.lenses.map(l => (
                                                        <option key={l.id} value={String(l.id)}>{l.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                                                <select
                                                    value={form.portId}
                                                    onChange={e => setForm(prev => ({ ...prev, portId: e.target.value }))}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                                >
                                                    <option value="">None</option>
                                                    {equipment.ports.map(p => (
                                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    <span className="flex-1">{error}</span>
                                    <button onClick={() => setError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors">
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
