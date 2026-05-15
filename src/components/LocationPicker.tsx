'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LocationPickerMapProps } from './LocationPickerMap'

const LocationPickerMap = dynamic<LocationPickerMapProps>(
    () => import('./LocationPickerMap'),
    {
        ssr: false,
        loading: () => (
            <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Loading map…
            </div>
        ),
    }
)

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LocationValue {
    lat: number
    lng: number
    radius: number // metres
    name: string
}

interface NominatimResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
}

interface Props {
    value: LocationValue | null
    onChange: (v: LocationValue | null) => void
}

// ─── Radius presets ───────────────────────────────────────────────────────────
const RADIUS_PRESETS = [50, 100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000]

function formatRadius(metres: number): string {
    return metres < 1000 ? `${metres} m` : `${metres / 1000} km`
}

function closestPresetIdx(radius: number): number {
    let best = 0
    let bestDiff = Math.abs(RADIUS_PRESETS[0] - radius)
    for (let i = 1; i < RADIUS_PRESETS.length; i++) {
        const diff = Math.abs(RADIUS_PRESETS[i] - radius)
        if (diff < bestDiff) { bestDiff = diff; best = i }
    }
    return best
}

const NOMINATIM_HEADERS = {
    'Accept-Language': 'en',
    'User-Agent': 'UnderwaterHousings/1.0 (https://github.com/underwaterhousings)',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LocationPicker({ value, onChange }: Props) {
    const [isOpen, setIsOpen] = useState(false)

    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Pending (in-picker) state
    const [pendingLat, setPendingLat] = useState<number | null>(value?.lat ?? null)
    const [pendingLng, setPendingLng] = useState<number | null>(value?.lng ?? null)
    const [pendingRadius, setPendingRadius] = useState<number>(
        value ? RADIUS_PRESETS[closestPresetIdx(value.radius)] : 1000
    )
    const [pendingName, setPendingName] = useState<string>(value?.name ?? '')
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
    const [isGeolocating, setIsGeolocating] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)

    // Map view center — only updated on search-result select or geolocation, not on marker click
    const [centerLat, setCenterLat] = useState(value?.lat ?? 20)
    const [centerLng, setCenterLng] = useState(value?.lng ?? 0)
    const [centerZoom, setCenterZoom] = useState(value ? 10 : 2)

    // ── Reverse geocode ──────────────────────────────────────────────────────
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setIsReverseGeocoding(true)
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: NOMINATIM_HEADERS }
            )
            if (res.ok) {
                const data = await res.json()
                if (data?.display_name) {
                    const parts = (data.display_name as string).split(',').map((s: string) => s.trim())
                    // Keep the last 3 comma-separated segments (typically city/region/country)
                    const short = parts.length > 3 ? parts.slice(-3).join(', ') : data.display_name
                    setPendingName(short)
                }
            }
        } catch {
            // non-critical
        } finally {
            setIsReverseGeocoding(false)
        }
    }, [])

    // ── Map click ────────────────────────────────────────────────────────────
    const handleMapClick = useCallback((lat: number, lng: number) => {
        setPendingLat(lat)
        setPendingLng(lng)
        reverseGeocode(lat, lng)
    }, [reverseGeocode])

    // ── Search ───────────────────────────────────────────────────────────────
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query)
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        if (query.length < 3) { setSearchResults([]); return }
        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true)
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                    { headers: NOMINATIM_HEADERS }
                )
                if (res.ok) setSearchResults(await res.json())
            } catch {
                // non-critical
            } finally {
                setIsSearching(false)
            }
        }, 600)
    }, [])

    const selectResult = useCallback((r: NominatimResult) => {
        const lat = parseFloat(r.lat)
        const lng = parseFloat(r.lon)
        setPendingLat(lat)
        setPendingLng(lng)
        const parts = r.display_name.split(',').map((s: string) => s.trim())
        setPendingName(parts.length > 3 ? parts.slice(-3).join(', ') : r.display_name)
        setCenterLat(lat)
        setCenterLng(lng)
        setCenterZoom(12)
        setSearchQuery('')
        setSearchResults([])
    }, [])

    // ── Device GPS ───────────────────────────────────────────────────────────
    const useCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by your browser.')
            return
        }
        setIsGeolocating(true)
        setGeoError(null)
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude: lat, longitude: lng } = pos.coords
                setPendingLat(lat)
                setPendingLng(lng)
                setCenterLat(lat)
                setCenterLng(lng)
                setCenterZoom(14)
                reverseGeocode(lat, lng)
                setIsGeolocating(false)
            },
            err => {
                setIsGeolocating(false)
                if (err.code === err.PERMISSION_DENIED) {
                    setGeoError('Location access was denied. Please allow it in your browser settings.')
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setGeoError('Location unavailable. Try searching manually.')
                } else {
                    setGeoError('Could not get your location. Try searching manually.')
                }
            },
            { timeout: 10000 }
        )
    }, [reverseGeocode])

    // ── Open / close ─────────────────────────────────────────────────────────
    const openPicker = useCallback(() => {
        setPendingLat(value?.lat ?? null)
        setPendingLng(value?.lng ?? null)
        setPendingRadius(value ? RADIUS_PRESETS[closestPresetIdx(value.radius)] : 1000)
        setPendingName(value?.name ?? '')
        if (value) {
            setCenterLat(value.lat)
            setCenterLng(value.lng)
            setCenterZoom(10)
        } else {
            setCenterLat(20)
            setCenterLng(0)
            setCenterZoom(2)
        }
        setSearchQuery('')
        setSearchResults([])
        setGeoError(null)
        setIsOpen(true)
    }, [value])

    const handleConfirm = useCallback(() => {
        if (pendingLat !== null && pendingLng !== null) {
            onChange({ lat: pendingLat, lng: pendingLng, radius: pendingRadius, name: pendingName })
        }
        setIsOpen(false)
    }, [pendingLat, pendingLng, pendingRadius, pendingName, onChange])

    const handleClear = useCallback(() => {
        onChange(null)
        setIsOpen(false)
    }, [onChange])

    const sliderIdx = closestPresetIdx(pendingRadius)

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Summary / toggle ── */}
            {value ? (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openPicker}
                        className="flex-1 flex items-center gap-2 px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors text-left min-w-0"
                    >
                        <svg className="w-4 h-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span className="truncate">{value.name || `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`}</span>
                        <span className="shrink-0 text-xs text-blue-500">· within {formatRadius(value.radius)}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        title="Clear location"
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={openPicker}
                    className="w-full flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Add location on map
                </button>
            )}

            {/* ── Expanded picker ── */}
            {isOpen && (
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm">

                    {/* Search bar */}
                    <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Search for a place…"
                                    className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                />
                                {isSearching && (
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={useCurrentLocation}
                                disabled={isGeolocating}
                                title={isGeolocating ? 'Locating…' : 'Use my current location'}
                                className={`p-1.5 border rounded-lg transition-all shrink-0 ${isGeolocating
                                        ? 'border-blue-400 bg-blue-50 text-blue-500 animate-pulse cursor-wait'
                                        : 'border-gray-300 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-400'
                                    }`}
                            >
                                {isGeolocating ? (
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="3" strokeWidth={2} />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                                        <circle cx="12" cy="12" r="9" strokeWidth={2} strokeDasharray="4 2" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Geolocation error */}
                        {geoError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {geoError}
                            </p>
                        )}

                        {/* Search results — inline to avoid z-index / overflow clipping */}
                        {searchResults.length > 0 && (
                            <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                {searchResults.map(r => (
                                    <button
                                        key={r.place_id}
                                        type="button"
                                        onClick={() => selectResult(r)}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                    >
                                        {r.display_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="relative">
                        {pendingLat === null && (
                            <div className="absolute inset-0 z-10 flex items-end justify-center pb-4 pointer-events-none">
                                <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                                    Click the map to pin a location
                                </span>
                            </div>
                        )}
                        <LocationPickerMap
                            markerLat={pendingLat}
                            markerLng={pendingLng}
                            radius={pendingRadius}
                            centerLat={centerLat}
                            centerLng={centerLng}
                            centerZoom={centerZoom}
                            onMapClick={handleMapClick}
                        />
                    </div>

                    {/* Controls */}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-3">
                        {/* Radius slider */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-600">Location accuracy</label>
                                <span className="text-xs font-semibold text-blue-600">{formatRadius(pendingRadius)}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={RADIUS_PRESETS.length - 1}
                                step={1}
                                value={sliderIdx}
                                onChange={e => setPendingRadius(RADIUS_PRESETS[parseInt(e.target.value)])}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>50 m</span>
                                <span>50 km</span>
                            </div>
                        </div>

                        {/* Location display name */}
                        <input
                            type="text"
                            value={pendingName}
                            onChange={e => setPendingName(e.target.value)}
                            placeholder={isReverseGeocoding ? 'Looking up name…' : 'Location name (optional)'}
                            disabled={isReverseGeocoding}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        />

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={pendingLat === null}
                                className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
