'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'

// Types for our filters
type FilterState = {
    cameraManufacturer: string
    cameraModel: string
    lens: string
    port: string
    manufacturer: string
}

// Client-side component for advanced filtering
export default function HousingFilters({ initialHousings, cameras, manufacturers, lenses, ports }: {
    initialHousings: any[],
    cameras: any[],
    manufacturers: any[],
    lenses: any[],
    ports: any[]
}) {
    const [filters, setFilters] = useState<FilterState>({
        cameraManufacturer: '',
        cameraModel: '',
        lens: '',
        port: '',
        manufacturer: ''
    })

    const [filteredCombinations, setFilteredCombinations] = useState<any[]>([])
    const [isFiltering, setIsFiltering] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Get unique camera manufacturers and models
    const uniqueCameraBrands = Array.from(new Set(cameras.map(c => c.brand.name))).sort()
    const availableCameraModels = filters.cameraManufacturer
        ? cameras.filter(c => c.brand.name === filters.cameraManufacturer).sort((a, b) => a.name.localeCompare(b.name))
        : []

    // Get lenses based on selected camera's mount
    const selectedCamera = filters.cameraModel ? cameras.find(c => c.name === filters.cameraModel) : null
    const availableLenses = selectedCamera?.cameraMount
        ? lenses.filter(l => l.cameraMountId === selectedCamera.cameraMount.id).sort((a, b) => a.name.localeCompare(b.name))
        : []

    // Get available ports based on selected housing's mount and selected lens
    // Try to find housing that matches both manufacturer and camera, otherwise just use manufacturer
    const selectedHousing = filters.manufacturer
        ? (selectedCamera
            ? initialHousings.find(h => h.manufacturer.name === filters.manufacturer && h.cameraId === selectedCamera.id)
            : null) || initialHousings.find(h => h.manufacturer.name === filters.manufacturer)
        : null

    const selectedLens = filters.lens ? lenses.find(l => l.name === filters.lens) : null
    const selectedPort = filters.port ? ports.find(p => p.name === filters.port) : null

    // Filter ports that are compatible with the selected housing's mount and lens
    const availablePorts = (selectedHousing?.housingMount && selectedLens)
        ? ports
            .filter(port =>
                port.housingMountId === selectedHousing.housingMount.id &&
                port.lens?.some((l: any) => l.id === selectedLens.id)
            )
            .filter((port, index, self) =>
                // Remove duplicates by port name
                index === self.findIndex(p => p.name === port.name)
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        : []

    // Clear camera model and lens when manufacturer changes
    useEffect(() => {
        if (filters.cameraModel && filters.cameraManufacturer) {
            const selectedCamera = cameras.find(c => c.name === filters.cameraModel)
            if (!selectedCamera || selectedCamera.brand.name !== filters.cameraManufacturer) {
                setFilters(prev => ({ ...prev, cameraModel: '', lens: '' }))
            }
        }
    }, [filters.cameraManufacturer, filters.cameraModel, cameras])

    // Clear lens when camera model changes
    useEffect(() => {
        if (filters.lens && filters.cameraModel) {
            const selectedCamera = cameras.find(c => c.name === filters.cameraModel)
            const selectedLens = lenses.find(l => l.name === filters.lens)
            if (!selectedCamera?.cameraMount || !selectedLens || selectedLens.cameraMountId !== selectedCamera.cameraMount.id) {
                setFilters(prev => ({ ...prev, lens: '', port: '' }))
            }
        }
    }, [filters.cameraModel, filters.lens, cameras, lenses])

    // Clear manufacturer and port when camera model or lens changes
    useEffect(() => {
        if (!filters.cameraModel || !filters.lens) {
            if (filters.manufacturer || filters.port) {
                setFilters(prev => ({ ...prev, manufacturer: '', port: '' }))
            }
        }
    }, [filters.cameraModel, filters.lens, filters.manufacturer, filters.port])

    // Clear port when housing or lens changes
    useEffect(() => {
        if (filters.port && (filters.manufacturer || filters.lens)) {
            const selectedHousing = filters.manufacturer
                ? initialHousings.find(h => h.manufacturer.name === filters.manufacturer)
                : null
            const selectedLens = filters.lens ? lenses.find(l => l.name === filters.lens) : null

            if (!selectedHousing?.housingMount || !selectedLens) {
                setFilters(prev => ({ ...prev, port: '' }))
            } else {
                // Check if the port is still valid for the current housing mount/lens combo
                const isValidCombo = ports.some(port =>
                    port.housingMountId === selectedHousing.housingMount.id &&
                    port.lens?.some((l: any) => l.id === selectedLens.id) &&
                    port.name === filters.port
                )
                if (!isValidCombo) {
                    setFilters(prev => ({ ...prev, port: '' }))
                }
            }
        }
    }, [filters.manufacturer, filters.lens, filters.port, initialHousings, lenses, ports])

    // Apply filters and generate combinations
    useEffect(() => {
        setIsFiltering(true)

        // Generate all valid combinations based on filters
        const combinations: any[] = []

        initialHousings.forEach(housing => {
            // Camera manufacturer filter
            if (filters.cameraManufacturer && housing.Camera) {
                if (housing.Camera.brand.name !== filters.cameraManufacturer) {
                    return
                }
            }

            // Camera model filter
            if (filters.cameraModel && housing.Camera) {
                if (housing.Camera.name !== filters.cameraModel) {
                    return
                }
            }

            // Manufacturer filter
            if (filters.manufacturer && housing.manufacturer.name !== filters.manufacturer) {
                return
            }

            // For each housing, find compatible lenses and ports
            const camera = housing.Camera

            if (!camera) return

            // Look up the full camera data with imageInfo from the cameras prop
            const cameraWithImageInfo = cameras.find(c => c.id === camera.id) || camera

            // Find lenses compatible with this camera's mount
            const compatibleLenses = lenses.filter(lens =>
                lens.cameraMountId === camera.cameraMount?.id &&
                (!filters.lens || lens.name === filters.lens)
            )

            compatibleLenses.forEach(lens => {
                // Find ports compatible with this lens and housing
                const compatiblePorts = housing.ports.filter((port: any) =>
                    port.lens?.some((l: any) => l.id === lens.id) &&
                    (!filters.port || port.name === filters.port)
                )

                if (compatiblePorts.length > 0) {
                    compatiblePorts.forEach((port: any) => {
                        // Look up the full port data with imageInfo from the ports prop
                        const portWithImageInfo = ports.find(p => p.id === port.id) || port

                        // Calculate combined price
                        const housingPrice = housing.priceAmount ? Number(housing.priceAmount) : 0
                        const totalPrice = housingPrice

                        combinations.push({
                            id: `${camera.id}-${lens.id}-${housing.id}-${port.id}`,
                            camera: cameraWithImageInfo,
                            lens,
                            housing,
                            port: portWithImageInfo,
                            totalPrice,
                            currency: housing.priceCurrency || 'USD'
                        })
                    })
                }
                // Only show combinations where all four components (camera, lens, housing, port) are compatible
            })
        })

        setFilteredCombinations(combinations)
        setIsFiltering(false)
    }, [filters, initialHousings, lenses])

    const clearFilters = () => {
        setFilters({
            cameraManufacturer: '',
            cameraModel: '',
            lens: '',
            port: '',
            manufacturer: ''
        })
    }

    const hasActiveFilters = filters.cameraManufacturer !== '' ||
        filters.cameraModel !== '' ||
        filters.lens !== '' ||
        filters.port !== '' ||
        filters.manufacturer !== ''

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
                                <div className={`relative w-full aspect-square rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedCamera
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
                                    value={filters.cameraManufacturer}
                                    onChange={(e) => setFilters({ ...filters, cameraManufacturer: e.target.value, cameraModel: '' })}
                                    className="w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white mb-2"
                                >
                                    <option value="">Brand…</option>
                                    {uniqueCameraBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                {/* Camera model */}
                                <select
                                    value={filters.cameraModel}
                                    onChange={(e) => setFilters({ ...filters, cameraModel: e.target.value })}
                                    disabled={!filters.cameraManufacturer}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraManufacturer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">{filters.cameraManufacturer ? 'Model…' : 'Select brand first'}</option>
                                    {availableCameraModels.map(camera => (
                                        <option key={camera.id} value={camera.name}>{camera.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 1→2 */}
                            <div className="flex-none flex items-center" style={{ paddingTop: 'calc(25% - 0.625rem)' }}>
                                <svg className={`w-5 h-5 ${selectedCamera ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            {/* Step 2 — Lens */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className={`relative w-full aspect-square rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedLens
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
                                    value={filters.lens}
                                    onChange={(e) => setFilters({ ...filters, lens: e.target.value, port: '' })}
                                    disabled={!filters.cameraModel || availableLenses.length === 0}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraModel || availableLenses.length === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">
                                        {!filters.cameraModel ? 'Select camera first' : availableLenses.length === 0 ? 'No compatible lenses' : 'Lens…'}
                                    </option>
                                    {availableLenses.map(lens => (
                                        <option key={lens.id} value={lens.name}>{lens.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 2→3 */}
                            <div className="flex-none flex items-center" style={{ paddingTop: 'calc(25% - 0.625rem)' }}>
                                <svg className={`w-5 h-5 ${selectedLens ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            {/* Step 3 — Housing */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className={`relative w-full aspect-square rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedHousing
                                        ? 'border-blue-400 bg-blue-50'
                                        : (selectedCamera && selectedLens)
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
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${(selectedCamera && selectedLens) ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                                <span className={`text-sm font-bold ${(selectedCamera && selectedLens) ? 'text-gray-500' : 'text-gray-300'}`}>3</span>
                                            </div>
                                            <span className={`text-xs text-center px-2 ${(selectedCamera && selectedLens) ? 'text-gray-400' : 'text-gray-300'}`}>
                                                {(selectedCamera && selectedLens) ? 'Choose housing' : 'Lens first'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Housing</div>
                                <select
                                    value={filters.manufacturer}
                                    onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value, port: '' })}
                                    disabled={!filters.cameraModel || !filters.lens}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraModel || !filters.lens
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">
                                        {!filters.cameraModel ? 'Select camera first' : !filters.lens ? 'Select lens first' : 'Housing…'}
                                    </option>
                                    {manufacturers.map(manufacturer => (
                                        <option key={manufacturer.id} value={manufacturer.name}>{manufacturer.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Arrow 3→4 */}
                            <div className="flex-none flex items-center" style={{ paddingTop: 'calc(25% - 0.625rem)' }}>
                                <svg className={`w-5 h-5 ${selectedHousing ? 'text-blue-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>

                            {/* Step 4 — Port */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className={`relative w-full aspect-square rounded-xl overflow-hidden mb-3 border-2 transition-colors ${selectedPort
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
                                                <span className={`text-sm font-bold ${selectedHousing ? 'text-gray-500' : 'text-gray-300'}`}>4</span>
                                            </div>
                                            <span className={`text-xs text-center px-2 ${selectedHousing ? 'text-gray-400' : 'text-gray-300'}`}>
                                                {selectedHousing ? 'Choose port' : 'Housing first'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Port</div>
                                <select
                                    value={filters.port}
                                    onChange={(e) => setFilters({ ...filters, port: e.target.value })}
                                    disabled={!filters.manufacturer || availablePorts.length === 0}
                                    className={`w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.manufacturer || availablePorts.length === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                        }`}
                                >
                                    <option value="">
                                        {!filters.manufacturer ? 'Select housing first' : availablePorts.length === 0 ? 'No compatible ports' : 'Port…'}
                                    </option>
                                    {availablePorts.map(port => (
                                        <option key={port.id} value={port.name}>{port.name}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* Footer — shown when a valid combination is found */}
                    {filteredCombinations.length > 0 && filteredCombinations[0] && (
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
                                href={`/combinations/${filteredCombinations[0].camera.slug}/${filteredCombinations[0].lens.slug}/${filteredCombinations[0].housing.slug}/${filteredCombinations[0].port.id}`}
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