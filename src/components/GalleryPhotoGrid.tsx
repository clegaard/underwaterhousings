import Image from 'next/image'
import Link from 'next/link'
import { withBase } from '@/lib/images'

export interface GalleryPhoto {
    id: number
    imagePath: string
    caption: string | null
    location: string | null
}

interface Props {
    photos: GalleryPhoto[]
    heading: string
    /** Optional link to view all photos in the gallery. */
    viewAllHref?: string
    viewAllLabel?: string
}

export default function GalleryPhotoGrid({ photos, heading, viewAllHref, viewAllLabel = 'View all →' }: Props) {
    if (photos.length === 0) return null

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {heading}
                    <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                        ({photos.length})
                    </span>
                </h2>
                {viewAllHref && (
                    <Link href={viewAllHref} className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                        {viewAllLabel}
                    </Link>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <Image
                            src={withBase(photo.imagePath)}
                            alt={photo.caption ?? 'Gallery photo'}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {(photo.caption || photo.location) && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-2 py-1.5">
                                {photo.caption && (
                                    <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                                )}
                                {photo.location && (
                                    <p className="text-gray-300 text-xs">📍 {photo.location}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
