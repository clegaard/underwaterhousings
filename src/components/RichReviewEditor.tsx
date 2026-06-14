'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import LinkExt from '@tiptap/extension-link'

// ─── Toolbar button ──────────────────────────────────────────────────────────

function ToolBtn({ active, onClick, children, title }: {
    active?: boolean
    onClick: () => void
    children: React.ReactNode
    title: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded text-sm transition-colors ${active
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            {children}
        </button>
    )
}

// ─── Gallery Photo Picker ────────────────────────────────────────────────────

function GalleryPhotoPicker({
    isOpen,
    onClose,
    onSelect,
    userId,
}: {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string, alt: string) => void
    userId?: number
}) {
    const [photos, setPhotos] = useState<Array<{ src: string; caption?: string }>>([])
    const [loading, setLoading] = useState(false)

    const loadPhotos = useCallback(async () => {
        if (!isOpen || photos.length > 0) return
        setLoading(true)
        try {
            const params = userId ? `?userId=${userId}` : ''
            const res = await fetch(`/api/gallery${params}`)
            const json = await res.json()
            if (json.success && Array.isArray(json.data)) {
                setPhotos(json.data.map((p: { src: string; caption?: string }) => ({
                    src: p.src,
                    caption: p.caption,
                })).slice(0, 20))
            }
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }, [isOpen, userId, photos.length])

    if (!isOpen) return null

    // Trigger load
    if (photos.length === 0 && !loading) loadPhotos()

    return (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-start justify-center p-4 pt-16" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
                    <h3 className="text-base font-semibold text-gray-800">Insert Gallery Photo</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <div className="p-4">
                    {loading ? (
                        <p className="text-sm text-gray-400 text-center py-8">Loading photos…</p>
                    ) : photos.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No photos found in your gallery.</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {photos.map((p, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => { onSelect(p.src, p.caption ?? ''); onClose() }}
                                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group relative"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={p.src}
                                        alt={p.caption ?? `Photo ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    {p.caption && (
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                            <p className="text-white text-[10px] truncate">{p.caption}</p>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
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
}

export default function RichReviewEditor({ content = '', onChange, placeholder = 'Start writing your review…', readOnly = false, userId }: Props) {
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
        ],
        content,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
            },
        },
    })

    const insertPhoto = useCallback((url: string, alt: string) => {
        editor?.chain().focus().setImage({ src: url, alt }).run()
    }, [editor])

    if (!editor) return null

    return (
        <div className={`border rounded-xl overflow-hidden ${readOnly ? 'border-gray-100' : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}`}>
            {/* Toolbar */}
            {!readOnly && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50/80 flex-wrap">
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold"
                    >
                        <strong>B</strong>
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic"
                    >
                        <em>I</em>
                    </ToolBtn>
                    <span className="w-px h-5 bg-gray-300 mx-1" />
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
                    <span className="w-px h-5 bg-gray-300 mx-1" />
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
                    <span className="w-px h-5 bg-gray-300 mx-1" />
                    <ToolBtn
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        active={editor.isActive('blockquote')}
                        title="Quote"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </ToolBtn>
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
                    <span className="w-px h-5 bg-gray-300 mx-1" />
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
                onSelect={insertPhoto}
                userId={userId}
            />
        </div>
    )
}

// ─── Helper to generate default review content ───────────────────────────────

export function generateDefaultContent(selectedComponents: {
    cameras: string[]
    lenses: string[]
    housings: string[]
    ports: string[]
}): string {
    const lines: string[] = []
    lines.push('<h2>Introduction</h2>')
    lines.push('<p></p>')

    if (selectedComponents.cameras.length > 0) {
        lines.push('<h2>Camera' + (selectedComponents.cameras.length > 1 ? 's' : '') + '</h2>')
        for (const c of selectedComponents.cameras) {
            lines.push(`<h3>${c}</h3>`)
            lines.push('<p></p>')
        }
    }

    if (selectedComponents.lenses.length > 0) {
        lines.push('<h2>Lens' + (selectedComponents.lenses.length > 1 ? 'es' : '') + '</h2>')
        for (const l of selectedComponents.lenses) {
            lines.push(`<h3>${l}</h3>`)
            lines.push('<p></p>')
        }
    }

    if (selectedComponents.housings.length > 0) {
        lines.push('<h2>Housing' + (selectedComponents.housings.length > 1 ? 's' : '') + '</h2>')
        for (const h of selectedComponents.housings) {
            lines.push(`<h3>${h}</h3>`)
            lines.push('<p></p>')
        }
    }

    if (selectedComponents.ports.length > 0) {
        lines.push('<h2>Port' + (selectedComponents.ports.length > 1 ? 's' : '') + '</h2>')
        for (const p of selectedComponents.ports) {
            lines.push(`<h3>${p}</h3>`)
            lines.push('<p></p>')
        }
    }

    return lines.join('\n')
}
