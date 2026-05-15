'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { isHeicFile, convertHeicToAvif, type MultiFileProgress } from '@/lib/heicConvert'
import { HeicMultiProgressBar } from '@/components/HeicProgressBar'
import { getSlotPreviewUrl, type PhotoSlot } from '@/lib/photoUpload'

const RICH_DROP_ZONE_CONTENT = (
    <>
        <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-500">Click, drag, or paste images here</p>
        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF · max 20 MB each</p>
    </>
)

interface Props {
    value: PhotoSlot[]
    onChange: (slots: PhotoSlot[]) => void
    /** Set to true when the owning modal is open so paste events are captured */
    pasteListenerActive?: boolean
    /** Label shown above the drop zone. Pass null to suppress. */
    label?: ReactNode
    /**
     * 'simple' (default): plain text drop zone, flex-wrap thumbnails, always-visible remove button.
     * 'rich': SVG drop zone, grid-cols-4 thumbnails, hover-reveal remove button.
     */
    variant?: 'simple' | 'rich'
    /** When true (rich variant only) shows a "Cover" badge on the first thumbnail */
    showCoverLabel?: boolean
    /** Overrides the default drop zone interior content for the chosen variant */
    dropZoneContent?: ReactNode
    /** Overrides the default thumbnail container class */
    thumbnailsClassName?: string
}

export default function PhotoUploadField({
    value,
    onChange,
    pasteListenerActive = false,
    label = 'Product photos',
    variant = 'simple',
    showCoverLabel = false,
    dropZoneContent,
    thumbnailsClassName,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [heicProgress, setHeicProgress] = useState<MultiFileProgress | null>(null)
    const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

    // Stable refs so the paste callback never goes stale
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const valueRef = useRef(value)
    valueRef.current = value

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
                converted = await convertHeicToAvif(file, stage =>
                    setHeicProgress({ current: heicIdx, total: heicFiles.length, stage })
                )
                heicIdx++
            }
            items.push({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file: converted, previewUrl: URL.createObjectURL(converted) })
        }
        setHeicProgress(null)
        onChangeRef.current([...valueRef.current, ...items])
    }

    const handlePasteEvent = useCallback((e: ClipboardEvent) => {
        const items = Array.from(e.clipboardData?.items ?? [])
        const imageItems: PhotoSlot[] = []
        for (const item of items) {
            if (!item.type.startsWith('image/')) continue
            const file = item.getAsFile()
            if (!file) continue
            const ext = item.type.split('/')[1] ?? 'png'
            const renamedFile = new File([file], `paste-${Date.now()}.${ext}`, { type: item.type })
            imageItems.push({ kind: 'new' as const, id: Math.random().toString(36).slice(2), file: renamedFile, previewUrl: URL.createObjectURL(renamedFile) })
        }
        if (imageItems.length > 0) {
            e.preventDefault()
            onChangeRef.current([...valueRef.current, ...imageItems])
        }
    }, [])

    useEffect(() => {
        if (!pasteListenerActive) return
        document.addEventListener('paste', handlePasteEvent)
        return () => document.removeEventListener('paste', handlePasteEvent)
    }, [pasteListenerActive, handlePasteEvent])

    function removePhoto(idx: number) {
        const item = value[idx]
        if (item?.kind === 'new') URL.revokeObjectURL(item.previewUrl)
        onChange(value.filter((_, i) => i !== idx))
    }

    function handlePhotoDragStart(e: React.DragEvent, idx: number) {
        e.dataTransfer.effectAllowed = 'move'
        setDragPhotoIdx(idx)
    }

    function handlePhotoDragOver(e: React.DragEvent, idx: number) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragPhotoIdx === null || dragPhotoIdx === idx) return
        const arr = [...value]
        const [item] = arr.splice(dragPhotoIdx, 1)
        arr.splice(idx, 0, item)
        onChange(arr)
        setDragPhotoIdx(idx)
    }

    function handlePhotoDragEnd() { setDragPhotoIdx(null) }

    const isRich = variant === 'rich'
    const defaultThumbnailsClass = isRich ? 'grid grid-cols-4 gap-2 mb-4' : 'flex flex-wrap gap-2 mb-4'

    function getSlotClass(idx: number): string {
        const isActive = dragPhotoIdx === idx
        if (isRich) {
            return `relative group/photo aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${isActive ? 'opacity-40 border-blue-400 scale-95' : 'border-gray-200 hover:border-gray-400'}`
        }
        return `relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing ${isActive ? 'border-blue-500 opacity-50' : 'border-gray-200'}`
    }

    const removeButtonClass = isRich
        ? 'absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity text-xs leading-none'
        : 'absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600'

    return (
        <div>
            {label !== null && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                onDrop={e => { e.preventDefault(); handleFilesAdd(e.dataTransfer.files) }}
            >
                {dropZoneContent ?? (isRich ? RICH_DROP_ZONE_CONTENT : (
                    <p className="text-sm text-gray-500">Click, drag & drop, or paste images here</p>
                ))}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={e => handleFilesAdd(e.target.files)}
                />
            </div>
            <HeicMultiProgressBar progress={heicProgress} />
            {value.length > 0 && (
                <div className={thumbnailsClassName ?? defaultThumbnailsClass}>
                    {value.map((slot, idx) => (
                        <div
                            key={slot.kind === 'new' ? slot.id : slot.path + (isRich ? idx : '')}
                            draggable
                            onDragStart={e => handlePhotoDragStart(e, idx)}
                            onDragOver={e => handlePhotoDragOver(e, idx)}
                            onDragEnd={handlePhotoDragEnd}
                            className={getSlotClass(idx)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getSlotPreviewUrl(slot)} alt="" className="w-full h-full object-cover" />
                            {showCoverLabel && idx === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-xs py-0.5 font-medium">
                                    Cover
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className={removeButtonClass}
                            >×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
