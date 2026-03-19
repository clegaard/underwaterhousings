'use client'

import Image from 'next/image'
import { RowsPhotoAlbum } from 'react-photo-album'
import type { Photo } from 'react-photo-album'
import 'react-photo-album/rows.css'

export interface GalleryPhotoData extends Photo {
    title?: string
    description?: string
    location?: string
    takenAt?: string
    cameraName?: string
    lensName?: string
    housingName?: string
    portName?: string
}

interface GalleryGridProps {
    photos: GalleryPhotoData[]
}

export default function GalleryGrid({ photos }: GalleryGridProps) {
    if (photos.length === 0) {
        return (
            <div className="text-center py-24 text-gray-400">
                <p className="text-2xl mb-2">No photos yet</p>
                <p className="text-sm">Photos will appear here once they are added to the gallery.</p>
            </div>
        )
    }

    return (
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
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                            {photo.title && (
                                <p className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">{photo.title}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                                {photo.cameraName && (
                                    <span className="bg-blue-800/80 text-blue-100 text-xs px-2 py-0.5 rounded-full">{photo.cameraName}</span>
                                )}
                                {photo.lensName && (
                                    <span className="bg-green-800/80 text-green-100 text-xs px-2 py-0.5 rounded-full">{photo.lensName}</span>
                                )}
                                {photo.housingName && (
                                    <span className="bg-teal-800/80 text-teal-100 text-xs px-2 py-0.5 rounded-full">{photo.housingName}</span>
                                )}
                                {photo.portName && (
                                    <span className="bg-indigo-800/80 text-indigo-100 text-xs px-2 py-0.5 rounded-full">{photo.portName}</span>
                                )}
                                {photo.location && (
                                    <span className="bg-gray-700/80 text-gray-100 text-xs px-2 py-0.5 rounded-full">📍 {photo.location}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ),
            }}
        />
    )
}
