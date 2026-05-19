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
    allowFullResDownload?: boolean
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

    async function submitComment(e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) {
        e?.preventDefault()
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

                {/* Comment input — intentionally NOT a <form> so iOS Safari does not
                    show the "Previous / Next field" navigation toolbar. Submission is
                    handled via Enter key and the Post button instead. */}
                {currentUserId ? (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-gray-100">
                        {replyingTo && (
                            <span className="text-xs text-blue-600 font-medium whitespace-nowrap shrink-0">
                                ↩ {replyingTo.name}
                                <button type="button" onClick={() => { setReplyingTo(null); setInput('') }} className="ml-1 text-gray-400 hover:text-gray-600">✕</button>
                            </span>
                        )}
                        <div className="flex-1 flex items-center bg-gray-100 dark:bg-white/10 rounded-full px-4 py-3 min-w-0">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submitComment(e) }}
                                placeholder="Add a comment…"
                                enterKeyHint="send"
                                autoComplete="off"
                                autoCorrect="on"
                                className="flex-1 outline-none placeholder-gray-400 dark:placeholder-gray-500 dark:text-white min-w-0"
                                style={{ backgroundColor: 'transparent', fontSize: '16px' }}
                                maxLength={1000}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={submitComment}
                            disabled={!input.trim() || submitting}
                            className="text-base font-semibold text-blue-500 disabled:opacity-40 hover:text-blue-700 transition-colors shrink-0"
                        >
                            Post
                        </button>
                    </div>
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
    onOpenLightbox: () => void
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
                    onOpenLightbox()
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
                        onClick={e => { e.stopPropagation(); onOpenWithComment ? onOpenWithComment() : onOpenLightbox() }}
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


// ─── Loupe magnifier ─────────────────────────────────────────────────────────

const LOUPE_SIZE = 220
const LOUPE_ZOOM = 3

function computeLoupeState(
    mx: number, my: number,
    cW: number, cH: number,
    photoW: number, photoH: number,
    mobile: boolean,
    fullRes = false
): { x: number; y: number; bgX: number; bgY: number; bgW: number; bgH: number } {
    // Compute the actual rendered image bounds within the object-contain container
    const iAspect = photoW / photoH
    const cAspect = cW / cH
    let imgW: number, imgH: number, imgL: number, imgT: number
    if (iAspect > cAspect) {
        imgW = cW; imgH = cW / iAspect; imgL = 0; imgT = (cH - imgH) / 2
    } else {
        imgH = cH; imgW = cH * iAspect; imgL = (cW - imgW) / 2; imgT = 0
    }
    // Fractional position within the image content (clamped to 0–1)
    const relX = Math.max(0, Math.min(1, (mx - imgL) / imgW))
    const relY = Math.max(0, Math.min(1, (my - imgT) / imgH))
    // When zooming into the full-res image, use native pixel dimensions as the background
    // size (clamped to at least LOUPE_ZOOM× the display size so low-res photos still zoom).
    // Otherwise use the standard display-size × LOUPE_ZOOM.
    const bgW = fullRes ? Math.max(imgW * LOUPE_ZOOM, photoW) : imgW * LOUPE_ZOOM
    const bgH = fullRes ? Math.max(imgH * LOUPE_ZOOM, photoH) : imgH * LOUPE_ZOOM
    // On mobile the loupe floats above the finger; on desktop it centers on the cursor
    const displayMy = mobile ? my - LOUPE_SIZE - 16 : my
    // Clamp loupe so it stays inside the container
    const loupeCX = Math.max(LOUPE_SIZE / 2, Math.min(cW - LOUPE_SIZE / 2, mx))
    const loupeCY = Math.max(LOUPE_SIZE / 2, Math.min(cH - LOUPE_SIZE / 2, displayMy))
    return {
        x: loupeCX - LOUPE_SIZE / 2,
        y: loupeCY - LOUPE_SIZE / 2,
        bgX: LOUPE_SIZE / 2 - relX * bgW,
        bgY: LOUPE_SIZE / 2 - relY * bgH,
        bgW, bgH,
    }
}

export default function GalleryGrid({ photos, selectionMode = false, selectedIds, currentUserId, onPhotoClick, onExitSelection }: GalleryGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [lightboxLoaded, setLightboxLoaded] = useState(false)
    const [commentFocusSignal, setCommentFocusSignal] = useState(0)
    const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false)
    const [isSheetExpanded, setIsSheetExpanded] = useState(false)
    const [sheetDragOffset, setSheetDragOffset] = useState(0)
    const [isDraggingSheet, setIsDraggingSheet] = useState(false)
    const sheetTouchStartY = useRef(0)
    const sheetTouchCurrentY = useRef(0)
    const imageTouchStartX = useRef(0)
    const imageTouchStartY = useRef(0)
    const imageTouchCurrentX = useRef(0)
    const imageTouchLastX = useRef(0)
    const imageTouchLastTime = useRef(0)
    const swipeVelocityX = useRef(0)
    const swipeDirectionLocked = useRef<'h' | 'v' | null>(null)
    const [hasTouchInput, setHasTouchInput] = useState(false)

    // Container width measurement — used to give RowsPhotoAlbum the real width before
    // first paint so it never flashes the wrong (desktop) column layout on mobile.
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState<number | null>(null)

    // Loupe magnifier
    const [isLoupeActive, setIsLoupeActive] = useState(false)
    const [loupePos, setLoupePos] = useState<{ x: number; y: number; bgX: number; bgY: number; bgW: number; bgH: number } | null>(null)

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
        setIsSheetExpanded(false)
        setSheetDragOffset(0)
        setLoupePos(null)
    }, [lightboxIndex])

    // Prevent background scroll while lightbox is open (Instagram-style)
    useEffect(() => {
        if (lightboxIndex !== null) {
            document.body.style.overflow = 'hidden'
        }
        return () => { document.body.style.overflow = '' }
    }, [lightboxIndex])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const supportsTouch =
            ('ontouchstart' in window) ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia('(any-pointer: coarse)').matches
        setHasTouchInput(supportsTouch)
    }, [])

    // When the comment sheet is open, prevent iOS Safari from showing its
    // "Previous / Next field" keyboard toolbar by removing all background
    // form controls from the tab order. The lightbox root is excluded so the
    // comment input itself remains focusable.
    useEffect(() => {
        if (!isCommentSheetOpen) return
        const lightboxEl = document.querySelector('[data-lightbox-root]')
        const els = Array.from(
            document.querySelectorAll<HTMLElement>('input, select, textarea')
        ).filter(el => !lightboxEl?.contains(el))
        const saved = els.map(el => ({ el, tabIndex: el.tabIndex }))
        els.forEach(el => { el.tabIndex = -1 })
        return () => { saved.forEach(({ el, tabIndex }) => { el.tabIndex = tabIndex }) }
    }, [isCommentSheetOpen])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width
            if (w) setContainerWidth(Math.round(w))
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    function handleSheetTouchStart(e: React.TouchEvent) {
        sheetTouchStartY.current = e.touches[0].clientY
        sheetTouchCurrentY.current = e.touches[0].clientY
        setIsDraggingSheet(true)
    }

    function handleSheetTouchMove(e: React.TouchEvent) {
        const delta = e.touches[0].clientY - sheetTouchStartY.current
        sheetTouchCurrentY.current = e.touches[0].clientY
        // Allow full range: positive = dragged down (shrinks), negative = dragged up (grows)
        setSheetDragOffset(delta)
    }

    function handleSheetTouchEnd() {
        setIsDraggingSheet(false)
        const delta = sheetTouchCurrentY.current - sheetTouchStartY.current
        if (isSheetExpanded) {
            // From expanded: drag down > 80px → snap to mid; further down → dismiss
            if (delta > 200) {
                setSheetDragOffset(window.innerHeight)
                setTimeout(() => {
                    setIsCommentSheetOpen(false)
                    setIsSheetExpanded(false)
                    setSheetDragOffset(0)
                }, 300)
            } else if (delta > 80) {
                setIsSheetExpanded(false)
                setSheetDragOffset(0)
            } else {
                setSheetDragOffset(0)
            }
        } else {
            // From mid: drag up > 60px → snap to expanded; drag down > 80px → dismiss
            if (delta < -60) {
                setIsSheetExpanded(true)
                setSheetDragOffset(0)
            } else if (delta > 80) {
                setSheetDragOffset(window.innerHeight)
                setTimeout(() => {
                    setIsCommentSheetOpen(false)
                    setSheetDragOffset(0)
                }, 300)
            } else {
                setSheetDragOffset(0)
            }
        }
    }

    function handleImageTouchStart(e: React.TouchEvent) {
        if (isLoupeActive) return
        const now = performance.now()
        imageTouchStartX.current = e.touches[0].clientX
        imageTouchStartY.current = e.touches[0].clientY
        imageTouchCurrentX.current = e.touches[0].clientX
        imageTouchLastX.current = e.touches[0].clientX
        imageTouchLastTime.current = now
        swipeVelocityX.current = 0
        swipeDirectionLocked.current = null
    }

    function handleImageTouchMove(e: React.TouchEvent) {
        if (isLoupeActive && lightboxIndex != null) {
            const t = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            const currentPhoto = photos[lightboxIndex]
            setLoupePos(computeLoupeState(
                t.clientX - rect.left, t.clientY - rect.top,
                rect.width, rect.height,
                currentPhoto.width, currentPhoto.height, true,
                currentPhoto.allowFullResDownload !== false
            ))
            return
        }
        const dx = e.touches[0].clientX - imageTouchStartX.current
        const dy = e.touches[0].clientY - imageTouchStartY.current
        imageTouchCurrentX.current = e.touches[0].clientX
        const now = performance.now()
        const dt = Math.max(1, now - imageTouchLastTime.current)
        swipeVelocityX.current = (e.touches[0].clientX - imageTouchLastX.current) / dt
        imageTouchLastX.current = e.touches[0].clientX
        imageTouchLastTime.current = now
        if (swipeDirectionLocked.current === null) {
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                swipeDirectionLocked.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
            }
        }
    }

    function handleImageTouchEnd() {
        if (isLoupeActive) { setLoupePos(null); return }
        if (swipeDirectionLocked.current === 'h') {
            const delta = imageTouchCurrentX.current - imageTouchStartX.current
            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1
            const distanceThreshold = viewportWidth * 0.18
            const velocityThreshold = 0.45
            const shouldAdvanceByDistance = Math.abs(delta) > distanceThreshold
            const shouldAdvanceByVelocity = Math.abs(swipeVelocityX.current) > velocityThreshold
            if (delta < 0 && (shouldAdvanceByDistance || shouldAdvanceByVelocity)) {
                goNext()
            } else if (delta > 0 && (shouldAdvanceByDistance || shouldAdvanceByVelocity)) {
                goPrev()
            }
        }
        swipeDirectionLocked.current = null
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
            {/* containerRef measures the real width so RowsPhotoAlbum never renders
                with a desktop-width layout on mobile, which causes both the column-
                layout flash and the wrong-photo-click bug. */}
            <div ref={containerRef}>
                {containerWidth !== null && (
                    <RowsPhotoAlbum<GalleryPhotoData>
                        photos={photos}
                        targetRowHeight={300}
                        rowConstraints={{ minPhotos: 1, maxPhotos: 5 }}
                        breakpoints={[600, 900, 1200]}
                        defaultContainerWidth={containerWidth}
                        render={{
                            image: (props, { photo: rawPhoto, index }) => {
                                const photo = rawPhoto as GalleryPhotoData
                                // Use the library's own index — it tracks photo positions
                                // natively without any coordinate or search logic.
                                return (
                                    <GalleryPhotoTile
                                        photo={photo}
                                        index={index}
                                        selectionMode={selectionMode}
                                        selectedIds={selectedIds}
                                        currentUserId={currentUserId}
                                        onPhotoClick={onPhotoClick}
                                        onOpenLightbox={() => setLightboxIndex(index)}
                                        liveState={photo.photoId != null ? photoState[photo.photoId] : undefined}
                                        onLikeToggle={photo.photoId != null ? () => toggleLike(photo.photoId!) : undefined}
                                        onOpenWithComment={() => { setLightboxIndex(index); setCommentFocusSignal(s => s + 1); setIsCommentSheetOpen(true) }}
                                    />
                                )
                            },
                        }}
                    />
                )}
            </div>

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
                    <div className="fixed inset-0 z-50" data-lightbox-root="">

                        {/* ── Mobile portrait layout ── */}
                        <div className="flex flex-col bg-black md:hidden overflow-hidden" style={{ height: '100dvh' }}>

                            {/* Image — always flex-1: fills all space not taken by the bottom panel */}
                            <div
                                className="flex-1 relative bg-black min-h-0 overflow-hidden"
                                onTouchStart={handleImageTouchStart}
                                onTouchMove={handleImageTouchMove}
                                onTouchEnd={handleImageTouchEnd}
                            >
                                {/* Back button + counter: fixed overlay, stays put during horizontal swipe */}
                                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-2.5">
                                    <button
                                        onClick={closeLightbox}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => {
                                            e.stopPropagation()
                                            e.preventDefault()
                                            closeLightbox()
                                        }}
                                        className="p-1.5 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
                                        aria-label="Close"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-white/70 text-xs bg-black/30 px-2 py-0.5 rounded-full">{lightboxIndex + 1} / {photos.length}</span>
                                    <div className="flex items-center gap-1">
                                        {/* Loupe button */}
                                        <button
                                            aria-label={isLoupeActive ? 'Disable loupe' : 'Enable loupe'}
                                            onTouchStart={e => e.stopPropagation()}
                                            onTouchEnd={e => { e.stopPropagation(); e.preventDefault(); setIsLoupeActive(v => !v); setLoupePos(null) }}
                                            className={`p-1.5 rounded-full transition-colors ${isLoupeActive ? 'bg-blue-500/80 text-white' : 'bg-black/30 text-white/80'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                                            </svg>
                                        </button>
                                        {/* Full-res button */}
                                        {photo.allowFullResDownload !== false ? (
                                            <a
                                                href={photo.src}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label="View full resolution"
                                                className="p-1.5 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full"
                                                onTouchStart={e => e.stopPropagation()}
                                                onTouchEnd={e => e.stopPropagation()}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                </svg>
                                            </a>
                                        ) : (
                                            <div
                                                aria-label="Full resolution not available"
                                                title="The uploader has not enabled full-resolution viewing"
                                                className="p-1.5 text-white/25 bg-black/30 rounded-full cursor-not-allowed"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Current photo — no carousel panels */}
                                <div className="absolute inset-0">
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
                                </div>

                                {/* Mobile loupe overlay — floats above the finger */}
                                {isLoupeActive && loupePos && (
                                    <div
                                        className="pointer-events-none absolute rounded-full overflow-hidden border-2 border-white/80 shadow-2xl"
                                        style={{
                                            width: LOUPE_SIZE,
                                            height: LOUPE_SIZE,
                                            left: loupePos.x,
                                            top: loupePos.y,
                                            zIndex: 15,
                                            backgroundImage: `url(${photo.src})`,
                                            backgroundSize: `${loupePos.bgW}px ${loupePos.bgH}px`,
                                            backgroundPosition: `${loupePos.bgX}px ${loupePos.bgY}px`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundColor: '#000',
                                        }}
                                    />
                                )}
                                {!hasTouchInput && (
                                    <>
                                        <button className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10" onClick={goPrev} aria-label="Previous photo">‹</button>
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-xl z-10" onClick={goNext} aria-label="Next photo">›</button>
                                    </>
                                )}
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
                                    <div className="flex items-center gap-5 px-4 pt-3 pb-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => photoId != null && toggleLike(photoId)}
                                            disabled={!currentUserId}
                                            aria-label={ls.liked ? 'Unlike' : 'Like'}
                                            className={`transition-colors ${currentUserId ? 'cursor-pointer' : 'cursor-default'} ${ls.liked ? 'text-red-500' : 'text-gray-500'}`}
                                        >
                                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill={ls.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsCommentSheetOpen(true); setSheetDragOffset(0) }}
                                            aria-label="Open comments"
                                            className="text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.75}>
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
                                    className="shrink-0 bg-white flex flex-col rounded-t-[28px] shadow-2xl"
                                    style={{
                                        // Two snap points: mid = 62dvh, max = 100dvh - 60px (leaves header visible)
                                        // sheetDragOffset is signed: positive = dragged down, negative = dragged up
                                        height: `min(
                                            calc(100dvh - 44px),
                                            max(0px, calc(${isSheetExpanded ? '100dvh - 60px' : '62dvh'} - ${sheetDragOffset}px))
                                        )`,
                                        transition: isDraggingSheet ? 'none' : 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)',
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
                                <div
                                    className="flex-1 relative bg-black min-w-0"
                                    style={{ cursor: isLoupeActive ? 'crosshair' : undefined }}
                                    onMouseMove={isLoupeActive ? (e: React.MouseEvent) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setLoupePos(computeLoupeState(
                                            e.clientX - rect.left, e.clientY - rect.top,
                                            rect.width, rect.height,
                                            photo.width, photo.height, false,
                                            photo.allowFullResDownload !== false
                                        ))
                                    } : undefined}
                                    onMouseLeave={isLoupeActive ? () => setLoupePos(null) : undefined}
                                >
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
                                    {/* Loupe button */}
                                    <button
                                        onClick={() => { setIsLoupeActive(v => !v); setLoupePos(null) }}
                                        aria-label={isLoupeActive ? 'Disable loupe' : 'Enable loupe'}
                                        className={`absolute top-3 right-14 rounded-full w-10 h-10 flex items-center justify-center z-10 transition-colors ${isLoupeActive
                                            ? 'text-white bg-blue-500/80 hover:bg-blue-600/80'
                                            : 'text-white bg-black/50 hover:bg-black/80'
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                                        </svg>
                                    </button>
                                    {/* Full-res button */}
                                    {photo.allowFullResDownload !== false ? (
                                        <a
                                            href={photo.src}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="View full resolution"
                                            className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center z-10 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <div
                                            aria-label="Full resolution not available"
                                            title="The uploader has not enabled full-resolution viewing"
                                            className="absolute top-3 right-3 text-white/25 bg-black/20 rounded-full w-10 h-10 flex items-center justify-center z-10 cursor-not-allowed"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                            </svg>
                                        </div>
                                    )}
                                    {/* Desktop loupe overlay */}
                                    {isLoupeActive && loupePos && (
                                        <div
                                            className="pointer-events-none absolute rounded-full overflow-hidden border-2 border-white/80 shadow-2xl"
                                            style={{
                                                width: LOUPE_SIZE,
                                                height: LOUPE_SIZE,
                                                left: loupePos.x,
                                                top: loupePos.y,
                                                zIndex: 20,
                                                backgroundImage: `url(${photo.src})`,
                                                backgroundSize: `${loupePos.bgW}px ${loupePos.bgH}px`,
                                                backgroundPosition: `${loupePos.bgX}px ${loupePos.bgY}px`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundColor: '#000',
                                            }}
                                        />
                                    )}
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
