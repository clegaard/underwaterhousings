'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { RowsPhotoAlbum } from 'react-photo-album'
import type { Photo } from 'react-photo-album'
import 'react-photo-album/rows.css'

export interface GalleryPhotoData extends Photo {
    title?: string
    description?: string
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
    focalLength?: number
    shutterSpeed?: string
    aperture?: number
    photoId?: number
    userName?: string
    userId?: number
    userProfilePicture?: string
}

interface GalleryGridProps {
    photos: GalleryPhotoData[]
    selectionMode?: boolean
    selectedIds?: Set<number>
    currentUserId?: number
    onPhotoClick?: (photoId: number, index: number, shiftKey: boolean) => void
    onExitSelection?: () => void
}

interface GalleryPhotoTileProps {
    photo: GalleryPhotoData
    index: number
    selectionMode: boolean
    selectedIds?: Set<number>
    currentUserId?: number
    onPhotoClick?: (photoId: number, index: number, shiftKey: boolean) => void
    onOpenLightbox: (index: number) => void
}

function GalleryPhotoTile({ photo, index, selectionMode, selectedIds, currentUserId, onPhotoClick, onOpenLightbox }: GalleryPhotoTileProps) {
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
            {/* Shimmer placeholder — same aspect ratio, disappears once image loads */}
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <Image
                src={photo.src}
                alt={photo.title ?? photo.description ?? 'Gallery photo'}
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
                    {/* Gray out photos not owned by current user */}
                    {photo.userId !== currentUserId && (
                        <div className="absolute inset-0 bg-white/50 pointer-events-none" />
                    )}
                    {/* Blue tint on selected photos */}
                    {photo.photoId != null && selectedIds?.has(photo.photoId) && (
                        <div className="absolute inset-0 bg-blue-500/25 pointer-events-none" />
                    )}
                    {/* Selection circle — top-right, always visible in selection mode */}
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
            {/* Hover overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2.5 py-2">
                {photo.title && (
                    <p className="text-white text-xs font-medium leading-tight mb-1 truncate">{photo.title}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                    {photo.rigLabel && photo.cameraSlug && photo.housingSlug ? (
                        <Link
                            href={`/rigs?${new URLSearchParams({
                                camera: photo.cameraSlug,
                                housing: photo.housingSlug,
                                ...(photo.lensSlug ? { lens: photo.lensSlug } : {}),
                                ...(photo.portSlug ? { port: photo.portSlug } : {}),
                            }).toString()}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-300 text-xs hover:text-white transition-colors truncate"
                        >
                            {photo.rigLabel}
                        </Link>
                    ) : photo.rigLabel ? (
                        <span className="text-gray-300 text-xs truncate">{photo.rigLabel}</span>
                    ) : null}
                    <div className="flex items-center gap-x-2 flex-shrink-0">
                        {photo.focalLength && (
                            <span className="text-gray-400 text-xs">{photo.focalLength}mm</span>
                        )}
                        {photo.aperture && (
                            <span className="text-gray-400 text-xs">f/{photo.aperture}</span>
                        )}
                        {photo.shutterSpeed && (
                            <span className="text-gray-400 text-xs">{photo.shutterSpeed}s</span>
                        )}
                        {photo.userId && photo.userName && (
                            <Link
                                href={`/users/${photo.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 group/user"
                            >
                                {photo.userProfilePicture ? (
                                    <img
                                        src={photo.userProfilePicture}
                                        alt={photo.userName}
                                        className="w-4 h-4 rounded-full object-cover ring-1 ring-white/30"
                                    />
                                ) : (
                                    <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white/30 flex-shrink-0">
                                        {photo.userName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <span className="text-gray-400 text-xs group-hover/user:text-white transition-colors truncate">{photo.userName}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function GalleryGrid({ photos, selectionMode = false, selectedIds, currentUserId, onPhotoClick, onExitSelection }: GalleryGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

    const closeLightbox = useCallback(() => setLightboxIndex(null), [])

    const goNext = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))
    }, [photos.length])

    const goPrev = useCallback(() => {
        setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
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
                        />
                    ),
                }}
            />

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                    onClick={closeLightbox}
                >
                    {/* Prev button */}
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-2xl z-10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); goPrev() }}
                        aria-label="Previous photo"
                    >
                        ‹
                    </button>

                    {/* Image container */}
                    <div
                        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={photos[lightboxIndex].src}
                            alt={photos[lightboxIndex].title ?? photos[lightboxIndex].description ?? 'Gallery photo'}
                            className="max-w-[90vw] max-h-[75vh] object-contain rounded-t-lg shadow-2xl"
                        />

                        {/* Metadata bar */}
                        <div className="w-full bg-black rounded-b-lg px-4 py-2.5 flex flex-col gap-1 shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                {/* Rig link */}
                                {photos[lightboxIndex].rigLabel && photos[lightboxIndex].cameraSlug && photos[lightboxIndex].housingSlug ? (
                                    <Link
                                        href={`/rigs?${new URLSearchParams({
                                            camera: photos[lightboxIndex].cameraSlug!,
                                            housing: photos[lightboxIndex].housingSlug!,
                                            ...(photos[lightboxIndex].lensSlug ? { lens: photos[lightboxIndex].lensSlug! } : {}),
                                            ...(photos[lightboxIndex].portSlug ? { port: photos[lightboxIndex].portSlug! } : {}),
                                        }).toString()}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-white text-sm font-medium hover:text-blue-300 transition-colors truncate"
                                    >
                                        {photos[lightboxIndex].rigLabel}
                                    </Link>
                                ) : photos[lightboxIndex].rigLabel ? (
                                    <span className="text-white text-sm font-medium truncate">{photos[lightboxIndex].rigLabel}</span>
                                ) : null}
                                {/* EXIF + user emblem */}
                                <div className="flex items-center gap-x-3 flex-shrink-0 text-gray-300 text-sm">
                                    {photos[lightboxIndex].focalLength && (
                                        <span>{photos[lightboxIndex].focalLength}mm</span>
                                    )}
                                    {photos[lightboxIndex].aperture && (
                                        <span>f/{photos[lightboxIndex].aperture}</span>
                                    )}
                                    {photos[lightboxIndex].shutterSpeed && (
                                        <span>{photos[lightboxIndex].shutterSpeed}s</span>
                                    )}
                                    {photos[lightboxIndex].location && (
                                        <span className="text-gray-400">{photos[lightboxIndex].location}</span>
                                    )}
                                    {photos[lightboxIndex].userId && photos[lightboxIndex].userName && (
                                        <Link
                                            href={`/users/${photos[lightboxIndex].userId}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 group/user"
                                        >
                                            {photos[lightboxIndex].userProfilePicture ? (
                                                <img
                                                    src={photos[lightboxIndex].userProfilePicture}
                                                    alt={photos[lightboxIndex].userName!}
                                                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white/30"
                                                />
                                            ) : (
                                                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white/30 flex-shrink-0">
                                                    {photos[lightboxIndex].userName!.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            <span className="text-gray-300 text-sm group-hover/user:text-white transition-colors">
                                                {photos[lightboxIndex].userName}
                                            </span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                            {photos[lightboxIndex].title && (
                                <p className="text-gray-400 text-xs">{photos[lightboxIndex].title}</p>
                            )}
                        </div>
                        <span className="text-gray-500 text-xs mt-2">{lightboxIndex + 1} / {photos.length}</span>
                    </div>

                    {/* Next button */}
                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-2xl z-10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); goNext() }}
                        aria-label="Next photo"
                    >
                        ›
                    </button>

                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors"
                        onClick={closeLightbox}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    )
}
