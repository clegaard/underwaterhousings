'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RowsPhotoAlbum } from 'react-photo-album'
import type { Photo } from 'react-photo-album'
import 'react-photo-album/rows.css'
import UserAvatar from '@/components/UserAvatar'
import { withBase } from '@/lib/images'

export interface GalleryPhotoData extends Photo {
    caption?: string
    location?: string
    takenAt?: string
    rigLabel?: string
    cameraName?: string
    cameraSlug?: string
    lensName?: string
    lensSlug?: string
    housingName?: string
    housingSlug?: string
    portName?: string
    portSlug?: string
    iso?: number
    focalLength?: number
    shutterSpeed?: number
    aperture?: number
    photoId?: number
    userName?: string
    userId?: number
    userProfilePicture?: string
    likeCount?: number
    commentCount?: number
    likedByMe?: boolean
    rigId?: number
}

function formatShutterSpeed(speed: number): string {
    if (speed >= 1) return `${speed} s`
    const denominator = Math.round(1 / speed)
    return `1/${denominator} s`
}

// ─── Types for comment panel ─────────────────────────────────────────────────

interface CommentUser { id: number; name: string | null; profilePicture: string | null }
interface CommentReply { id: number; body: string; createdAt: string; user: CommentUser }
interface Comment { id: number; body: string; createdAt: string; user: CommentUser; replies: CommentReply[] }

// ─── Comment Panel ────────────────────────────────────────────────────────────

