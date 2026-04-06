'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'

// Client-side component for advanced filtering
export default function HousingFilters({ initialHousings, cameras, manufacturers, lenses, ports }: {
    initialHousings: any[],
    cameras: any[],
    manufacturers: any[],
    lenses: any[],
    ports: any[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Read filter state from URL
    const cameraBrand = searchParams.get('cameraBrand') ?? ''
    const cameraModel = searchParams.get('cameraModel') ?? ''
    const lensName = searchParams.get('lens') ?? ''
    const housingName = searchParams.get('housing') ?? ''
    const portName = searchParams.get('port') ?? ''

    // Write one or more params at once, clearing downstream keys as needed
    function setParams(updates: Record<string, string>) {
        const params = new URLSearchParams(searchParams.toString())
        // Key order defines the selection cascade; clearing a key clears everything after it
        const cascade = ['cameraBrand', 'cameraModel', 'lens', 'housing', 'port']
        const firstChanged = cascade.findIndex(k => k in updates)

        // Special case: when only the lens changes, housing is always still compatible
        // (it's filtered by camera, not lens). Only clear port if the new lens is
        // incompatible with the currently selected port.
        if (firstChanged === 2 && Object.keys(updates).length === 1 && 'lens' in updates) {
            Object.entries(updates).forEach(([k, v]) => {
                if (v) params.set(k, v)
                else params.delete(k)
            })
            const newLensName = updates['lens']
            if (!newLensName) {
                // Lens was cleared — port requires a lens, so clear it too
                params.delete('port')
            } else if (portName && selectedHousing) {
                const newLens = lenses.find((l: any) => l.name === newLensName) ?? null
                const portStillValid = newLens && ports.some((p: any) =>
                    p.name === portName &&
                    p.housingMountId === selectedHousing.housingMount?.id &&
                    p.lens?.some((l: any) => l.id === newLens.id)
                )
                if (!portStillValid) params.delete('port')
            }
            router.replace(`/?${params.toString()}`, { scroll: false })
            return
        }

        // Default: clear all keys downstream of the first changed key
        cascade.slice(firstChanged + 1).forEach(k => {
            if (!(k in updates)) params.delete(k)
        })
        Object.entries(updates).forEach(([k, v]) => {
            if (v) params.set(k, v)
            else params.delete(k)
        })
        router.replace(`/?${params.toString()}`, { scroll: false })
    }

    // Derived selections
    const uniqueCameraBrands = useMemo(() =>
        Array.from(new Set(cameras.map((c: any) => c.brand.name))).sort() as string[],
        [cameras]
    )

    const availableCameraModels = useMemo(() =>
        cameraBrand
            ? cameras.filter((c: any) => c.brand.name === cameraBrand).sort((a: any, b: any) => a.name.localeCompare(b.name))
            : [],
        [cameras, cameraBrand]
    )

    const selectedCamera = useMemo(() =>
        cameraModel ? cameras.find((c: any) => c.name === cameraModel) ?? null : null,
        [cameras, cameraModel]
    )

    const isFixedLens = selectedCamera?.interchangeableLens === false
    const isFullSystem = !!(selectedCamera?.canBeUsedWithoutAHousing && selectedCamera?.interchangeableLens === false)
    const canUseWithoutHousing = selectedCamera?.canBeUsedWithoutAHousing === true
    const usingWithoutHousing = canUseWithoutHousing && !housingName

    const availableLenses = useMemo(() =>
        selectedCamera?.cameraMount
            ? lenses.filter((l: any) => l.cameraMountId === selectedCamera.cameraMount.id).sort((a: any, b: any) => a.name.localeCompare(b.name))
            : [],
        [lenses, selectedCamera]
    )

    const availableHousings = useMemo(() =>
        selectedCamera
            ? initialHousings.filter((h: any) => h.cameraId === selectedCamera.id).sort((a: any, b: any) => a.name.localeCompare(b.name))
            : [],
        [initialHousings, selectedCamera]
    )

    const selectedLens = useMemo(() =>
        lensName ? lenses.find((l: any) => l.name === lensName) ?? null : null,
        [lenses, lensName]
    )

    const selectedHousing = useMemo(() =>
        housingName ? initialHousings.find((h: any) => h.name === housingName) ?? null : null,
        [initialHousings, housingName]
    )

    const isFixedPort = selectedHousing?.interchangeablePort === false

    const selectedPort = useMemo(() =>
        portName ? ports.find((p: any) => p.name === portName) ?? null : null,
        [ports, portName]
    )

    const availablePorts = useMemo(() => {
        if (!selectedHousing?.housingMount) return []
        if (isFixedLens) {
            return ports
                .filter((port: any) => port.housingMountId === selectedHousing.housingMount.id)
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
        }
        if (!selectedLens) return []
        return ports
            .filter((port: any) =>
                port.housingMountId === selectedHousing.housingMount.id &&
                port.lens?.some((l: any) => l.id === selectedLens.id)
            )
            .filter((port: any, index: number, self: any[]) =>
                index === self.findIndex((p: any) => p.name === port.name)
            )
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
    }, [ports, selectedHousing, selectedLens, isFixedLens])

    // Compute valid combinations from current URL selections
    const filteredCombinations = useMemo(() => {
        const combinations: any[] = []
        initialHousings.forEach((housing: any) => {
            if (cameraBrand && housing.Camera?.brand.name !== cameraBrand) return
            if (cameraModel && housing.Camera?.name !== cameraModel) return
            if (housingName && housing.name !== housingName) return

            const camera = housing.Camera
            if (!camera) return
            const cameraWithImageInfo = cameras.find((c: any) => c.id === camera.id) || camera
            const isFixed = camera.interchangeableLens === false
            const isPortFixed = housing.interchangeablePort === false

            const makeCombination = (lens: any, port: any) => {
                const portWithImageInfo = port ? (ports.find((p: any) => p.id === port.id) || port) : null
                return {
                    id: `${camera.id}-${lens?.id ?? 'nolens'}-${housing.id}-${port?.id ?? 'noport'}`,
                    camera: cameraWithImageInfo,
                    lens,
                    housing,
                    port: portWithImageInfo,
                    totalPrice: housing.priceAmount ? Number(housing.priceAmount) : 0,
                    currency: housing.priceCurrency || 'USD'
                }
            }

            const lensesToUse = isFixed
                ? [null]
                : lenses.filter((lens: any) =>
                    lens.cameraMountId === camera.cameraMount?.id &&
                    (!lensName || lens.name === lensName)
                )

            lensesToUse.forEach((lens: any) => {
                if (isPortFixed) {
                    if (!portName) combinations.push(makeCombination(lens, null))
                } else {
                    // Use the global ports list filtered by housing mount — same logic as the port dropdown.
                    // This handles ports that share a mount type across multiple housings.
                    const compatiblePorts = ports.filter((port: any) =>
                        port.housingMountId === housing.housingMount?.id &&
                        (isFixed || port.lens?.some((l: any) => l.id === lens?.id)) &&
                        (!portName || port.name === portName)
                    )
                    compatiblePorts.forEach((port: any) => combinations.push(makeCombination(lens, port)))
                }
            })
        })
        return combinations
    }, [initialHousings, cameras, lenses, ports, cameraBrand, cameraModel, lensName, housingName, portName])

    const hasActiveFilters = !!(cameraBrand || cameraModel || lensName || housingName || portName)

    // ── System summary computations ─────────────────────────────────────────
    const maxDepth = useMemo(() => {
        if (!selectedCamera) return null
        if (!selectedHousing) {
            // Using without housing — depth is limited by the camera itself
            return selectedCamera.depthRating ?? null
        }
        const housingDepth: number | null = selectedHousing.depthRating ?? null
        if (!selectedPort) return housingDepth
        const portDepth: number | null = (selectedPort as any).depthRating ?? null
        if (housingDepth === null && portDepth === null) return null
        if (housingDepth === null) return portDepth
        if (portDepth === null) return housingDepth
        return Math.min(housingDepth, portDepth)
    }, [selectedCamera, selectedHousing, selectedPort])

    const depthSource = useMemo(() => {
        if (!selectedHousing) return 'Rated for use without a housing'
        if (!selectedPort) return 'Rated depth of the housing'
        const hd: number | null = selectedHousing.depthRating ?? null
        const pd: number | null = (selectedPort as any).depthRating ?? null
        if (hd !== null && pd !== null) {
            return hd <= pd ? 'Limited by housing' : 'Limited by port'
        }
        return 'Housing & port combination'
    }, [selectedHousing, selectedPort])

    const totalPrice = useMemo(() => {
        let total = 0
        if (selectedCamera?.priceAmount) total += Number(selectedCamera.priceAmount)
        if (selectedLens?.priceAmount) total += Number(selectedLens.priceAmount)
        if (selectedHousing?.priceAmount) total += Number(selectedHousing.priceAmount)
        if (selectedPort?.priceAmount) total += Number(selectedPort.priceAmount)
        return total
    }, [selectedCamera, selectedLens, selectedHousing, selectedPort])

    const relevantReviews = useMemo((): any[] => {
        if ((selectedHousing as any)?.rigReviews?.length) return (selectedHousing as any).rigReviews
        if (usingWithoutHousing && (selectedCamera as any)?.rigReviews?.length) return (selectedCamera as any).rigReviews
        return []
    }, [selectedHousing, selectedCamera, usingWithoutHousing])

    const rigRating = useMemo(() => {
        if (!relevantReviews.length) return null
        const sum = relevantReviews.reduce((acc, r) =>
            acc + (r.ratingOpticalQuality + r.ratingReliability + r.ratingEaseOfUse) / 3, 0)
        return sum / relevantReviews.length
    }, [relevantReviews])

    const isRigComplete = usingWithoutHousing || (!!housingName && (isFixedPort || !!portName))

    // Animated depth counter
    const [displayedDepth, setDisplayedDepth] = useState<number | null>(maxDepth)
    const animFrameRef = useRef<number | null>(null)
    useEffect(() => {
        if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
        if (maxDepth === null) { setDisplayedDepth(null); return }
        const start = displayedDepth ?? maxDepth
        if (start === maxDepth) return
        const duration = 400
        const startTime = performance.now()
        const animate = (now: number) => {
            const t = Math.min((now - startTime) / duration, 1)
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            setDisplayedDepth(Math.round(start + (maxDepth - start) * eased))
            if (t < 1) animFrameRef.current = requestAnimationFrame(animate)
            else setDisplayedDepth(maxDepth)
        }
        animFrameRef.current = requestAnimationFrame(animate)
        return () => { if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxDepth])
    // ────────────────────────────────────────────────────────────────────────

    // ── Review carousel ─────────────────────────────────────────────────────
    const sortedReviews = useMemo(() => {
        return [...relevantReviews]
            .filter((r: any) => r.id !== undefined)
            .sort((a: any, b: any) => {
                const score = (r: any) =>
                    ((r.reviewPhotos?.length ?? 0) > 0 ? 2 : 0) +
                    (r.comment ? 1 : 0) +
                    (r.ratingOpticalQuality + r.ratingReliability + r.ratingEaseOfUse) / 15
                return score(b) - score(a)
            })
    }, [relevantReviews])

    const [reviewIdx, setReviewIdx] = useState(0)
    useEffect(() => { setReviewIdx(0) }, [selectedCamera?.id, selectedHousing?.id])

    // ── Gallery ──────────────────────────────────────────────────────────────
    const [galleryPhotos, setGalleryPhotos] = useState<Array<{ id: number; src: string; title: string | null; location: string | null }>>([])
    const [galleryLoading, setGalleryLoading] = useState(false)

    const galleryUrl = useMemo(() => {
        if (!selectedCamera) return null
        const p = new URLSearchParams({ camera: selectedCamera.slug })
        if (selectedHousing) {
            p.set('housing', selectedHousing.slug)
            if (selectedLens?.slug) p.set('lens', selectedLens.slug)
            if (selectedPort?.slug) p.set('port', selectedPort.slug)
        }
        return `/gallery?${p.toString()}`
    }, [selectedCamera, selectedHousing, selectedLens, selectedPort])

    useEffect(() => {
        if (!selectedCamera) { setGalleryPhotos([]); return }
        setGalleryLoading(true)
        const params = new URLSearchParams({ camera: selectedCamera.slug })
        if (selectedHousing) params.set('housing', selectedHousing.slug)
        fetch(`/api/gallery?${params.toString()}`)
            .then(r => r.json())
            .then(data => setGalleryPhotos(data.photos ?? []))
            .catch(() => setGalleryPhotos([]))
            .finally(() => setGalleryLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCamera?.id, selectedHousing?.id])
    // ────────────────────────────────────────────────────────────────────────

    // ── Optical Summary ──────────────────────────────────────────────────────
    const opticalSummary = useMemo(() => {
        // For fixed-lens cameras the optical properties live on the camera itself;
        // for interchangeable-lens cameras they come from the selected lens.
        const opticalSource: any = isFixedLens ? selectedCamera : selectedLens
        if (!opticalSource?.focalLengthTele) return null

        const sensorW: number | null = (selectedCamera as any)?.sensorWidth ?? null
        const sensorH: number | null = (selectedCamera as any)?.sensorHeight ?? null
        const isPrime: boolean = opticalSource.focalLengthWide == null
        const fWide: number = isPrime ? opticalSource.focalLengthTele : opticalSource.focalLengthWide!
        const fTele: number = opticalSource.focalLengthTele
        const mfdWide: number | null = opticalSource.minimumFocusDistanceWide ?? null   // metres
        const mfdTele: number | null = isPrime ? null : (opticalSource.minimumFocusDistanceTele ?? null)
        const isFlatPort: boolean = !!(selectedPort as any)?.isFlatPort

        // FOV in degrees for a given sensor dimension (mm) and focal length (mm)
        const fovDeg = (sensorDim: number, fl: number): number =>
            2 * Math.atan(sensorDim / (2 * fl)) * (180 / Math.PI)

        // Effective FOV through a flat port — Snell's law, n_water = 1.33
        // n_water × sin(θ_water) = n_air × sin(θ_air)  →  θ_water = asin(sin(θ_air) / 1.33)
        const fovEffective = (fovAirDeg: number): number => {
            const halfRad = (fovAirDeg / 2) * (Math.PI / 180)
            const sinWater = Math.sin(halfRad) / 1.33
            if (sinWater >= 1) return fovAirDeg
            return 2 * Math.asin(sinWater) * (180 / Math.PI)
        }

        const fovWideH = sensorW ? fovDeg(sensorW, fWide) : null
        const fovWideV = sensorH ? fovDeg(sensorH, fWide) : null
        const fovTeleH = (!isPrime && sensorW) ? fovDeg(sensorW, fTele) : null
        const fovTeleV = (!isPrime && sensorH) ? fovDeg(sensorH, fTele) : null

        return {
            isPrime,
            fWide, fTele,
            fovWideH, fovWideV,
            fovTeleH, fovTeleV,
            fovEffWideH: (isFlatPort && fovWideH !== null) ? fovEffective(fovWideH) : null,
            fovEffWideV: (isFlatPort && fovWideV !== null) ? fovEffective(fovWideV) : null,
            fovEffTeleH: (isFlatPort && fovTeleH !== null) ? fovEffective(fovTeleH) : null,
            fovEffTeleV: (isFlatPort && fovTeleV !== null) ? fovEffective(fovTeleV) : null,
            isFlatPort,
            mfdWide,
            mfdTele,
            maximumMagnification: opticalSource.maximumMagnification ?? null,
        }
    }, [selectedCamera, selectedLens, selectedPort, isFixedLens])
    // ────────────────────────────────────────────────────────────────────────

    const clearFilters = () => {
        router.replace('/', { scroll: false })
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Single unified setup card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Card header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Build Your Setup</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Select components step by step to find a compatible underwater rig</p>
                        </div>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Component flow */}
                    <div className="p-6">



                        <div className="flex items-start gap-2 sm:gap-4">

                            {/* Step 1 — Camera */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className={`relative w-full h-48 rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedCamera
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-dashed border-gray-300 bg-gray-50'
                                    }`}>
                                    {selectedCamera ? (
                                        <>
                                            <HousingImage
                                                src={selectedCamera.imageInfo?.src || '/cameras/fallback.png'}
                                                fallback={selectedCamera.imageInfo?.fallback || '/cameras/fallback.png'}
                                                alt={`${selectedCamera.brand.name} ${selectedCamera.name}`}
                                                className="object-contain w-full h-full p-3"
                                            />
                                            <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                                <span className="text-gray-500 text-sm font-bold">1</span>
                                            </div>
                                            <span className="text-xs text-gray-400 text-center px-2">Choose camera</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Camera</div>
                                {/* Camera manufacturer */}
                                <select
                                    value={cameraBrand}
                                    onChange={(e) => setParams({ cameraBrand: e.target.value })}
                                    className="w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white mb-2"
                                >
                                    <option value="">Brand…</option>
                                    {uniqueCameraBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                {/* Camera model */}
                                <select
                                    value={cameraModel}
                                    onChange={(e) => setParams({ cameraModel: e.target.value })}
                                    disabled={!cameraBrand}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!cameraBrand ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">{cameraBrand ? 'Model…' : 'Select brand first'}</option>
                                    {availableCameraModels.map(camera => (
                                        <option key={camera.id} value={camera.name}>{camera.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 1→2 — hidden when fixed-lens */}
                            <div
                                className="flex-none overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isFixedLens ? 0 : '2rem', opacity: isFixedLens ? 0 : 1 }}
                            >
                                <div className="flex items-center" style={{ paddingTop: 'calc(96px - 0.625rem)' }}>
                                    <svg className={`w-5 h-5 flex-shrink-0 ${selectedCamera ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Step 2 — Lens (slides away for fixed-lens cameras) */}
                            <div
                                className="flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isFixedLens ? 0 : '500px', opacity: isFixedLens ? 0 : 1, pointerEvents: isFixedLens ? 'none' : undefined }}
                            >
                                <div className="flex flex-col items-center">
                                    <div className={`relative w-full h-48 rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedLens
                                        ? 'border-blue-400 bg-blue-50'
                                        : selectedCamera
                                            ? 'border-dashed border-gray-300 bg-gray-50'
                                            : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
                                        }`}>
                                        {selectedLens ? (
                                            <>
                                                <HousingImage
                                                    src={selectedLens.imageInfo?.src || '/lenses/fallback.png'}
                                                    fallback={selectedLens.imageInfo?.fallback || '/lenses/fallback.png'}
                                                    alt={selectedLens.name}
                                                    className="object-contain w-full h-full p-3"
                                                />
                                                <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${selectedCamera ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                                    <span className={`text-sm font-bold ${selectedCamera ? 'text-gray-500' : 'text-gray-300'}`}>2</span>
                                                </div>
                                                <span className={`text-xs text-center px-2 ${selectedCamera ? 'text-gray-400' : 'text-gray-300'}`}>
                                                    {selectedCamera ? 'Choose lens' : 'Camera first'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Lens</div>
                                    <select
                                        value={lensName}
                                        onChange={(e) => setParams({ lens: e.target.value })}
                                        disabled={!cameraModel || availableLenses.length === 0}
                                        className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!cameraModel || availableLenses.length === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!cameraModel ? 'Select camera first' : availableLenses.length === 0 ? 'No compatible lenses' : 'Lens…'}
                                        </option>
                                        {availableLenses.map(lens => (
                                            <option key={lens.id} value={lens.name}>{lens.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Arrow 2→3 — hidden when fixed-lens */}
                            <div
                                className="flex-none overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isFixedLens ? 0 : '2rem', opacity: isFixedLens ? 0 : 1 }}
                            >
                                <div className="flex items-center" style={{ paddingTop: 'calc(96px - 0.625rem)' }}>
                                    <svg className={`w-5 h-5 flex-shrink-0 ${selectedLens ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Step 3 — Housing */}
                            <div
                                className="flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out flex flex-col items-center"
                            >
                                <div className={`relative w-full h-48 rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedHousing
                                    ? 'border-blue-400 bg-blue-50'
                                    : (selectedCamera && (isFixedLens || selectedLens || canUseWithoutHousing))
                                        ? 'border-dashed border-gray-300 bg-gray-50'
                                        : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
                                    }`}>
                                    {selectedHousing ? (
                                        <>
                                            <HousingImage
                                                src={selectedHousing.imageInfo?.src || '/housings/fallback.png'}
                                                fallback={selectedHousing.imageInfo?.fallback || '/housings/fallback.png'}
                                                alt={selectedHousing.name}
                                                className="object-contain w-full h-full p-3"
                                            />
                                            <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${(selectedCamera && (isFixedLens || selectedLens || canUseWithoutHousing)) ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                                <span className={`text-sm font-bold ${(selectedCamera && (isFixedLens || selectedLens || canUseWithoutHousing)) ? 'text-gray-500' : 'text-gray-300'}`}>{isFixedLens ? 2 : 3}</span>
                                            </div>
                                            <span className={`text-xs text-center px-2 ${(selectedCamera && (isFixedLens || selectedLens || canUseWithoutHousing)) ? 'text-gray-400' : 'text-gray-300'}`}>
                                                {(selectedCamera && (isFixedLens || selectedLens || canUseWithoutHousing)) ? 'Choose housing' : isFixedLens ? 'Camera first' : 'Lens first'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Housing</div>
                                <select
                                    value={housingName}
                                    onChange={(e) => setParams({ housing: e.target.value })}
                                    disabled={!cameraModel || (!isFixedLens && !lensName && !canUseWithoutHousing)}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!cameraModel || (!isFixedLens && !lensName && !canUseWithoutHousing)
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">
                                        {!cameraModel
                                            ? 'Select camera first'
                                            : (!isFixedLens && !lensName && !canUseWithoutHousing)
                                                ? 'Select lens first'
                                                : canUseWithoutHousing
                                                    ? 'Use without housing'
                                                    : 'Housing…'}
                                    </option>
                                    {availableHousings.map(housing => (
                                        <option key={housing.id} value={housing.name}>{housing.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 3→4 — hidden when fixed-port or using without housing */}
                            <div
                                className="flex-none overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: (isFixedPort || usingWithoutHousing) ? 0 : '2rem', opacity: (isFixedPort || usingWithoutHousing) ? 0 : 1 }}
                            >
                                <div className="flex items-center" style={{ paddingTop: 'calc(96px - 0.625rem)' }}>
                                    <svg className={`w-5 h-5 flex-shrink-0 ${selectedHousing ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Step 4 — Port (slides away for fixed-port housings or when using without housing) */}
                            <div
                                className="flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: (isFixedPort || usingWithoutHousing) ? 0 : '500px', opacity: (isFixedPort || usingWithoutHousing) ? 0 : 1, pointerEvents: (isFixedPort || usingWithoutHousing) ? 'none' : undefined }}
                            >
                                <div className="flex flex-col items-center">
                                    <div className={`relative w-full h-48 rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedPort
                                        ? 'border-blue-400 bg-blue-50'
                                        : selectedHousing
                                            ? 'border-dashed border-gray-300 bg-gray-50'
                                            : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
                                        }`}>
                                        {selectedPort ? (
                                            <>
                                                <HousingImage
                                                    src={selectedPort.imageInfo?.src || '/ports/fallback.png'}
                                                    fallback={selectedPort.imageInfo?.fallback || '/ports/fallback.png'}
                                                    alt={selectedPort.name}
                                                    className="object-contain w-full h-full p-3"
                                                />
                                                <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${selectedHousing ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                                    <span className={`text-sm font-bold ${selectedHousing ? 'text-gray-500' : 'text-gray-300'}`}>{isFixedLens ? 3 : 4}</span>
                                                </div>
                                                <span className={`text-xs text-center px-2 ${selectedHousing ? 'text-gray-400' : 'text-gray-300'}`}>
                                                    {selectedHousing ? 'Choose port' : 'Housing first'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Port</div>
                                    <select
                                        value={portName}
                                        onChange={(e) => setParams({ port: e.target.value })}
                                        disabled={!housingName || availablePorts.length === 0}
                                        className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!housingName || availablePorts.length === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!housingName ? 'Select housing first' : availablePorts.length === 0 ? 'No compatible ports' : 'Port…'}
                                        </option>
                                        {availablePorts.map(port => (
                                            <option key={port.id} value={port.name}>{port.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Summary section (inside card) ────────────────────── */}
                    {selectedCamera && (
                        <>
                            <div className="border-t border-gray-100">
                                <div className="px-6 pt-5 pb-1">
                                    <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

                                    {/* Left — Price Breakdown */}
                                    <div className="px-6 pt-4 pb-5">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Price Breakdown</h4>
                                        <div className="space-y-3">

                                            {/* Camera */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-14 shrink-0">Camera</span>
                                                    <Link
                                                        href={`/cameras/${selectedCamera.brand.slug}/${selectedCamera.slug}`}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 truncate transition-colors"
                                                    >
                                                        {selectedCamera.name}
                                                    </Link>
                                                </div>
                                                {selectedCamera.priceAmount
                                                    ? <span className="text-sm font-medium text-gray-800 tabular-nums pl-4 shrink-0">${Number(selectedCamera.priceAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                                    : <span className="text-xs text-gray-400 pl-4 shrink-0">&mdash;</span>
                                                }
                                            </div>

                                            {/* Lens */}
                                            {!isFixedLens && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedLens ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
                                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-14 shrink-0">Lens</span>
                                                        {selectedLens?.manufacturer?.slug ? (
                                                            <Link
                                                                href={`/lenses/${selectedLens.manufacturer.slug}/${selectedLens.slug}`}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 truncate transition-colors"
                                                            >
                                                                {selectedLens.name}
                                                            </Link>
                                                        ) : (
                                                            <span className={`text-sm truncate ${selectedLens ? 'text-gray-600' : 'text-gray-300 italic'}`}>
                                                                {selectedLens ? selectedLens.name : 'Not selected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedLens?.priceAmount
                                                        ? <span className="text-sm font-medium text-gray-800 tabular-nums pl-4 shrink-0">${Number(selectedLens.priceAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                                        : <span className="text-xs text-gray-400 pl-4 shrink-0">{selectedLens ? '\u2014' : 'Not selected'}</span>
                                                    }
                                                </div>
                                            )}

                                            {/* Housing */}
                                            {!usingWithoutHousing && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedHousing ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
                                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-14 shrink-0">Housing</span>
                                                        {selectedHousing ? (
                                                            <Link
                                                                href={`/housings/${selectedHousing.manufacturer.slug}/${selectedHousing.slug}`}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 truncate transition-colors"
                                                            >
                                                                {selectedHousing.name}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-sm text-gray-300 italic">Not selected</span>
                                                        )}
                                                    </div>
                                                    {selectedHousing?.priceAmount
                                                        ? <span className="text-sm font-medium text-gray-800 tabular-nums pl-4 shrink-0">${Number(selectedHousing.priceAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                                        : <span className="text-xs text-gray-400 pl-4 shrink-0">{selectedHousing ? '\u2014' : 'Not selected'}</span>
                                                    }
                                                </div>
                                            )}

                                            {/* Port */}
                                            {!usingWithoutHousing && !isFixedPort && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedPort ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
                                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-14 shrink-0">Port</span>
                                                        {selectedPort?.manufacturer?.slug ? (
                                                            <Link
                                                                href={`/ports/${selectedPort.manufacturer.slug}`}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 truncate transition-colors"
                                                            >
                                                                {selectedPort.name}
                                                            </Link>
                                                        ) : (
                                                            <span className={`text-sm truncate ${selectedPort ? 'text-gray-600' : 'text-gray-300 italic'}`}>
                                                                {selectedPort ? selectedPort.name : 'Not selected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedPort?.priceAmount
                                                        ? <span className="text-sm font-medium text-gray-800 tabular-nums pl-4">${Number(selectedPort.priceAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                                        : <span className="text-xs text-gray-400 pl-4">{selectedPort ? '\u2014' : 'Not selected'}</span>
                                                    }
                                                </div>
                                            )}

                                            {/* Total */}
                                            {totalPrice > 0 && (
                                                <div className="pt-3 mt-1 border-t border-gray-100 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-900">Total</span>
                                                    <span className="text-lg font-bold text-gray-900 tabular-nums">
                                                        ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                        <span className="text-xs font-normal text-gray-400 ml-1">USD</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right — Max Depth */}
                                    <div className="px-6 pt-4 pb-5 flex flex-col">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Max Depth</h4>
                                        {maxDepth !== null ? (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                                                <div className="flex items-end gap-1">
                                                    <span className="text-6xl font-bold text-blue-700 tabular-nums leading-none">{displayedDepth ?? maxDepth}</span>
                                                    <span className="text-2xl font-semibold text-blue-400 mb-1">m</span>
                                                </div>
                                                <div className="w-full">
                                                    <div className="w-full bg-blue-50 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-700 transition-all duration-500"
                                                            style={{ width: `${Math.min(((displayedDepth ?? maxDepth) / 120) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-xs text-gray-300">0 m</span>
                                                        <span className="text-xs text-gray-300">120 m</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 text-center">{depthSource}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
                                                <span className="text-4xl text-gray-200 font-light">&mdash;</span>
                                                <p className="text-xs text-gray-400">No depth rating available</p>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                            {/* ── Optical ─────────────────────────────────────────────── */}
                            <div className="border-t border-gray-100 px-6 py-5">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Optical</h4>

                                {(selectedCamera as any)?.megapixels || opticalSummary ? (
                                    <div className="space-y-3.5">

                                        {/* ── Sensor info ── */}
                                        {(selectedCamera as any)?.megapixels && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-36 shrink-0">Megapixels</span>
                                                </div>
                                                <div className="flex items-baseline gap-2 text-right">
                                                    <span className="text-sm font-medium text-gray-800 tabular-nums">{(selectedCamera as any).megapixels} MP</span>
                                                    {(selectedCamera as any).sensorWidth && (selectedCamera as any).sensorHeight && (
                                                        <span className="text-xs text-gray-400">
                                                            {(selectedCamera as any).sensorWidth} × {(selectedCamera as any).sensorHeight} mm
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {opticalSummary && (
                                            <>
                                                {(selectedCamera as any)?.megapixels && <div className="border-t border-gray-50 my-0.5" />}

                                                {/* ── FOV in air ── */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Field of view (air)</span>
                                                    </div>
                                                    {opticalSummary.fovWideH !== null ? (
                                                        <div className="ml-5 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-400">
                                                                    {opticalSummary.isPrime ? `${opticalSummary.fTele} mm` : `Wide  ${opticalSummary.fWide} mm`}
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-700 tabular-nums">
                                                                    {opticalSummary.fovWideH.toFixed(1)}° × {opticalSummary.fovWideV?.toFixed(1) ?? '—'}°
                                                                </span>
                                                            </div>
                                                            {!opticalSummary.isPrime && opticalSummary.fovTeleH !== null && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400">Tele  {opticalSummary.fTele} mm</span>
                                                                    <span className="text-sm font-medium text-gray-700 tabular-nums">
                                                                        {opticalSummary.fovTeleH.toFixed(1)}° × {opticalSummary.fovTeleV?.toFixed(1) ?? '—'}°
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="ml-5 text-xs text-gray-300 italic">No sensor dimensions — add them to see FOV</p>
                                                    )}
                                                </div>

                                                {/* ── FOV effective through flat port ── */}
                                                {opticalSummary.isFlatPort && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Field of view (water)</span>
                                                            <span className="text-xs text-gray-300">flat port • n=1.33</span>
                                                        </div>
                                                        {opticalSummary.fovEffWideH !== null ? (
                                                            <div className="ml-5 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400">
                                                                        {opticalSummary.isPrime ? `${opticalSummary.fTele} mm` : `Wide  ${opticalSummary.fWide} mm`}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-cyan-700 tabular-nums">
                                                                        {opticalSummary.fovEffWideH.toFixed(1)}° × {opticalSummary.fovEffWideV?.toFixed(1) ?? '—'}°
                                                                    </span>
                                                                </div>
                                                                {!opticalSummary.isPrime && opticalSummary.fovEffTeleH !== null && (
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs text-gray-400">Tele  {opticalSummary.fTele} mm</span>
                                                                        <span className="text-sm font-medium text-cyan-700 tabular-nums">
                                                                            {opticalSummary.fovEffTeleH.toFixed(1)}° × {opticalSummary.fovEffTeleV?.toFixed(1) ?? '—'}°
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="ml-5 text-xs text-gray-300 italic">No sensor dimensions available</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Min. focus distance ── */}
                                                {opticalSummary.mfdWide !== null && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Min. focus distance</span>
                                                        </div>
                                                        <div className="ml-5 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-400">
                                                                    {opticalSummary.isPrime ? `${opticalSummary.fTele} mm` : `Wide  ${opticalSummary.fWide} mm`}
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-700 tabular-nums">
                                                                    {opticalSummary.mfdWide.toFixed(2)} m
                                                                </span>
                                                            </div>
                                                            {!opticalSummary.isPrime && opticalSummary.mfdTele !== null && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-400">Tele  {opticalSummary.fTele} mm</span>
                                                                    <span className="text-sm font-medium text-gray-700 tabular-nums">
                                                                        {opticalSummary.mfdTele.toFixed(2)} m
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Max magnification ── */}
                                                {opticalSummary.maximumMagnification !== null && (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-36 shrink-0">Max magnification</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800 tabular-nums">
                                                            {opticalSummary.maximumMagnification.toFixed(2)}×
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {!opticalSummary && (
                                            <p className="text-xs text-gray-400 italic">
                                                {isFixedLens
                                                    ? 'No optical data available for this camera'
                                                    : 'Select a lens to see FOV, focus distance, and magnification'}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">
                                        {isFixedLens
                                            ? 'Select a camera to see optical details'
                                            : 'Select a camera and lens to see optical details'}
                                    </p>
                                )}
                            </div>
                            {/* ──────────────────────────────────────────────────────── */}

                            {/* Reviews */}
                            <div className="border-t border-gray-100 px-6 py-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-700">Reviews</h3>
                                    {isRigComplete && selectedCamera && (
                                        <Link
                                            href={(() => {
                                                if (usingWithoutHousing) return `/rigs?camera=${selectedCamera.slug}#reviews`
                                                const p = new URLSearchParams({ camera: selectedCamera.slug, housing: selectedHousing!.slug })
                                                if (selectedLens?.slug) p.set('lens', selectedLens.slug)
                                                if (selectedPort?.slug) p.set('port', selectedPort.slug)
                                                return `/rigs?${p.toString()}#reviews`
                                            })()}
                                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                                        >
                                            View all
                                        </Link>
                                    )}
                                </div>
                                {sortedReviews.length > 0 ? (
                                    <>
                                        {/* Aggregate score */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-xl font-bold text-gray-900 tabular-nums">{rigRating?.toFixed(1)}</span>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <span key={n} className={`text-base ${n <= Math.round(rigRating ?? 0) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-400">({sortedReviews.length} review{sortedReviews.length !== 1 ? 's' : ''})</span>
                                        </div>
                                        {/* Rating bars */}
                                        <div className="space-y-1.5 mb-4">
                                            {([
                                                { label: 'Optical', key: 'ratingOpticalQuality' },
                                                { label: 'Reliability', key: 'ratingReliability' },
                                                { label: 'Ease of use', key: 'ratingEaseOfUse' },
                                            ]).map(({ label, key }) => {
                                                const avg = sortedReviews.reduce((s: number, r: any) => s + (r[key] as number), 0) / sortedReviews.length
                                                return (
                                                    <div key={label} className="flex items-center gap-2 text-xs">
                                                        <span className="w-20 text-gray-500 shrink-0">{label}</span>
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(avg / 5) * 100}%` }} />
                                                        </div>
                                                        <span className="w-7 text-right text-gray-600 font-medium tabular-nums">{avg.toFixed(1)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Carousel card */}
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            {(() => {
                                                const r = sortedReviews[reviewIdx] as any
                                                const avgRating = (r.ratingOpticalQuality + r.ratingReliability + r.ratingEaseOfUse) / 3
                                                return (
                                                    <>
                                                        <div className="flex items-start gap-2.5 mb-2">
                                                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                                                {(r.user?.name ?? '?')[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                    <span className="text-xs font-medium text-gray-900">{r.user?.name ?? 'Anonymous'}</span>
                                                                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                                                                </div>
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                    {[1, 2, 3, 4, 5].map(n => (
                                                                        <span key={n} className={`text-sm ${n <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {r.comment && (
                                                            <p className="text-xs text-gray-700 leading-relaxed mb-3 line-clamp-3">{r.comment}</p>
                                                        )}
                                                        {r.reviewPhotos?.length > 0 && (
                                                            <div className="flex gap-1.5 mb-3">
                                                                {(r.reviewPhotos as string[]).slice(0, 3).map((src, i) => (
                                                                    <div key={i} className="h-14 w-14 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={src} alt="" className="h-full w-full object-cover" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                                                            <span>Optical {r.ratingOpticalQuality}/5</span>
                                                            <span>Reliability {r.ratingReliability}/5</span>
                                                            <span>Ease {r.ratingEaseOfUse}/5</span>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                        {/* Navigation */}
                                        {sortedReviews.length > 1 && (
                                            <div className="flex items-center justify-between mt-3">
                                                <button
                                                    onClick={() => setReviewIdx(i => (i - 1 + sortedReviews.length) % sortedReviews.length)}
                                                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <span className="text-xs text-gray-400 tabular-nums">{reviewIdx + 1} / {sortedReviews.length}</span>
                                                <button
                                                    onClick={() => setReviewIdx(i => (i + 1) % sortedReviews.length)}
                                                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400">No reviews yet for this {selectedHousing ? 'housing' : 'camera'}</p>
                                )}
                            </div>

                            {/* Sample Photos */}
                            <div className="border-t border-gray-100 px-6 py-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-700">Sample Photos</h3>
                                    {galleryUrl && (
                                        <Link href={galleryUrl} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">
                                            View all →
                                        </Link>
                                    )}
                                </div>
                                {galleryLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                    </div>
                                ) : galleryPhotos.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {galleryPhotos.map(photo => (
                                            <Link key={photo.id} href={galleryUrl ?? '/gallery'}>
                                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 group relative">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={photo.src}
                                                        alt={photo.title ?? ''}
                                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    {photo.location && (
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-white text-xs truncate">📍 {photo.location}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l2-2a3 3 0 014.24 0L22 16M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs text-gray-400">No photos yet for this setup</p>
                                        {isRigComplete && galleryUrl && (
                                            <Link href={galleryUrl} className="text-xs text-blue-500 hover:text-blue-700 mt-1 transition-colors">
                                                Be the first to upload →
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>


                        </>
                    )}

                    {/* CTA — always visible; active when rig is complete */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                        {canUseWithoutHousing && usingWithoutHousing && (
                            <p className="text-xs text-gray-400 text-center mb-3">
                                This camera can be used without a housing. Add a compatible housing above to increase depth rating.
                            </p>
                        )}
                        {isRigComplete && selectedCamera ? (
                            <Link
                                href={(() => {
                                    if (usingWithoutHousing) return `/rigs?camera=${selectedCamera.slug}`
                                    const p = new URLSearchParams({ camera: selectedCamera.slug, housing: selectedHousing!.slug })
                                    if (selectedLens?.slug) p.set('lens', selectedLens.slug)
                                    if (selectedPort?.slug) p.set('port', selectedPort.slug)
                                    return `/rigs?${p.toString()}`
                                })()}
                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                View Full Details
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        ) : (
                            <div className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-400 text-sm font-medium px-6 py-3 rounded-lg cursor-default select-none">
                                {!selectedCamera
                                    ? 'Select a camera to get started'
                                    : (!isFixedLens && !lensName)
                                        ? 'Select a lens to continue'
                                        : (!usingWithoutHousing && !housingName)
                                            ? 'Select a housing to continue'
                                            : 'Select a port to continue'}
                                <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {/* ─────────────────────────────────────────────────────── */}

                </div>
            </div>
        </div>
    )
}