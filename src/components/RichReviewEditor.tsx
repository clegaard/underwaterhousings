'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import LinkExt from '@tiptap/extension-link'
import UnderlineExt from '@tiptap/extension-underline'

// ─── Toolbar button ──────────────────────────────────────────────────────────

function ToolBtn({ active, onClick, children, title, disabled }: {
    active?: boolean
    onClick: () => void
    children: React.ReactNode
    title: string
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`p-1.5 rounded text-sm transition-colors disabled:opacity-30 disabled:cursor-default ${active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
        >
            {children}
        </button>
    )
}

function ToolSeparator() {
    return <span className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
}

// ─── Gallery Photo Picker ────────────────────────────────────────────────────

interface GalleryPhoto {
    id: number
    src: string
    caption?: string
}

function GalleryPhotoPicker({
    isOpen,
    onClose,
    onSelect,
    userId,
    componentFilters,
}: {
    isOpen: boolean
    onClose: () => void
    onSelect: (photos: Array<{ url: string; alt: string }>) => void
    userId?: number
    componentFilters?: {
        cameraId?: number
        lensId?: number
        housingId?: number
        portId?: number
        cameraSystemId?: number
    }
}) {
    const [photos, setPhotos] = useState<GalleryPhoto[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!isOpen || loadedRef.current) return

        let cancelled = false
        setLoading(true)

        async function fetchPhotos() {
            try {
                const params = new URLSearchParams()
                if (userId) params.set('userId', String(userId))
                if (componentFilters?.cameraSystemId) {
                    params.set('cameraSystemId', String(componentFilters.cameraSystemId))
                } else {
                    if (componentFilters?.cameraId) params.set('cameraId', String(componentFilters.cameraId))
                    if (componentFilters?.lensId) params.set('lensId', String(componentFilters.lensId))
                    if (componentFilters?.housingId) params.set('housingId', String(componentFilters.housingId))
                    if (componentFilters?.portId) params.set('portId', String(componentFilters.portId))
                }
                const qs = params.toString()
                const res = await fetch(`/api/gallery${qs ? `?${qs}` : ''}`)
                const json = await res.json()
                if (!cancelled && Array.isArray(json.photos)) {
                    setPhotos(json.photos)
                    loadedRef.current = true
                }
            } catch { /* ignore */ }
            finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchPhotos()
        return () => { cancelled = true }
    }, [isOpen, userId])

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            loadedRef.current = false
            setPhotos([])
            setSelectedIds(new Set())
        }
    }, [isOpen])

    function togglePhoto(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    function handleInsert() {
        if (selectedIds.size === 0) return
        const selected = photos
            .filter(p => selectedIds.has(p.id))
            .map(p => ({ url: p.src, alt: p.caption ?? '' }))
        onSelect(selected)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] bg-black/40 dark:bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        Insert Gallery Photos
                    </h3>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">
                        ×
                    </button>
                </div>

                {/* Selection hint */}
                {photos.length > 0 && !loading && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-5 py-2 border-b border-gray-100 dark:border-gray-700">
                        Select one or more photos to insert into your review.
                    </p>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        </div>
                    ) : photos.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-16">
                            No photos found in your gallery for this setup.
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {photos.map(p => {
                                const isSel = selectedIds.has(p.id)
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePhoto(p.id)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${isSel
                                            ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                                            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={p.src}
                                            alt={p.caption ?? `Photo ${p.id}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                        {/* Selection checkmark */}
                                        <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow transition-colors ${isSel
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-white/70 bg-black/30 group-hover:border-white'
                                            }`}>
                                            {isSel && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        {/* Caption overlay */}
                                        {p.caption && (
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white text-[10px] truncate">{p.caption}</p>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedIds.size > 0
                            ? `${selectedIds.size} ${selectedIds.size === 1 ? 'photo' : 'photos'} selected`
                            : 'No photos selected'}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleInsert}
                            disabled={selectedIds.size === 0}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Insert {selectedIds.size > 0 ? selectedIds.size : ''} {selectedIds.size === 1 ? 'photo' : 'photos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Editor Component ───────────────────────────────────────────────────

interface Props {
    content?: string
    onChange?: (html: string) => void
    placeholder?: string
    readOnly?: boolean
    userId?: number
    /** Filters for gallery photo picker */
    componentFilters?: {
        cameraId?: number
        lensId?: number
        housingId?: number
        portId?: number
        cameraSystemId?: number
    }
}

export default function RichReviewEditor({ content = '', onChange, placeholder = 'Start writing your review…', readOnly = false, userId, componentFilters }: Props) {
    const [photoPickerOpen, setPhotoPickerOpen] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            ImageExt.configure({
                inline: false,
                allowBase64: false,
            }),
            Placeholder.configure({ placeholder }),
            LinkExt.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-600 underline' },
            }),
            UnderlineExt,
        ],
        content,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
            },
        },
    })

    const insertPhotos = useCallback((photos: Array<{ url: string; alt: string }>) => {
        if (!editor) return
        const chain = editor.chain().focus()
        for (let i = 0; i < photos.length; i++) {
            chain.setImage({ src: photos[i].url, alt: photos[i].alt })
            if (i < photos.length - 1) {
                chain.createParagraphNear()
            }
        }
        chain.run()
    }, [editor])

    if (!editor) return null

    return (
        <div className={`border rounded-xl overflow-hidden ${readOnly ? 'border-gray-100 dark:border-gray-800' : 'border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 dark:focus-within:border-blue-400'}`}>
            {/* Toolbar */}
            {!readOnly && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex-wrap">
                    {/* Undo / Redo */}
                    <ToolBtn
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                        </svg>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
                        </svg>
                    </ToolBtn>
                    <ToolSeparator />

                    {/* Text formatting */}
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold (⌘+B)"
                    >
                        <strong>B</strong>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic (⌘+I)"
                    >
                        <em>I</em>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline (⌘+U)"
                    >
                        <span className="underline">U</span>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        title="Strikethrough"
                    >
                        <span className="line-through">S</span>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        active={editor.isActive('code')}
                        title="Inline code"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </ToolBtn>
                    <ToolSeparator />

                    {/* Paragraph / Headings */}
                    <ToolBtn
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        active={editor.isActive('paragraph')}
                        title="Paragraph"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        title="Heading 1"
                    >
                        H1
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        title="Heading 2"
                    >
                        H2
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}
                        title="Heading 3"
                    >
                        H3
                    </ToolBtn>
                    <ToolSeparator />

                    {/* Lists */}
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bullet list"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered list"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14M7 12h14M7 4h14M3 20h.01M3 12h.01M3 4h.01" />
                        </svg>
                    </ToolBtn>
                    <ToolSeparator />

                    {/* Block elements */}
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        title="Blockquote"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        active={editor.isActive('codeBlock')}
                        title="Code block"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-4-4m4 4l4-4" />
                        </svg>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal rule"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                    </ToolBtn>
                    <ToolSeparator />

                    {/* Link */}
                    <ToolBtn
                        onClick={() => {
                            const url = window.prompt('Link URL:')
                            if (url) editor.chain().focus().setLink({ href: url }).run()
                        }}
                        active={editor.isActive('link')}
                        title="Add link"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </ToolBtn>

                    {/* Insert photo */}
                    <ToolBtn
                        onClick={() => setPhotoPickerOpen(true)}
                        title="Insert photo from gallery"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </ToolBtn>
                </div>
            )}

            {/* Editor content */}
            <EditorContent editor={editor} />

            {/* Gallery photo picker modal */}
            <GalleryPhotoPicker
                isOpen={photoPickerOpen}
                onClose={() => setPhotoPickerOpen(false)}
                onSelect={insertPhotos}
                userId={userId}
                componentFilters={componentFilters}
            />
        </div>
    )
}