function CommentPanel({
    photo,
    currentUserId,
    likeCount,
    likedByMe,
    onLikeToggle,
    onCommentCountChange,
    focusInputSignal,
    commentsOnly,
}: {
    photo: GalleryPhotoData
    currentUserId?: number
    likeCount: number
    likedByMe: boolean
    onLikeToggle: () => void
    onCommentCountChange?: (delta: number) => void
    focusInputSignal?: number
    commentsOnly?: boolean
}) {
    const [comments, setComments] = useState<Comment[]>([])
    const [commentCount, setCommentCount] = useState(photo.commentCount ?? 0)
    const [likeAnimating, setLikeAnimating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [input, setInput] = useState('')
    const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const commentsEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!focusInputSignal) return
        const t = setTimeout(() => inputRef.current?.focus(), 80)
        return () => clearTimeout(t)
    }, [focusInputSignal])

    useEffect(() => {
        if (!photo.photoId) return
        setLoading(true)
        fetch(`/api/gallery/${photo.photoId}/comments`)
            .then(r => r.json())
            .then(d => setComments(d.comments ?? []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [photo.photoId])

    function startReply(comment: Comment | CommentReply) {
        setReplyingTo({ id: comment.id, name: comment.user.name ?? 'User' })
        setInput(`@${comment.user.name ?? 'User'} `)
        inputRef.current?.focus()
    }

    async function submitComment(e: React.FormEvent) {
        e.preventDefault()
        const text = input.trim()
        if (!text || !photo.photoId || submitting) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/gallery/${photo.photoId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: text, parentId: replyingTo ? replyingTo.id : null }),
            })
            if (!res.ok) return
            const { comment } = await res.json()
            if (replyingTo) {
                setComments(prev => prev.map(c =>
                    c.id === replyingTo.id
                        ? { ...c, replies: [...c.replies, comment] }
                        : c
                ))
            } else {
                setComments(prev => [...prev, { ...comment, replies: [] }])
            }
            setCommentCount(n => n + 1)
            onCommentCountChange?.(1)
            setInput('')
            setReplyingTo(null)
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        } finally {
            setSubmitting(false)
        }
    }

    async function deleteComment(commentId: number, parentId: number | null) {
        if (!photo.photoId) return
        const res = await fetch(`/api/gallery/${photo.photoId}/comments/${commentId}`, { method: 'DELETE' })
        if (!res.ok) return
        if (parentId !== null) {
            setComments(prev => prev.map(c =>
                c.id === parentId
                    ? { ...c, replies: c.replies.filter(r => r.id !== commentId) }
                    : c
            ))
        } else {
            setComments(prev => prev.filter(c => c.id !== commentId))
        }
        setCommentCount(n => Math.max(0, n - 1))
        onCommentCountChange?.(-1)
    }

    function formatDate(iso: string) {
        const d = new Date(iso)
        const now = Date.now()
        const diff = Math.floor((now - d.getTime()) / 1000)
        if (diff < 60) return `${diff}s`
        if (diff < 3600) return `${Math.floor(diff / 60)}m`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Author */}
            {!commentsOnly && photo.userId && photo.userName && (
                <div className="flex items-start gap-2.5 px-4 py-3 border-b border-gray-100 shrink-0">
                    <Link href={`/users/${photo.userId}`} onClick={e => e.stopPropagation()} className="shrink-0">
                        <UserAvatar picture={photo.userProfilePicture} name={photo.userName} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <Link href={`/users/${photo.userId}`} onClick={e => e.stopPropagation()} className="text-sm font-semibold text-gray-900 hover:underline truncate block">
                            {photo.userName}
                        </Link>
                        {photo.caption && <p className="text-xs text-gray-500 leading-snug line-clamp-3 mt-0.5">{photo.caption}</p>}
                        {photo.location && <p className="text-xs text-gray-500 truncate mt-0.5">📍 {photo.location}</p>}
                        {photo.rigLabel && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {photo.userId && photo.rigId ? (
                                    <Link href={`/users/${photo.userId}/camera-rigs/${photo.rigId}`} onClick={e => e.stopPropagation()} className="hover:text-blue-600 transition-colors">
                                        📷 {photo.rigLabel}
                                    </Link>
                                ) : `📷 ${photo.rigLabel}`}
                            </p>
                        )}
                        {(photo.iso || photo.focalLength || photo.aperture || photo.shutterSpeed) && (
                            <p className="text-xs text-gray-400 flex gap-2 mt-0.5">
                                {photo.iso && <span title="ISO Speed Rating">ISO {photo.iso}</span>}
                                {photo.focalLength && <span title="Focal Length">{photo.focalLength}mm</span>}
                                {photo.aperture && <span title="Aperture"><i>f</i>/{photo.aperture}</span>}
                                {photo.shutterSpeed && <span title="Shutter Speed">{formatShutterSpeed(photo.shutterSpeed)}</span>}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
                {loading && <p className="text-xs text-gray-400">Loading comments…</p>}

                {!loading && comments.map(comment => (
                    <div key={comment.id} className="space-y-2">
                        {/* Top-level comment */}
                        <div className="flex gap-2.5 group/comment">
                            <Link href={`/users/${comment.user.id}`} onClick={e => e.stopPropagation()} className="shrink-0 mt-0.5">
                                <UserAvatar picture={comment.user.profilePicture ? withBase(comment.user.profilePicture) : null} name={comment.user.name ?? 'User'} size="xs" />
                            </Link>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-snug">
                                    <Link href={`/users/${comment.user.id}`} onClick={e => e.stopPropagation()} className="font-semibold mr-1 hover:underline">{comment.user.name ?? 'User'}</Link>
                                    {comment.body}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[11px] text-gray-400">{formatDate(comment.createdAt)}</span>
                                    {currentUserId && currentUserId !== comment.user.id && (
                                        <button type="button" onClick={() => startReply(comment)} className="text-[11px] text-gray-500 font-semibold hover:text-gray-700">
                                            Reply
                                        </button>
                                    )}
                                    {currentUserId === comment.user.id && (
                                        <button type="button" onClick={() => deleteComment(comment.id, null)} className="text-[11px] text-red-400 hover:text-red-600 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Replies */}
                        {comment.replies.map(reply => (
                            <div key={reply.id} className="flex gap-2.5 ml-8 group/reply">
                                <Link href={`/users/${reply.user.id}`} onClick={e => e.stopPropagation()} className="shrink-0 mt-0.5">
                                    <UserAvatar picture={reply.user.profilePicture ? withBase(reply.user.profilePicture) : null} name={reply.user.name ?? 'User'} size="xs" />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 leading-snug">
                                        <Link href={`/users/${reply.user.id}`} onClick={e => e.stopPropagation()} className="font-semibold mr-1 hover:underline">{reply.user.name ?? 'User'}</Link>
                                        {reply.body}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[11px] text-gray-400">{formatDate(reply.createdAt)}</span>
                                        {currentUserId && currentUserId !== reply.user.id && (
                                            <button type="button" onClick={() => startReply(reply)} className="text-[11px] text-gray-500 font-semibold hover:text-gray-700">
                                                Reply
                                            </button>
                                        )}
                                        {currentUserId === reply.user.id && (
                                            <button type="button" onClick={() => deleteComment(reply.id, comment.id)} className="text-[11px] text-red-400 hover:text-red-600 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={commentsEndRef} />
            </div>

            {/* Action bar */}
            <div className="border-t border-gray-100 shrink-0">
                {/* Like + comment counts */}
                {!commentsOnly && <div className="flex items-center gap-4 px-4 pt-3 pb-1">
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation()
                            if (!likedByMe) {
                                setLikeAnimating(false)
                                // force re-trigger if double-clicking
                                requestAnimationFrame(() => setLikeAnimating(true))
                                setTimeout(() => setLikeAnimating(false), 450)
                            }
                            onLikeToggle()
                        }}
                        disabled={!currentUserId}
                        aria-label={likedByMe ? 'Unlike' : 'Like'}
                        className={`flex items-center gap-1.5 transition-colors ${currentUserId ? 'cursor-pointer' : 'cursor-default'} ${likedByMe ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className={`w-6 h-6 ${likeAnimating ? 'animate-like-pop' : ''}`}
                            fill={likedByMe ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); inputRef.current?.focus() }}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Add comment"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                </div>}
                {!commentsOnly && <div className="px-4 pb-1 flex gap-4">
                    <p className="text-sm font-semibold text-gray-900">{likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}</p>
                    <p className="text-sm text-gray-500">{commentCount.toLocaleString()} {commentCount === 1 ? 'comment' : 'comments'}</p>
                </div>}

                {/* Comment input */}
                {currentUserId ? (
                    <form onSubmit={submitComment} className="flex items-center gap-2 px-4 py-2 border-t border-gray-100">
                        {replyingTo && (
                            <span className="text-xs text-blue-600 font-medium whitespace-nowrap">
                                ↩ {replyingTo.name}
                                <button type="button" onClick={() => { setReplyingTo(null); setInput('') }} className="ml-1 text-gray-400 hover:text-gray-600">✕</button>
                            </span>
                        )}
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Add a comment…"
                            className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent min-w-0"
                            maxLength={1000}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || submitting}
                            className="text-sm font-semibold text-blue-500 disabled:opacity-40 hover:text-blue-700 transition-colors"
                        >
                            Post
                        </button>
                    </form>
                ) : (
                    <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                        <Link href="/auth/login" className="text-blue-500 hover:underline">Log in</Link> to like and comment.
                    </p>
                )}
            </div>
        </div>
    )
}



// ─── Grid types ───────────────────────────────────────────────────────────────

interface GalleryGridProps {
    photos: GalleryPhotoData[]
    selectionMode?: boolean
    selectedIds?: Set<number>
    currentUserId?: number
    onPhotoClick?: (photoId: number, index: number, shiftKey: boolean) => void
    onExitSelection?: () => void
}

interface PhotoLiveState { count: number; liked: boolean; commentCount: number }

interface GalleryPhotoTileProps {
    photo: GalleryPhotoData
    index: number
    selectionMode: boolean
    selectedIds?: Set<number>
    currentUserId?: number
    onPhotoClick?: (photoId: number, index: number, shiftKey: boolean) => void
    onOpenLightbox: (index: number) => void
    liveState?: PhotoLiveState
    onLikeToggle?: () => void
    onOpenWithComment?: () => void
}

function GalleryPhotoTile({ photo, index, selectionMode, selectedIds, currentUserId, onPhotoClick, onOpenLightbox, liveState, onLikeToggle, onOpenWithComment }: GalleryPhotoTileProps) {
    const liveLikeCount = liveState?.count ?? photo.likeCount ?? 0
    const liveCommentCount = liveState?.commentCount ?? photo.commentCount ?? 0
    const likedByMe = liveState?.liked ?? photo.likedByMe ?? false
    const [loaded, setLoaded] = useState(false)

    return (
        <div
            className={`relative group overflow-hidden ${selectionMode && photo.userId !== currentUserId ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            onClick={(e) => {
                if (selectionMode) {
                    if (photo.photoId != null && photo.userId === currentUserId) {
                        onPhotoClick?.(photo.photoId, index, e.shiftKey)
                    }
                } else {
                    onOpenLightbox(index)
                }
            }}
        >
            {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <Image
                src={photo.src}
                alt={photo.caption ?? 'Gallery photo'}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                className={`object-cover transition-[opacity,transform] duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                priority={index < 4}
                loading={index < 4 ? 'eager' : 'lazy'}
                onLoad={() => setLoaded(true)}
            />

            {/* Selection mode overlays */}
            {selectionMode && (
                <>
                    {photo.userId !== currentUserId && (
                        <div className="absolute inset-0 bg-white/50 pointer-events-none" />
                    )}
                    {photo.photoId != null && selectedIds?.has(photo.photoId) && (
                        <div className="absolute inset-0 bg-blue-500/25 pointer-events-none" />
                    )}
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm transition-colors
                        ${photo.userId !== currentUserId
                            ? 'border-gray-300 bg-white/30 opacity-40'
                            : photo.photoId != null && selectedIds?.has(photo.photoId)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-white bg-black/40'
                        }`}
                    >
                        {photo.photoId != null && selectedIds?.has(photo.photoId) && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </>
            )}

            {/* Hover overlay — always visible on touch devices, hover-only on pointer devices */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute bottom-2 right-2 flex items-center gap-2.5 pointer-events-auto">
                    {/* Like button */}
                    {currentUserId && onLikeToggle ? (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onLikeToggle() }}
                            aria-label={likedByMe ? 'Unlike' : 'Like'}
                            className={`flex items-center gap-1 text-sm drop-shadow transition-colors ${likedByMe ? 'text-red-400' : 'text-white/80 hover:text-red-300'}`}
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill={likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{liveLikeCount}</span>
                        </button>
                    ) : (
                        <span className="flex items-center gap-1 text-white/80 text-sm drop-shadow">
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{liveLikeCount}</span>
                        </span>
                    )}
                    {/* Comment count — click to open lightbox and focus comment box */}
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onOpenWithComment ? onOpenWithComment() : onOpenLightbox(index) }}
                        aria-label="View comments"
                        className="flex items-center gap-1 text-white/80 text-sm drop-shadow hover:text-white transition-colors"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{liveCommentCount}</span>
                    </button>
                    {/* User badge */}
                    {photo.userId && photo.userName && (
                        <Link
                            href={`/users/${photo.userId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 group/user"
                        >
                            <UserAvatar picture={photo.userProfilePicture} name={photo.userName} size="sm" className="ring-1 ring-white/60 drop-shadow" />
                            <span className="text-white/80 text-sm group-hover/user:text-white transition-colors drop-shadow">{photo.userName}</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}


export default function GalleryGrid({ photos, selectionMode = false, selectedIds, currentUserId, onPhotoClick, onExitSelection }: GalleryGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [lightboxLoaded, setLightboxLoaded] = useState(false)
    const [commentFocusSignal, setCommentFocusSignal] = useState(0)
    const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false)
    const [sheetDragOffset, setSheetDragOffset] = useState(0)
    const [isDraggingSheet, setIsDraggingSheet] = useState(false)
    const sheetTouchStartY = useRef(0)
    const sheetTouchCurrentY = useRef(0)

    // Per-photo live state — keyed by photoId, initialised from props
    const [photoState, setPhotoState] = useState<Record<number, PhotoLiveState>>(() => {
        const init: Record<number, PhotoLiveState> = {}
        photos.forEach(p => {
            if (p.photoId != null) {
                init[p.photoId] = {
                    count: p.likeCount ?? 0,
                    liked: p.likedByMe ?? false,
                    commentCount: p.commentCount ?? 0,
                }
            }
        })
        return init
    })

    async function toggleLike(photoId: number) {
        if (!currentUserId) return
        const res = await fetch(`/api/gallery/${photoId}/like`, { method: 'POST' })
        if (!res.ok) return
        const { liked, likeCount } = await res.json()
        setPhotoState(prev => ({ ...prev, [photoId]: { ...prev[photoId], count: likeCount, liked } }))
    }

    function handleCommentCountChange(photoId: number, delta: number) {
        setPhotoState(prev => ({
            ...prev,
            [photoId]: { ...prev[photoId], commentCount: Math.max(0, (prev[photoId]?.commentCount ?? 0) + delta) },
        }))
    }

    // Reset loaded state and comment sheet whenever the displayed image changes
    useEffect(() => {
        setLightboxLoaded(false)
        setIsCommentSheetOpen(false)
        setSheetDragOffset(0)
    }, [lightboxIndex])

    function handleSheetTouchStart(e: React.TouchEvent) {
        sheetTouchStartY.current = e.touches[0].clientY
        sheetTouchCurrentY.current = e.touches[0].clientY
        setIsDraggingSheet(true)
    }

    function handleSheetTouchMove(e: React.TouchEvent) {
        const delta = e.touches[0].clientY - sheetTouchStartY.current
        sheetTouchCurrentY.current = e.touches[0].clientY
        setSheetDragOffset(Math.max(0, delta))
    }

    function handleSheetTouchEnd() {
        setIsDraggingSheet(false)
        const delta = sheetTouchCurrentY.current - sheetTouchStartY.current
        if (delta > 80) {
            // Collapse height to 0 (large offset makes calc(62dvh - X) go to 0), then unmount
            setSheetDragOffset(window.innerHeight)
            setTimeout(() => {
                setIsCommentSheetOpen(false)
                setSheetDragOffset(0)
            }, 300)
        } else {
            setSheetDragOffset(0)
        }
    }

    const closeLightbox = useCallback(() => { setLightboxIndex(null); setIsCommentSheetOpen(false) }, [])

    const goNext = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))
        setIsCommentSheetOpen(false)
    }, [photos.length])

    const goPrev = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
        setIsCommentSheetOpen(false)
    }, [photos.length])

    useEffect(() => {
        if (lightboxIndex === null) return
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') closeLightbox()
            else if (e.key === 'ArrowRight') goNext()
            else if (e.key === 'ArrowLeft') goPrev()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [lightboxIndex, closeLightbox, goNext, goPrev])

    useEffect(() => {
        if (!selectionMode) return
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onExitSelection?.()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [selectionMode, onExitSelection])

    if (photos.length === 0) {
        return (
            <div className="text-center py-24 text-gray-400">
                <p className="text-2xl mb-2">No photos yet</p>
                <p className="text-sm">Photos will appear here once they are added to the gallery.</p>
            </div>
        )
    }

    return (
        <>
            <RowsPhotoAlbum<GalleryPhotoData>
                photos={photos}
                targetRowHeight={300}
                rowConstraints={{ minPhotos: 1, maxPhotos: 5 }}
                breakpoints={[600, 900, 1200]}
                defaultContainerWidth={1200}
                render={{
                    image: (props, { photo, index }) => (
                        <GalleryPhotoTile
                            photo={photo}
                            index={index}
                            selectionMode={selectionMode}
                            selectedIds={selectedIds}
                            currentUserId={currentUserId}
                            onPhotoClick={onPhotoClick}
                            onOpenLightbox={setLightboxIndex}
                            liveState={photo.photoId != null ? photoState[photo.photoId] : undefined}
                            onLikeToggle={photo.photoId != null ? () => toggleLike(photo.photoId!) : undefined}
                            onOpenWithComment={() => { setLightboxIndex(index); setCommentFocusSignal(s => s + 1); setIsCommentSheetOpen(true) }}
                        />
                    ),
                }}
            />

            {/* Lightbox */}
            {lightboxIndex !== null && (() => {
                const photo = photos[lightboxIndex]
                const photoId = photo.photoId
                const stored = photoId != null ? photoState[photoId] : undefined
                const ls = {
                    count: stored?.count ?? photo.likeCount ?? 0,
                    liked: stored?.liked ?? photo.likedByMe ?? false,
                    commentCount: stored?.commentCount ?? photo.commentCount ?? 0,
                }
                return (
                    <div className="fixed inset-0 z-50">

                        {/* ── Mobile portrait layout ── */}
                        <div className="flex flex-col bg-black md:hidden overflow-hidden" style={{ height: '100dvh' }}>

                            {/* Image — always flex-1: fills all space not taken by the bottom panel */}
                            <div className="flex-1 relative bg-black min-h-0">
                                {/* Back button + counter overlaid on image */}
                                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 pt-2.5">
                                    <button
                                        onClick={closeLightbox}
                                        className="p-1.5 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
                                        aria-label="Close"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-white/70 text-xs bg-black/30 px-2 py-0.5 rounded-full">{lightboxIndex + 1} / {photos.length}</span>
                                    <div className="w-8" />
                                </div>

                                {!lightboxLoaded && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
                                <Image
                                    src={photo.src}
                                    alt={photo.caption ?? 'Gallery photo'}
                                    fill
                                    sizes="100vw"
                                    className={`object-contain transition-opacity duration-300 ${lightboxLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    priority
                                    onLoad={() => setLightboxLoaded(true)}
                                />
                                <button className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10" onClick={goPrev} aria-label="Previous photo">‹</button>
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10" onClick={goNext} aria-label="Next photo">›</button>
                            </div>

                            {/* Info strip — shrink-0 (auto height), shown when sheet is closed */}
                            {!isCommentSheetOpen && (
                                <div className="shrink-0 bg-white flex flex-col overflow-y-auto max-h-[40vh]">
                                    {/* Author + metadata */}
                                    {photo.userId && photo.userName && (
                                        <div className="flex items-start gap-2.5 px-4 py-3 border-b border-gray-100 shrink-0">
                                            <Link href={`/users/${photo.userId}`} onClick={closeLightbox} className="shrink-0">
                                                <UserAvatar picture={photo.userProfilePicture} name={photo.userName} size="sm" />
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <Link href={`/users/${photo.userId}`} onClick={closeLightbox} className="text-sm font-semibold text-gray-900 hover:underline truncate block">
                                                    {photo.userName}
                                                </Link>
                                                {photo.caption && <p className="text-xs text-gray-500 leading-snug line-clamp-3 mt-0.5">{photo.caption}</p>}
                                                {photo.location && <p className="text-xs text-gray-500 truncate mt-0.5">📍 {photo.location}</p>}
                                                {photo.rigLabel && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {photo.userId && photo.rigId ? (
                                                            <Link href={`/users/${photo.userId}/camera-rigs/${photo.rigId}`} onClick={closeLightbox} className="hover:text-blue-600 transition-colors">
                                                                📷 {photo.rigLabel}
                                                            </Link>
                                                        ) : `📷 ${photo.rigLabel}`}
                                                    </p>
                                                )}
                                                {(photo.iso || photo.focalLength || photo.aperture || photo.shutterSpeed) && (
                                                    <p className="text-xs text-gray-400 flex gap-2 mt-0.5">
                                                        {photo.iso && <span title="ISO Speed Rating">ISO {photo.iso}</span>}
                                                        {photo.focalLength && <span title="Focal Length">{photo.focalLength}mm</span>}
                                                        {photo.aperture && <span title="Aperture"><i>f</i>/{photo.aperture}</span>}
                                                        {photo.shutterSpeed && <span title="Shutter Speed">{formatShutterSpeed(photo.shutterSpeed)}</span>}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-4 px-4 pt-3 pb-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => photoId != null && toggleLike(photoId)}
                                            disabled={!currentUserId}
                                            aria-label={ls.liked ? 'Unlike' : 'Like'}
                                            className={`transition-colors ${currentUserId ? 'cursor-pointer' : 'cursor-default'} ${ls.liked ? 'text-red-500' : 'text-gray-500'}`}
                                        >
                                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={ls.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCommentSheetOpen(true); setSheetDragOffset(0) }}
                                            aria-label="Open comments"
                                            className="text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Counts */}
                                    <div className="px-4 pb-3 flex gap-4 shrink-0">
                                        <p className="text-sm font-semibold text-gray-900">{ls.count.toLocaleString()} {ls.count === 1 ? 'like' : 'likes'}</p>
                                        <button type="button" onClick={() => { setIsCommentSheetOpen(true); setSheetDragOffset(0) }} className="text-sm text-gray-500">
                                            {ls.commentCount.toLocaleString()} {ls.commentCount === 1 ? 'comment' : 'comments'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Comment sheet — shrink-0 with fixed height; image above fills remaining space */}
                            {isCommentSheetOpen && (
                                <div
                                    className="shrink-0 bg-white flex flex-col rounded-t-2xl shadow-2xl overflow-hidden"
                                    style={{
                                        height: `max(0px, calc(62dvh - ${sheetDragOffset}px))`,
                                        transition: isDraggingSheet ? 'none' : 'height 300ms ease-out',
                                    }}
                                >
                                    {/* Drag handle — touch target for swipe-to-dismiss */}
                                    <div
                                        className="flex flex-col items-center pt-2.5 pb-1.5 shrink-0 select-none"
                                        onTouchStart={handleSheetTouchStart}
                                        onTouchMove={handleSheetTouchMove}
                                        onTouchEnd={handleSheetTouchEnd}
                                    >
                                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                                        <p className="text-xs font-semibold text-gray-500 mt-1.5 tracking-wide uppercase">Comments</p>
                                    </div>
                                    <div className="h-px bg-gray-100 shrink-0" />
                                    {photoId != null ? (
                                        <CommentPanel
                                            photo={photo}
                                            currentUserId={currentUserId}
                                            likeCount={ls.count}
                                            likedByMe={ls.liked}
                                            onLikeToggle={() => toggleLike(photoId)}
                                            onCommentCountChange={(delta) => handleCommentCountChange(photoId, delta)}
                                            focusInputSignal={commentFocusSignal}
                                            commentsOnly
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Desktop layout (side-by-side, unchanged) ──────────── */}
                        <div className="hidden md:flex items-center justify-center bg-black/90 p-4 h-full" onClick={closeLightbox}>
                            <div
                                className="flex w-full max-w-6xl rounded-xl overflow-hidden shadow-2xl bg-black"
                                style={{ maxHeight: '90vh', height: '90vh' }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Left: image */}
                                <div className="flex-1 relative bg-black min-w-0">
                                    {!lightboxLoaded && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
                                    <Image
                                        src={photo.src}
                                        alt={photo.caption ?? 'Gallery photo'}
                                        fill
                                        sizes="(max-width: 1200px) 70vw, 900px"
                                        className={`object-contain transition-opacity duration-300 ${lightboxLoaded ? 'opacity-100' : 'opacity-0'}`}
                                        priority
                                        onLoad={() => setLightboxLoaded(true)}
                                    />
                                    <button className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors" onClick={goPrev} aria-label="Previous photo">‹</button>
                                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors" onClick={goNext} aria-label="Next photo">›</button>
                                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-xs">{lightboxIndex + 1} / {photos.length}</span>
                                </div>
                                {/* Right: comment panel */}
                                <div className="w-80 md:w-96 shrink-0 bg-white flex flex-col overflow-hidden">
                                    {photoId != null ? (
                                        <CommentPanel
                                            photo={photo}
                                            currentUserId={currentUserId}
                                            likeCount={ls.count}
                                            likedByMe={ls.liked}
                                            onLikeToggle={() => toggleLike(photoId)}
                                            onCommentCountChange={(delta) => handleCommentCountChange(photoId, delta)}
                                            focusInputSignal={commentFocusSignal}
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No data</div>
                                    )}
                                </div>
                            </div>
                            {/* Close button */}
                            <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors" onClick={closeLightbox} aria-label="Close">✕</button>
                        </div>

                    </div>
                )
            })()}
        </>
    )
}
