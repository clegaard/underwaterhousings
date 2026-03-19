'use client'

import { useMemo } from 'react'
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
        // Clear all keys downstream of the first changed key
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
                    const compatiblePorts = housing.ports.filter((port: any) =>
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
                            <div className="flex-1 flex flex-col items-center">
                                <div className={`relative w-full h-48 rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedHousing
                                    ? 'border-blue-400 bg-blue-50'
                                    : (selectedCamera && (isFixedLens || selectedLens))
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
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${(selectedCamera && (isFixedLens || selectedLens)) ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                                <span className={`text-sm font-bold ${(selectedCamera && (isFixedLens || selectedLens)) ? 'text-gray-500' : 'text-gray-300'}`}>{isFixedLens ? 2 : 3}</span>
                                            </div>
                                            <span className={`text-xs text-center px-2 ${(selectedCamera && (isFixedLens || selectedLens)) ? 'text-gray-400' : 'text-gray-300'}`}>
                                                {(selectedCamera && (isFixedLens || selectedLens)) ? 'Choose housing' : isFixedLens ? 'Camera first' : 'Lens first'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Housing</div>
                                <select
                                    value={housingName}
                                    onChange={(e) => setParams({ housing: e.target.value })}
                                    disabled={!cameraModel || (!isFixedLens && !lensName)}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!cameraModel || (!isFixedLens && !lensName)
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">
                                        {!cameraModel ? 'Select camera first' : (!isFixedLens && !lensName) ? 'Select lens first' : 'Housing…'}
                                    </option>
                                    {availableHousings.map(housing => (
                                        <option key={housing.id} value={housing.name}>{housing.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 3→4 — hidden when fixed-port */}
                            <div
                                className="flex-none overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isFixedPort ? 0 : '2rem', opacity: isFixedPort ? 0 : 1 }}
                            >
                                <div className="flex items-center" style={{ paddingTop: 'calc(96px - 0.625rem)' }}>
                                    <svg className={`w-5 h-5 flex-shrink-0 ${selectedHousing ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Step 4 — Port (slides away for fixed-port housings) */}
                            <div
                                className="flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isFixedPort ? 0 : '500px', opacity: isFixedPort ? 0 : 1, pointerEvents: isFixedPort ? 'none' : undefined }}
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

                    {/* Footer — shown when all required components are selected and a valid combination exists */}
                    {cameraModel && (isFixedLens || lensName) && housingName && (isFixedPort || portName) && filteredCombinations.length > 0 && filteredCombinations[0] && (
                        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                {filteredCombinations[0].housing.depthRating && (
                                    <span><span className="font-medium text-gray-800">{filteredCombinations[0].housing.depthRating}m</span> depth rating</span>
                                )}
                                {filteredCombinations[0].housing.material && (
                                    <span>{filteredCombinations[0].housing.material}</span>
                                )}
                                {filteredCombinations[0].totalPrice > 0 && (
                                    <span className="font-semibold text-gray-900 text-base">
                                        ${filteredCombinations[0].totalPrice.toLocaleString()} {filteredCombinations[0].currency}
                                    </span>
                                )}
                            </div>
                            <Link
                                href={`/combinations/${filteredCombinations[0].camera.slug}/${filteredCombinations[0].lens?.slug ?? 'none'}/${filteredCombinations[0].housing.slug}/${filteredCombinations[0].port?.id ?? 'none'}`}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                            >
                                View Full Details
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}