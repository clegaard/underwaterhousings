'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'
import GalleryUploadButton from './GalleryUploadButton'

interface GalleryPageClientProps {
    photos: GalleryPhotoData[]
}

export default function GalleryPageClient({ photos }: GalleryPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const cameraSlug = searchParams.get('camera') ?? ''
    const lensSlug = searchParams.get('lens') ?? ''
    const housingSlug = searchParams.get('housing') ?? ''
    const portName = searchParams.get('port') ?? ''

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.replace(`/gallery?${params.toString()}`, { scroll: false })
    }

    // Derive unique [slug, displayName] pairs sorted by display name
    const cameras = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.cameraSlug && p.cameraName) map.set(p.cameraSlug, p.cameraName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const lenses = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.lensSlug && p.lensName) map.set(p.lensSlug, p.lensName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const housings = useMemo(() => {
        const map = new Map<string, string>()
        photos.forEach((p) => { if (p.housingSlug && p.housingName) map.set(p.housingSlug, p.housingName) })
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    }, [photos])

    const ports = useMemo(
        () => Array.from(new Set(photos.map((p) => p.portName).filter((v): v is string => !!v))).sort(),
        [photos]
    )

    const filtered = useMemo(
        () =>
            photos.filter(
                (p) =>
                    (!cameraSlug || p.cameraSlug === cameraSlug) &&
                    (!lensSlug || p.lensSlug === lensSlug) &&
                    (!housingSlug || p.housingSlug === housingSlug) &&
                    (!portName || p.portName === portName)
            ),
        [photos, cameraSlug, lensSlug, housingSlug, portName]
    )

    const hasActiveFilter = !!(cameraSlug || lensSlug || housingSlug || portName)

    function clearAll() {
        router.replace('/gallery', { scroll: false })
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <div className="lg:w-72 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
                        {hasActiveFilter && (
                            <button
                                onClick={clearAll}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
                            <select
                                value={cameraSlug}
                                onChange={(e) => setParam('camera', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All cameras</option>
                                {cameras.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lens</label>
                            <select
                                value={lensSlug}
                                onChange={(e) => setParam('lens', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All lenses</option>
                                {lenses.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Housing</label>
                            <select
                                value={housingSlug}
                                onChange={(e) => setParam('housing', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">All housings</option>
                                {housings.map(([slug, name]) => (
                                    <option key={slug} value={slug}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {ports.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                                <select
                                    value={portName}
                                    onChange={(e) => setParam('port', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="">All ports</option>
                                    {ports.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <p className="text-sm text-gray-500 pt-1">
                            {filtered.length} / {photos.length} photos
                        </p>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-end mb-4">
                    <GalleryUploadButton />
                </div>
                <GalleryGrid photos={filtered} />
            </div>
        </div>
    )
}
