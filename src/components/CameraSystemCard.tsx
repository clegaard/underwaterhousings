'use client'

import Image from 'next/image'
import StarRating from '@/components/StarRating'
import {
    getCameraImagePathWithFallback,
    getLensImagePathWithFallback,
    getHousingImagePathWithFallback,
    getPortImagePathWithFallback,
} from '@/lib/images'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CameraSystemCardData {
    id: number
    name: string
    imagePath: string | null
    isActive?: boolean
    camera: {
        id: number
        name: string
        productPhotos: string[]
        brand: { name: string }
    }
    lens: {
        id: number
        name: string
        productPhotos: string[]
    } | null
    housing: {
        id: number
        name: string
        productPhotos: string[]
        manufacturer: { name: string }
    } | null
    portAdapter: {
        id: number
        name: string
        productPhotos: string[]
        manufacturer: { name: string }
    } | null
    extensionRings: {
        id: number
        name: string
        productPhotos: string[]
    }[]
    port: {
        id: number
        name: string
        productPhotos: string[]
    } | null
    _count?: { galleryPhotos: number } | { reviewLinks: number }
}

export type CameraSystemCardMode = 'manage' | 'select' | 'display'

// ─── Component Item ───────────────────────────────────────────────────────────

interface ComponentItem {
    label: string
    name: string
    subtitle: string
    img: { src: string; fallback: string }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CameraSystemCardProps {
    cameraSystem: CameraSystemCardData
    /** Controls which actions are shown. Defaults to 'manage'. */
    mode?: CameraSystemCardMode
    /** User ID for building links (needed in manage/display modes). */
    userId?: number
    /** Whether the current user owns this system (shows controls in manage mode). */
    isOwnProfile?: boolean
    /** Whether this system is favorited (shows filled star in manage mode). */
    isFavorite?: boolean
    /** Whether this system is currently selected (shows highlight in select mode). */
    isSelected?: boolean

    // ── Manage mode callbacks ──
    onSetFavorite?: () => void
    onToggleActive?: () => void
    onEdit?: () => void
    onClone?: () => void
    onDelete?: () => void

    // ── Select mode callbacks ──
    onSelect?: () => void

    /** Component-level ratings from a review, in the same order as the card's component list
     *  (cameras → lenses → housings → ports → adapters → rings). */
    ratings?: Array<number | null>
}

export default function CameraSystemCard({
    cameraSystem,
    mode = 'manage',
    userId,
    isOwnProfile = false,
    isFavorite = false,
    isSelected = false,
    ratings,
    onSetFavorite,
    onToggleActive,
    onEdit,
    onClone,
    onDelete,
    onSelect,
}: CameraSystemCardProps) {
    const cameraImg = getCameraImagePathWithFallback(cameraSystem.camera.productPhotos)
    const lensImg = cameraSystem.lens ? getLensImagePathWithFallback(cameraSystem.lens.productPhotos) : null
    const housingImg = cameraSystem.housing ? getHousingImagePathWithFallback(cameraSystem.housing.productPhotos) : null
    const portImg = cameraSystem.port ? getPortImagePathWithFallback(cameraSystem.port.productPhotos) : null

    const items: ComponentItem[] = [
        { label: 'Camera', name: cameraSystem.camera.name, subtitle: cameraSystem.camera.brand.name, img: cameraImg },
        ...(cameraSystem.lens ? [{ label: 'Lens', name: cameraSystem.lens.name, subtitle: '', img: lensImg! }] : []),
        ...(cameraSystem.housing
            ? [{ label: 'Housing', name: cameraSystem.housing.name, subtitle: cameraSystem.housing.manufacturer.name, img: housingImg! }]
            : []),
        ...(cameraSystem.portAdapter
            ? [{ label: 'Adapter', name: cameraSystem.portAdapter.name, subtitle: cameraSystem.portAdapter.manufacturer.name, img: getPortImagePathWithFallback(cameraSystem.portAdapter.productPhotos) }]
            : []),
        ...cameraSystem.extensionRings.map(r => ({ label: 'Ring', name: r.name, subtitle: '', img: getPortImagePathWithFallback(r.productPhotos) })),
        ...(cameraSystem.port ? [{ label: 'Port', name: cameraSystem.port.name, subtitle: '', img: portImg! }] : []),
    ]

    const photoCount = cameraSystem._count && 'galleryPhotos' in cameraSystem._count
        ? (cameraSystem._count as { galleryPhotos: number }).galleryPhotos
        : 0

    const isManage = mode === 'manage'
    const isSelect = mode === 'select'
    const showToolbar = isManage && isOwnProfile
    const isInactive = isManage && cameraSystem.isActive === false

    // Build the card wrapper based on mode
    const CardWrapper = isSelect
        ? ({ children }: { children: React.ReactNode }) => (
            <button
                type="button"
                onClick={onSelect}
                className={`w-full text-left border rounded-xl overflow-hidden bg-white shadow-sm transition-all ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
            >
                {children}
            </button>
        )
        : ({ children }: { children: React.ReactNode }) => (
            <div className={`relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-opacity ${isInactive ? 'opacity-60' : ''}`}>
                {children}
            </div>
        )

    return (
        <CardWrapper>
            {/* Unified toolbar — manage mode only */}
            {showToolbar && (
                <div className="absolute top-2 right-2 z-10 flex gap-0.5">
                    {/* Activate / deactivate toggle */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleActive?.() }}
                            aria-label={cameraSystem.isActive ? 'Deactivate camera system' : 'Activate camera system'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 ${cameraSystem.isActive
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                {cameraSystem.isActive ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
                                )}
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-52 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {cameraSystem.isActive
                                ? 'Camera system is active. It will be matched automatically when uploading photos. Click to deactivate.'
                                : 'Camera system is inactive and will not be matched when uploading photos. Click to activate.'}
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Favorite button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSetFavorite?.() }}
                            aria-label={isFavorite ? 'Default camera system' : 'Set as default camera system'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 ${isFavorite
                                ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-400'
                                }`}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="w-4 h-4"
                                fill={isFavorite ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-56 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {isFavorite
                                ? 'This is your default camera system. It is pre-selected when uploading photos to the gallery.'
                                : 'Set as default camera system. Your default camera system is pre-selected when uploading photos to the gallery.'}
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Clone button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onClone?.() }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all duration-150"
                            aria-label="Clone camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-44 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Clone camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Edit button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 hover:scale-110 transition-all duration-150"
                            aria-label="Edit camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-36 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Edit camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>

                    {/* Delete button */}
                    <div className="group relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-100 hover:scale-110 transition-all duration-150"
                            aria-label="Delete camera system"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 w-40 max-w-[80vw] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                            Delete camera system
                            <div className="absolute right-2 -top-1.5 border-4 border-transparent border-b-gray-800" />
                        </div>
                    </div>
                </div>
            )}

