'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { removeBackground, preload } from '@imgly/background-removal'
import { isHeicFile, convertHeicToAvif, type MultiFileProgress } from '@/lib/heicConvert'
import { HeicMultiProgressBar } from '@/components/HeicProgressBar'
import { getSlotPreviewUrl, type PhotoSlot } from '@/lib/photoUpload'

interface Props {
    value: PhotoSlot[]
    onChange: (slots: PhotoSlot[]) => void
    pasteListenerActive?: boolean
    label?: ReactNode
}

/** Crop box in percentage of the displayed image (0..100) */
interface CropBox {
    left: number
    top: number
    width: number
    height: number
}

const MIN_CROP_PCT = 2

export default function ProductPhotoUpload({ value, onChange, pasteListenerActive = false, label = 'Product photos' }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [heicProgress, setHeicProgress] = useState<MultiFileProgress | null>(null)
    const [editingIdx, setEditingIdx] = useState<number | null>(null)
    const [cropBox, setCropBox] = useState<CropBox>({ left: 0, top: 0, width: 100, height: 100 })
    const [rotation, setRotation] = useState(0)
    const [bgRemovalState, setBgRemovalState] = useState<{ status: 'idle' | 'loading-model' | 'processing' | 'done' | 'error'; progress?: { current: number; total: number }; error?: string }>({ status: 'idle' })
    const [modelReady, setModelReady] = useState(false)
    const [bgRemovedBlobUrl, setBgRemovedBlobUrl] = useState<string | null>(null)
    const [showBgRemoved, setShowBgRemoved] = useState(false)
    const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
    const [imageRect, setImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

    const cropContainerRef = useRef<HTMLDivElement>(null)
    const imageRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)
    const cropDragRef = useRef<{
        corner?: 'tl' | 'tr' | 'bl' | 'br'
        edge?: 'top' | 'bottom' | 'left' | 'right'
        body?: true
        startPointer: { x: number; y: number }
        startBox: CropBox
    } | null>(null)

    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const valueRef = useRef(value)
    valueRef.current = value

    // Preload background removal model with progress tracking
    useEffect(() => {
        let cancelled = false
        let lastProgress = 0
        async function init() {
            try {
                setBgRemovalState({ status: 'loading-model', progress: { current: 0, total: 100 } })
                await preload({
                    model: 'large' as any,
                    progress: (_key: string, current: number, total: number) => {
                        if (cancelled) return
                        // Clamp progress to avoid spurious values
                        const pct = total > 0 ? Math.min(99, Math.round((current / total) * 100)) : lastProgress
                        if (pct > lastProgress) lastProgress = pct
                        setBgRemovalState({ status: 'loading-model', progress: { current: pct, total: 100 } })
                    },
                })
                if (!cancelled) {
                    setModelReady(true)
                    setBgRemovalState({ status: 'idle' })
                }
            } catch {
                if (!cancelled) {
                    setModelReady(true) // Try on-demand load as fallback
                    setBgRemovalState({ status: 'idle' })
                }
            }
        }
        init()
        return () => { cancelled = true }
    }, [])

    const handlePasteEvent = useCallback((e: ClipboardEvent) => {
        const items = Array.from(e.clipboardData?.items ?? [])
        const imageItems: PhotoSlot[] = []
        for (const item of items) {
            if (!item.type.startsWith('image/')) continue
            const file = item.getAsFile()
            if (!file) continue
            const ext = item.type.split('/')[1] ?? 'png'
            const renamedFile = new File([file], 'paste-' + Date.now() + '.' + ext, { type: item.type })
            imageItems.push({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file: renamedFile, previewUrl: URL.createObjectURL(renamedFile) })
        }
        if (imageItems.length > 0) { e.preventDefault(); onChangeRef.current([...valueRef.current, ...imageItems]) }
    }, [])

    useEffect(() => {
        if (!pasteListenerActive) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [pasteListenerActive, handlePasteEvent])

    async function handleFilesAdd(files: FileList | null) {
        if (!files) return
        const allFiles = Array.from(files).filter(f => f.type.startsWith('image/') || isHeicFile(f))
        if (allFiles.length === 0) return
        const heicFiles = allFiles.filter(isHeicFile)
        let heicIdx = 0
        const items: PhotoSlot[] = []
        for (const file of allFiles) {
            let converted = file
            if (isHeicFile(file)) {
                converted = await convertHeicToAvif(file, stage => setHeicProgress({ current: heicIdx, total: heicFiles.length, stage }))
                heicIdx++
            }
            items.push({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file: converted, previewUrl: URL.createObjectURL(converted) })
        }
        setHeicProgress(null)
        onChangeRef.current([...valueRef.current, ...items])
    }

    function removePhoto(idx: number) {
        const item = value[idx]
        if (item?.kind === 'new') URL.revokeObjectURL(item.previewUrl)
        onChange(value.filter((_, i) => i !== idx))
        if (editingIdx === idx) closeEditor()
    }

    function openEditor(idx: number) {
        setEditingIdx(idx)
        setCropBox({ left: 0, top: 0, width: 100, height: 100 })
        setRotation(0)
        setBgRemovalState({ status: 'idle' })
        setBgRemovedBlobUrl(null)
        setShowBgRemoved(false)
        setImageNaturalSize(null)
        setImageRect(null)
        const src = getSlotPreviewUrl(value[idx])
        if (src) { const img = new Image(); img.onload = () => setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight }); img.src = src }
    }

    function closeEditor() {
        if (editingIdx !== null && bgRemovedBlobUrl) URL.revokeObjectURL(bgRemovedBlobUrl)
        setEditingIdx(null); setBgRemovedBlobUrl(null); setShowBgRemoved(false)
    }

    const onCropPointerDown = useCallback((corner: 'tl' | 'tr' | 'bl' | 'br' | null, edge: 'top' | 'bottom' | 'left' | 'right' | null, body: boolean, e: ReactPointerEvent) => {
        e.preventDefault(); e.stopPropagation()
        const drag = {
            corner: corner ?? undefined, edge: edge ?? undefined, body: body || undefined,
            startPointer: { x: e.clientX, y: e.clientY }, startBox: { ...cropBox },
        }
        cropDragRef.current = drag

        function onMove(ev: PointerEvent) {
            if (!cropDragRef.current) return
            const d = cropDragRef.current
            const imageW = imageRectRef.current?.width ?? 1
            const imageH = imageRectRef.current?.height ?? 1
            const dx = (ev.clientX - d.startPointer.x) / imageW * 100
            const dy = (ev.clientY - d.startPointer.y) / imageH * 100
            const box = { ...d.startBox }

            if (d.body) {
                box.left = clamp(d.startBox.left + dx, 0, 100 - d.startBox.width)
                box.top = clamp(d.startBox.top + dy, 0, 100 - d.startBox.height)
            } else if (d.corner) {
                if (d.corner === 'tl') {
                    box.left = clamp(d.startBox.left + dx, 0, d.startBox.left + d.startBox.width - MIN_CROP_PCT)
                    box.top = clamp(d.startBox.top + dy, 0, d.startBox.top + d.startBox.height - MIN_CROP_PCT)
                    box.width = d.startBox.left + d.startBox.width - box.left
                    box.height = d.startBox.top + d.startBox.height - box.top
                } else if (d.corner === 'tr') {
                    box.top = clamp(d.startBox.top + dy, 0, d.startBox.top + d.startBox.height - MIN_CROP_PCT)
                    box.width = clamp(d.startBox.width + dx, MIN_CROP_PCT, 100 - d.startBox.left)
                    box.height = d.startBox.top + d.startBox.height - box.top
                } else if (d.corner === 'bl') {
                    box.left = clamp(d.startBox.left + dx, 0, d.startBox.left + d.startBox.width - MIN_CROP_PCT)
                    box.width = d.startBox.left + d.startBox.width - box.left
                    box.height = clamp(d.startBox.height + dy, MIN_CROP_PCT, 100 - d.startBox.top)
                } else if (d.corner === 'br') {
                    box.width = clamp(d.startBox.width + dx, MIN_CROP_PCT, 100 - d.startBox.left)
                    box.height = clamp(d.startBox.height + dy, MIN_CROP_PCT, 100 - d.startBox.top)
                }
            } else if (d.edge) {
                if (d.edge === 'left') { box.left = clamp(d.startBox.left + dx, 0, d.startBox.left + d.startBox.width - MIN_CROP_PCT); box.width = d.startBox.left + d.startBox.width - box.left }
                else if (d.edge === 'right') { box.width = clamp(d.startBox.width + dx, MIN_CROP_PCT, 100 - d.startBox.left) }
                else if (d.edge === 'top') { box.top = clamp(d.startBox.top + dy, 0, d.startBox.top + d.startBox.height - MIN_CROP_PCT); box.height = d.startBox.top + d.startBox.height - box.top }
                else if (d.edge === 'bottom') { box.height = clamp(d.startBox.height + dy, MIN_CROP_PCT, 100 - d.startBox.top) }
            }
            setCropBox(box)
        }

        function onUp() {
            cropDragRef.current = null
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            document.removeEventListener('pointercancel', onUp)
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
        document.addEventListener('pointercancel', onUp)
    }, [cropBox])

    function resetCrop() {
        setCropBox({ left: 0, top: 0, width: 100, height: 100 }); setRotation(0)
        setBgRemovalState({ status: 'idle' }); setShowBgRemoved(false)
        if (bgRemovedBlobUrl) { URL.revokeObjectURL(bgRemovedBlobUrl); setBgRemovedBlobUrl(null) }
    }

    async function handleCropApply() {
        if (editingIdx === null || !imageNaturalSize) return
        const slot = value[editingIdx]
        const src = showBgRemoved && bgRemovedBlobUrl ? bgRemovedBlobUrl : getSlotPreviewUrl(slot)
        const originalMime = slot.kind === 'new' ? slot.file.type : ''
        // Map to canvas-supported output: PNG→PNG, JPEG→JPEG, WebP→WebP, others→WebP
        const { mime, ext } = canvasFormat(originalMime)
        const croppedBlob = await cropImageToBox(src, cropBox, rotation, imageNaturalSize, mime)
        if (!croppedBlob) return
        if (slot.kind === 'new') URL.revokeObjectURL(slot.previewUrl)
        const newFile = new File([croppedBlob], 'cropped-' + Date.now() + '.' + ext, { type: mime })
        const newSlot: PhotoSlot = { kind: 'new', id: Math.random().toString(36).slice(2), file: newFile, previewUrl: URL.createObjectURL(newFile) }
        const updated = [...value]; updated[editingIdx] = newSlot; onChange(updated); setEditingIdx(null)
    }

    async function handleRemoveBackground() {
        if (editingIdx === null) return
        const imageUrl = showBgRemoved && bgRemovedBlobUrl ? bgRemovedBlobUrl : getSlotPreviewUrl(value[editingIdx])
        setBgRemovalState({ status: 'processing' })
        try {
            const response = await fetch(imageUrl)
            let imageBlob = await response.blob()

            // Convert unsupported formats (AVIF, HEIC, HEIF) to WebP before processing
            const mime = imageBlob.type.toLowerCase()
            const unsupported = ['image/avif', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']
            if (unsupported.includes(mime) || mime === '') {
                imageBlob = await convertBlobToWebP(imageBlob)
            }

            // Use WebP output for non-PNG originals (better compression, supports transparency)
            const outputFormat = mime === 'image/png' ? 'image/png' as const : 'image/webp' as const

            let inferenceComplete = false
            const resultBlob = await removeBackground(imageBlob, {
                model: 'large' as any,
                output: { format: outputFormat },
                progress: (_key: string, current: number, total: number) => {
                    if (inferenceComplete) return
                    const pct = total > 0 ? Math.min(99, Math.round((current / total) * 100)) : 0
                    if (current >= total && total > 0) {
                        inferenceComplete = true
                        setBgRemovalState({ status: 'processing', progress: { current: 99, total: 100 } })
                    } else {
                        setBgRemovalState({ status: 'processing', progress: { current: pct, total: 100 } })
                    }
                },
            })
            if (bgRemovedBlobUrl) URL.revokeObjectURL(bgRemovedBlobUrl)
            const url = URL.createObjectURL(resultBlob); setBgRemovedBlobUrl(url); setShowBgRemoved(true); setBgRemovalState({ status: 'done' })
        } catch (err) { setBgRemovalState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to remove background' }) }
    }

    async function handleApplyBgRemoved() {
        if (editingIdx === null || !bgRemovedBlobUrl) return
        const response = await fetch(bgRemovedBlobUrl); const blob = await response.blob()
        const oldSlot = value[editingIdx]; if (oldSlot.kind === 'new') URL.revokeObjectURL(oldSlot.previewUrl)
        const ext = blob.type === 'image/png' ? 'png' : 'webp'
        const newFile = new File([blob], 'nobg-' + Date.now() + '.' + ext, { type: blob.type || 'image/webp' })
        const newSlot: PhotoSlot = { kind: 'new', id: Math.random().toString(36).slice(2), file: newFile, previewUrl: URL.createObjectURL(newFile) }
        const updated = [...value]; updated[editingIdx] = newSlot; onChange(updated); closeEditor()
    }

    useEffect(() => {
        if (!cropContainerRef.current || !imageNaturalSize || containerSize.width === 0) return
        const cw = containerSize.width; const ch = containerSize.height
        const iw = imageNaturalSize.width; const ih = imageNaturalSize.height
        const rad = (rotation * Math.PI) / 180
        const absCos = Math.abs(Math.cos(rad)); const absSin = Math.abs(Math.sin(rad))
        const rw = iw * absCos + ih * absSin; const rh = iw * absSin + ih * absCos
        const scale = Math.min(cw / rw, ch / rh)
        const dw = rw * scale; const dh = rh * scale
        setImageRect({ left: (cw - dw) / 2, top: (ch - dh) / 2, width: dw, height: dh })
        imageRectRef.current = { left: (cw - dw) / 2, top: (ch - dh) / 2, width: dw, height: dh }
    }, [imageNaturalSize, containerSize, rotation])

    useEffect(() => {
        const el = cropContainerRef.current; if (!el) return
        const observer = new ResizeObserver(entries => { const rect = entries[0]?.contentRect; if (rect) setContainerSize({ width: rect.width, height: rect.height }) })
        observer.observe(el)
        const rect = el.getBoundingClientRect(); setContainerSize({ width: rect.width, height: rect.height })
        return () => observer.disconnect()
    }, [editingIdx])

    const editImageUrl = editingIdx !== null ? (showBgRemoved && bgRemovedBlobUrl ? bgRemovedBlobUrl : getSlotPreviewUrl(value[editingIdx])) : null
    const isDragging = cropDragRef.current

    const cropPixel = imageRect ? {
        left: imageRect.left + (cropBox.left / 100) * imageRect.width,
        top: imageRect.top + (cropBox.top / 100) * imageRect.height,
        width: (cropBox.width / 100) * imageRect.width,
        height: (cropBox.height / 100) * imageRect.height,
    } : null

    type HandlePos = { left: number; top: number; cursor: string; key: string; corner?: 'tl' | 'tr' | 'bl' | 'br'; edge?: 'top' | 'bottom' | 'left' | 'right' }
    const handles: HandlePos[] = cropPixel ? [
        { key: 'corner-tl', left: cropPixel.left, top: cropPixel.top, cursor: 'nwse-resize', corner: 'tl' },
        { key: 'corner-tr', left: cropPixel.left + cropPixel.width, top: cropPixel.top, cursor: 'nesw-resize', corner: 'tr' },
        { key: 'corner-bl', left: cropPixel.left, top: cropPixel.top + cropPixel.height, cursor: 'nesw-resize', corner: 'bl' },
        { key: 'corner-br', left: cropPixel.left + cropPixel.width, top: cropPixel.top + cropPixel.height, cursor: 'nwse-resize', corner: 'br' },
        { key: 'edge-top', left: cropPixel.left + cropPixel.width / 2, top: cropPixel.top, cursor: 'ns-resize', edge: 'top' },
        { key: 'edge-bottom', left: cropPixel.left + cropPixel.width / 2, top: cropPixel.top + cropPixel.height, cursor: 'ns-resize', edge: 'bottom' },
        { key: 'edge-left', left: cropPixel.left, top: cropPixel.top + cropPixel.height / 2, cursor: 'ew-resize', edge: 'left' },
        { key: 'edge-right', left: cropPixel.left + cropPixel.width, top: cropPixel.top + cropPixel.height / 2, cursor: 'ew-resize', edge: 'right' },
    ] : []

    return (
        <div>
            {label !== null && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
            >
                <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm text-gray-500">Click, drag, or paste images here</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF · max 20 MB each</p>
                <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif,.avif" multiple className="hidden" onChange={e => handleFilesAdd(e.target.files)} />
            </div>
            <HeicMultiProgressBar progress={heicProgress} />
            {value.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {value.map((slot, idx) => (
                        <div key={slot.kind === 'new' ? slot.id : slot.path + idx} className={'relative group/photo aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ' + (editingIdx === idx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400')}>
                            <img src={getSlotPreviewUrl(slot)} alt={'Photo ' + (idx + 1)} className="w-full h-full object-cover" onClick={() => openEditor(idx)} />
                            {idx === 0 && <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-xs py-0.5 font-medium">Cover</span>}
                            <button type="button" onClick={e => { e.stopPropagation(); removePhoto(idx) }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity text-xs leading-none hover:bg-red-500">&times;</button>
                        </div>
                    ))}
                </div>
            )}
            {editingIdx !== null && editImageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => { if (e.target === e.currentTarget) closeEditor() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Edit photo</h3>
                            <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col">
                            <div ref={cropContainerRef} className="relative flex-1 min-h-75 bg-gray-900 overflow-hidden touch-none select-none">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <img src={editImageUrl} alt="Edit" className="max-w-full max-h-full object-contain" style={{ transform: 'rotate(' + rotation + 'deg)' }} draggable={false} />
                                </div>
                                {cropPixel && (<>
                                    <div className="absolute left-0 right-0 bg-black/55 pointer-events-none" style={{ top: 0, height: Math.max(0, cropPixel.top) }} />
                                    <div className="absolute left-0 right-0 bg-black/55 pointer-events-none" style={{ top: cropPixel.top + cropPixel.height, bottom: 0 }} />
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: 0, width: Math.max(0, cropPixel.left), top: cropPixel.top, height: cropPixel.height }} />
                                    <div className="absolute bg-black/55 pointer-events-none" style={{ left: cropPixel.left + cropPixel.width, right: 0, top: cropPixel.top, height: cropPixel.height }} />
                                    <div className="absolute border-2 border-white pointer-events-none" style={{ left: cropPixel.left, top: cropPixel.top, width: cropPixel.width, height: cropPixel.height }} />
                                    <div className="absolute pointer-events-none" style={{ left: cropPixel.left, top: cropPixel.top, width: cropPixel.width, height: cropPixel.height }}>
                                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" /><div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" /><div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                                    </div>
                                    {handles.map(h => {
                                        const active = isDragging?.corner === h.corner || isDragging?.edge === h.edge; const isCorner = !!h.corner; return (
                                            <div key={h.key} className="absolute z-20" style={{ left: h.left - (isCorner ? 16 : 16), top: h.top - (isCorner ? 16 : 2), width: isCorner ? 32 : 32, height: isCorner ? 32 : 4, cursor: h.cursor }} onPointerDown={e => onCropPointerDown(h.corner ?? null, h.edge ?? null, false, e)}>
                                                <div className={'absolute inset-1 rounded-full shadow-md transition-all ' + (isCorner ? 'border-2 border-white ' : '') + (active ? (isCorner ? 'bg-white/50 scale-110' : 'bg-white') : (isCorner ? 'bg-white/20' : 'bg-white/50'))} />
                                            </div>
                                        )
                                    })}
                                    {/* Body drag area — move the crop box */}
                                    <div
                                        className="absolute z-10 cursor-move"
                                        style={{ left: cropPixel.left, top: cropPixel.top, width: cropPixel.width, height: cropPixel.height }}
                                        onPointerDown={e => onCropPointerDown(null, null, true, e)}
                                    />
                                </>)}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 z-30">
                                    <button onClick={() => setRotation(r => ((r - 90) % 360 + 360) % 360)} className="text-white/80 hover:text-white transition-colors" title="Rotate left 90&deg;"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h1m0 0l3-3m-3 3l3 3m11 9v-4a2 2 0 00-2-2H5m0 0l3 3m-3-3l3-3" /></svg></button>
                                    <span className="text-white text-xs font-medium tabular-nums w-10 text-center">{((rotation % 360 + 360) % 360).toFixed(0)}&deg;</span>
                                    <button onClick={() => setRotation(r => (r + 90) % 360)} className="text-white/80 hover:text-white transition-colors" title="Rotate right 90&deg;"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-1m0 0l-3 3m3-3l-3-3M3 14v4a2 2 0 002 2h11m0 0l-3-3m3 3l-3 3" /></svg></button>
                                    {rotation !== 0 && <button onClick={() => setRotation(0)} className="text-white/50 hover:text-white transition-colors ml-1 border-l border-white/20 pl-2" title="Reset rotation"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                                </div>
                            </div>
                            <div className="px-6 py-2 bg-gray-50 border-t border-gray-100"><p className="text-[11px] text-gray-400 text-center">Drag corners to crop &middot; Drag inside to reposition &middot; Edges adjust one axis &middot; Rotate image to fit</p></div>
                            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={handleCropApply} className="flex-1 min-w-25 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Apply crop</button>
                                    <button onClick={handleRemoveBackground} disabled={bgRemovalState.status === 'processing' || bgRemovalState.status === 'loading-model'} className="flex-1 min-w-25 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-wait">{bgRemovalState.status === 'processing' ? 'Removing\u2026' : bgRemovalState.status === 'loading-model' ? 'Loading model\u2026' : 'Remove background'}</button>
                                    {bgRemovalState.status === 'done' && bgRemovedBlobUrl && <button onClick={handleApplyBgRemoved} className="flex-1 min-w-25 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">Save bg-removed</button>}
                                    <button onClick={resetCrop} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Reset all</button>
                                </div>
                                {(bgRemovalState.status === 'loading-model' || bgRemovalState.status === 'processing') && bgRemovalState.progress && (<div className="space-y-1.5"><div className="flex justify-between text-xs text-gray-500"><span>{bgRemovalState.status === 'loading-model' ? 'Loading AI model…' : bgRemovalState.progress.current >= 99 ? 'Finalizing…' : 'Removing background…'}</span><span>{bgRemovalState.progress.current}%</span></div><div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: bgRemovalState.progress.current + '%' }} /></div></div>)}
                                {(bgRemovalState.status === 'loading-model' || bgRemovalState.status === 'processing') && !bgRemovalState.progress && <p className="text-xs text-violet-600 animate-pulse">Processing&hellip; this may take a moment</p>}
                                {bgRemovalState.status === 'error' && <p className="text-xs text-red-600">{bgRemovalState.error}</p>}
                                {bgRemovalState.status === 'done' && bgRemovedBlobUrl && <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={showBgRemoved} onChange={e => setShowBgRemoved(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />Preview background-removed version</label>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)) }

async function cropImageToBox(src: string, box: CropBox, rotationDeg: number, naturalSize: { width: number; height: number }, format: string): Promise<Blob | null> {
    const image = await createImage(src)
    const iw = naturalSize.width; const ih = naturalSize.height
    const cx = Math.round(box.left / 100 * iw); const cy = Math.round(box.top / 100 * ih)
    const cw = Math.round(box.width / 100 * iw); const ch = Math.round(box.height / 100 * ih)
    if (cw <= 0 || ch <= 0) return null
    const quality = format === 'image/png' ? undefined : 0.92
    if (rotationDeg % 360 === 0) {
        const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, cx, cy, cw, ch, 0, 0, cw, ch)
        return new Promise(r => canvas.toBlob(r, format, quality))
    }
    const rad = (rotationDeg * Math.PI) / 180; const cos = Math.cos(rad); const sin = Math.sin(rad)
    const absCos = Math.abs(cos); const absSin = Math.abs(sin)
    const rw = Math.ceil(iw * absCos + ih * absSin); const rh = Math.ceil(iw * absSin + ih * absCos)
    const ox = (rw - iw) / 2; const oy = (rh - ih) / 2; const cix = iw / 2; const ciy = ih / 2
    function t(x: number, y: number): [number, number] { const dx = x - cix; const dy = y - ciy; return [cix + dx * cos - dy * sin + ox, ciy + dx * sin + dy * cos + oy] }
    const [tlx, tly] = t(cx, cy); const [trx, trY] = t(cx + cw, cy); const [blx, bly] = t(cx, cy + ch); const [brx, bry] = t(cx + cw, cy + ch)
    const minX = Math.floor(Math.min(tlx, trx, blx, brx)); const minY = Math.floor(Math.min(tly, trY, bly, bry))
    const maxX = Math.ceil(Math.max(tlx, trx, blx, brx)); const maxY = Math.ceil(Math.max(tly, trY, bly, bry))
    const outW = maxX - minX; const outH = maxY - minY
    const canvas = document.createElement('canvas'); canvas.width = outW; canvas.height = outH
    const ctx = canvas.getContext('2d')!; ctx.translate(-minX, -minY); ctx.translate(ox + cix, oy + ciy); ctx.rotate(rad); ctx.drawImage(image, -cix, -ciy)
    return new Promise(r => canvas.toBlob(r, format, quality))
}

function createImage(src: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = reject; img.src = src }) }

/** Convert an unsupported image blob (AVIF, HEIC, etc.) to WebP via canvas */
async function convertBlobToWebP(blob: Blob): Promise<Blob> {
    const image = await createImage(URL.createObjectURL(blob))
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0)
    URL.revokeObjectURL(image.src)
    return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/webp', 0.9))
}

/** Map an original MIME type to a canvas-supported output format */
function canvasFormat(originalMime: string): { mime: string; ext: string } {
    const m = originalMime.toLowerCase()
    if (m === 'image/png') return { mime: 'image/png', ext: 'png' }
    if (m === 'image/jpeg' || m === 'image/jpg') return { mime: 'image/jpeg', ext: 'jpg' }
    if (m === 'image/webp') return { mime: 'image/webp', ext: 'webp' }
    return { mime: 'image/webp', ext: 'webp' }
}
