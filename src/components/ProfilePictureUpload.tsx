'use client'

import { useRef, useState, useEffect } from 'react'
import { withBase } from '@/lib/images'
import UserAvatar from '@/components/UserAvatar'

// Canvas size for the crop preview shown in the modal (CSS px = canvas px on non-retina)
const CANVAS_PX = 320
// Output resolution of the exported JPEG avatar
const OUTPUT_PX = 400

interface Props {
    userId: number
    isOwnProfile: boolean
    /** Raw storage-relative path, e.g. /users/1-1234567890.jpg */
    currentPicture: string | null
    displayName: string
}

export default function ProfilePictureUpload({
    isOwnProfile,
    currentPicture,
    displayName,
}: Props) {
    const [open, setOpen] = useState(false)
    const [stage, setStage] = useState<'pick' | 'crop'>('pick')
    const [imgSrc, setImgSrc] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState(false)
    const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [picturePath, setPicturePath] = useState(currentPicture)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgElRef = useRef<HTMLImageElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Draw crop preview whenever image / zoom / offset change ────────────
    useEffect(() => {
        if (stage !== 'crop') return
        const img = imgElRef.current
        const canvas = canvasRef.current
        if (!img || !canvas) return
        const ctx = canvas.getContext('2d')!
        const W = CANVAS_PX

        const baseScale = Math.max(W / img.naturalWidth, W / img.naturalHeight)
        const scale = baseScale * zoom
        const iw = img.naturalWidth * scale
        const ih = img.naturalHeight * scale

        ctx.clearRect(0, 0, W, W)

        // Image
        ctx.drawImage(img, (W - iw) / 2 + offset.x, (W - ih) / 2 + offset.y, iw, ih)

        // Dark overlay with a circular cut-out (even-odd fill rule)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, W, W)
        ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2, true) // true = counter-clockwise → hole
        ctx.clip('evenodd')
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, W, W)
        ctx.restore()

        // Circle border
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
    }, [stage, imgSrc, zoom, offset])

    // ── Non-passive wheel listener so we can preventDefault ────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || stage !== 'crop') return
        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)))
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
    }, [stage])

    // ── File selection ──────────────────────────────────────────────────────
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        const img = new window.Image()
        img.onload = () => {
            imgElRef.current = img
            setImgSrc(url)
            setZoom(1)
            setOffset({ x: 0, y: 0 })
            setStage('crop')
        }
        img.src = url
    }

    // ── Drag to pan ─────────────────────────────────────────────────────────
    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
        setDragging(true)
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!dragging) return
        setOffset({
            x: dragRef.current.ox + (e.clientX - dragRef.current.x),
            y: dragRef.current.oy + (e.clientY - dragRef.current.y),
        })
    }

    function handlePointerUp() {
        setDragging(false)
    }

    // ── Export cropped JPEG and upload ──────────────────────────────────────
    async function handleSave() {
        const img = imgElRef.current
        if (!img) return
        setUploading(true)
        setError(null)
        try {
            const out = document.createElement('canvas')
            out.width = OUTPUT_PX
            out.height = OUTPUT_PX
            const ctx = out.getContext('2d')!
            const S = OUTPUT_PX
            const W = CANVAS_PX

            const baseScale = Math.max(W / img.naturalWidth, W / img.naturalHeight)
            const scale = baseScale * zoom * (S / W)
            const iw = img.naturalWidth * scale
            const ih = img.naturalHeight * scale
            const ox = offset.x * (S / W)
            const oy = offset.y * (S / W)

            // Clip to circle then draw
            ctx.beginPath()
            ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, (S - iw) / 2 + ox, (S - ih) / 2 + oy, iw, ih)

            const blob = await new Promise<Blob>((res, rej) =>
                out.toBlob(b => (b ? res(b) : rej(new Error('Canvas export failed'))), 'image/jpeg', 0.92)
            )

            const fd = new FormData()
            fd.append('file', blob, 'avatar.jpg')
            const resp = await fetch('/api/users/avatar', { method: 'POST', body: fd })
            const data = await resp.json()
            if (!resp.ok) throw new Error(data.error ?? 'Upload failed')

            setPicturePath(data.path)
            window.dispatchEvent(new CustomEvent('avatarUpdated'))
            close()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    // ── Modal open / close ──────────────────────────────────────────────────
    function openModal() {
        setStage('pick')
        setError(null)
        setOpen(true)
    }

    function goBackToPick() {
        if (imgSrc) { URL.revokeObjectURL(imgSrc); setImgSrc(null) }
        imgElRef.current = null
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setStage('pick')
        // Reset input so the same file can be re-chosen
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function close() {
        goBackToPick()
        setOpen(false)
    }

    const avatarUrl = picturePath ? withBase(picturePath) : null

    return (
        <>
            {/* ── Avatar badge ──────────────────────────────────────────── */}
            <div
                className={`relative w-20 h-20 flex-shrink-0${isOwnProfile ? ' group cursor-pointer' : ''}`}
                onClick={isOwnProfile ? openModal : undefined}
                title={isOwnProfile ? 'Change profile photo' : undefined}
            >
                <UserAvatar
                    picture={avatarUrl}
                    name={displayName}
                    size="lg"
                    className="ring-4 ring-white shadow-md"
                />

                {/* Camera-icon overlay (own profile only) */}
                {isOwnProfile && (
                    <div className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <svg className="w-7 h-7 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M3 9.75A2.25 2.25 0 015.25 7.5h.378a1.5 1.5 0 001.342-.83l.316-.632A1.5 1.5 0 018.628 5.25h6.744a1.5 1.5 0 011.342.83l.316.632A1.5 1.5 0 0018.372 7.5h.378A2.25 2.25 0 0121 9.75v8.25A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18V9.75z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M12 15.75a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* ── Modal ─────────────────────────────────────────────────── */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={e => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Profile photo</h2>
                            <button
                                onClick={close}
                                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Pick stage */}
                        {stage === 'pick' && (
                            <div className="p-6">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl py-12 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 10l-4-4m0 0L8 10m4-4v12" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">Choose a photo</span>
                                    <span className="text-xs text-gray-400">JPG, PNG, WebP · up to 5 MB</span>
                                </button>
                            </div>
                        )}

                        {/* Crop stage */}
                        {stage === 'crop' && (
                            <>
                                <div className="flex flex-col items-center px-6 py-5 gap-4">
                                    <p className="text-xs text-gray-400 self-start">
                                        Drag to reposition · scroll or use the slider to zoom
                                    </p>

                                    <canvas
                                        ref={canvasRef}
                                        width={CANVAS_PX}
                                        height={CANVAS_PX}
                                        className="rounded-full select-none ring-1 ring-gray-200"
                                        style={{
                                            width: CANVAS_PX,
                                            height: CANVAS_PX,
                                            cursor: dragging ? 'grabbing' : 'grab',
                                            touchAction: 'none',
                                        }}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                    />

                                    {/* Zoom slider */}
                                    <div className="flex items-center gap-3 w-full px-1">
                                        {/* Small magnifying glass */}
                                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="4"
                                            step="0.01"
                                            value={zoom}
                                            onChange={e => setZoom(parseFloat(e.target.value))}
                                            className="flex-1 accent-blue-600"
                                        />
                                        {/* Large magnifying glass */}
                                        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    {error && (
                                        <p className="text-sm text-red-500 self-start">{error}</p>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                                    <button
                                        onClick={goBackToPick}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Change photo
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={uploading}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {uploading ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
