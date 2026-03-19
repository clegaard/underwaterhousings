'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { RowsPhotoAlbum } from 'react-photo-album'
import type { Photo } from 'react-photo-album'
import 'react-photo-album/rows.css'

export interface GalleryPhotoData extends Photo {
    title?: string
    description?: string
    location?: string
    takenAt?: string
    cameraName?: string
    cameraSlug?: string
    lensName?: string
    lensSlug?: string
    housingName?: string
    housingSlug?: string
    portName?: string
    focalLength?: number
    shutterSpeed?: string
    aperture?: number
}

interface GalleryGridProps {
    photos: GalleryPhotoData[]
}

export default function GalleryGrid({ photos }: GalleryGridProps) {
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
                        <div
                            className="relative group overflow-hidden cursor-pointer"
                            style={{ aspectRatio: 'var(--react-photo-album--photo-width) / var(--react-photo-album--photo-height)' }}
                            onClick={() => setLightboxIndex(index)}
                        >
                            <Image
                                src={photo.src}
                                alt={photo.title ?? photo.description ?? 'Gallery photo'}
                                fill
                                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                priority={index < 4}
                                loading={index < 4 ? 'eager' : 'lazy'}
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2.5 py-2">
                                {photo.title && (
                                    <p className="text-white text-xs font-medium leading-tight mb-1 truncate">{photo.title}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    {photo.cameraName && (
                                        <span className="text-gray-300 text-xs">{photo.cameraName}</span>
                                    )}
                                    {photo.focalLength && (
                                        <span className="text-gray-400 text-xs">{photo.focalLength}mm</span>
                                    )}
                                    {photo.aperture && (
                                        <span className="text-gray-400 text-xs">f/{photo.aperture}</span>
                                    )}
                                    {photo.shutterSpeed && (
                                        <span className="text-gray-400 text-xs">{photo.shutterSpeed}s</span>
                                    )}
                                </div>
                            </div>
                        </div>
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
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {photos[lightboxIndex].cameraName && (
                                        <span className="text-white text-sm font-medium">{photos[lightboxIndex].cameraName}</span>
                                    )}
                                    {photos[lightboxIndex].lensName && (
                                        <span className="text-gray-400 text-sm">{photos[lightboxIndex].lensName}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-x-4">
                                    {photos[lightboxIndex].focalLength && (
                                        <span className="text-gray-300 text-sm">{photos[lightboxIndex].focalLength}mm</span>
                                    )}
                                    {photos[lightboxIndex].aperture && (
                                        <span className="text-gray-300 text-sm">f/{photos[lightboxIndex].aperture}</span>
                                    )}
                                    {photos[lightboxIndex].shutterSpeed && (
                                        <span className="text-gray-300 text-sm">{photos[lightboxIndex].shutterSpeed}s</span>
                                    )}
                                    {photos[lightboxIndex].location && (
                                        <span className="text-gray-400 text-sm">{photos[lightboxIndex].location}</span>
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
