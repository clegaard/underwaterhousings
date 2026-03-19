'use client'

import { useState, useMemo } from 'react'
import GalleryGrid, { GalleryPhotoData } from './GalleryGrid'

interface GalleryPageClientProps {
    photos: GalleryPhotoData[]
}

export default function GalleryPageClient({ photos }: GalleryPageClientProps) {
    const [camera, setCamera] = useState('')
    const [lens, setLens] = useState('')
    const [housing, setHousing] = useState('')
    const [port, setPort] = useState('')

    // Derive unique options from all photos (sorted)
    const cameras = useMemo(
        () => Array.from(new Set(photos.map((p) => p.cameraName).filter((v): v is string => !!v))).sort(),
        [photos]
    )
    const lenses = useMemo(
        () => Array.from(new Set(photos.map((p) => p.lensName).filter((v): v is string => !!v))).sort(),
        [photos]
    )
    const housings = useMemo(
        () => Array.from(new Set(photos.map((p) => p.housingName).filter((v): v is string => !!v))).sort(),
        [photos]
    )
    const ports = useMemo(
        () => Array.from(new Set(photos.map((p) => p.portName).filter((v): v is string => !!v))).sort(),
        [photos]
    )

    const filtered = useMemo(
        () =>
            photos.filter(
                (p) =>
                    (!camera || p.cameraName === camera) &&
                    (!lens || p.lensName === lens) &&
                    (!housing || p.housingName === housing) &&
                    (!port || p.portName === port)
            ),
        [photos, camera, lens, housing, port]
    )

    const hasActiveFilter = camera || lens || housing || port

    function clearAll() {
        setCamera('')
        setLens('')
        setHousing('')
        setPort('')
    }

    return (
        <div>
            {/* Filter bar */}
            <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800 flex flex-wrap gap-3 items-end">
                <FilterSelect
                    label="Camera"
                    value={camera}
                    options={cameras}
                    onChange={setCamera}
                    placeholder="All cameras"
                />
                <FilterSelect
                    label="Lens"
                    value={lens}
                    options={lenses}
                    onChange={setLens}
                    placeholder="All lenses"
                />
                <FilterSelect
                    label="Housing"
                    value={housing}
                    options={housings}
                    onChange={setHousing}
                    placeholder="All housings"
                />
                {ports.length > 0 && (
                    <FilterSelect
                        label="Port"
                        value={port}
                        options={ports}
                        onChange={setPort}
                        placeholder="All ports"
                    />
                )}
                {hasActiveFilter && (
                    <button
                        onClick={clearAll}
                        className="self-end text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
                    >
                        Clear filters
                    </button>
                )}
                <span className="self-end ml-auto text-sm text-gray-500">
                    {filtered.length} / {photos.length} photos
                </span>
            </div>

            <GalleryGrid photos={filtered} />
        </div>
    )
}

function FilterSelect({
    label,
    value,
    options,
    onChange,
    placeholder,
}: {
    label: string
    value: string
    options: string[]
    onChange: (v: string) => void
    placeholder: string
}) {
    return (
        <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-gray-800 text-white text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    )
}