            {/* Card body */}
            <div className="p-3">
                <div className="flex items-start gap-3">
                    {/* System cover photo — 1:1, left-aligned */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-blue-50 border border-gray-100 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={cameraSystem.imagePath ? `/api/media${cameraSystem.imagePath}` : '/housings/camera-system-placeholder.png'}
                            alt={`${cameraSystem.name} assembled`}
                            className={`w-full h-full ${cameraSystem.imagePath ? 'object-cover' : 'object-contain p-2'}`}
                        />
                    </div>

                    {/* Name + photo link */}
                    <div className="min-w-0 pr-16 sm:pr-8 pt-1">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-snug">{cameraSystem.name}</h3>
                        {photoCount > 0 && userId && (
                            <a
                                href={`/users/${userId}/camera-systems/${cameraSystem.id}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                            </a>
                        )}
                    </div>
                </div>

                {/* Components section */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Components</span>
                    <div className="mt-1.5 space-y-1">
                        {items.map((item, idx) => {
                            const itemRating = ratings?.[idx] ?? null
                            return (
                                <div key={item.label} className="flex items-center gap-1.5 text-xs">
                                    <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                        <Image
                                            src={item.img.src}
                                            alt={item.name}
                                            fill
                                            className="object-contain p-0.5"
                                            onError={(e) => {
                                                const img = e.currentTarget as HTMLImageElement
                                                if (img.src !== item.img.fallback) img.src = item.img.fallback
                                            }}
                                            sizes="20px"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide w-12 shrink-0">{item.label}</span>
                                    <span className="text-gray-700 truncate">{item.name}</span>
                                    {itemRating != null && (
                                        <StarRating value={itemRating} readonly size="sm" label={`${item.name} rating`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </CardWrapper>
    )
}
