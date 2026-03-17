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
    maxDepth: string
    priceMin: number
    priceMax: number
    material: string
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
        maxDepth: '0',
        priceMin: 0,
        priceMax: 10000,
        material: '',
        manufacturer: ''
    })

    const [filteredCombinations, setFilteredCombinations] = useState<any[]>([])
    const [isFiltering, setIsFiltering] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Get unique values for filter options
    const uniqueMaterials = Array.from(new Set(initialHousings.map(h => h.material).filter(Boolean)))
    const uniqueDepthRatings = Array.from(new Set(initialHousings.map(h => h.depthRating).filter(Boolean))).sort((a, b) => a - b)

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

            // Max depth filter
            if (filters.maxDepth !== '0') {
                const requiredDepth = Number(filters.maxDepth)
                const housingDepth = housing.depthRating || 0
                if (housingDepth < requiredDepth) {
                    return
                }
            }

            // Material filter
            if (filters.material && housing.material !== filters.material) {
                return
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
                        const totalPrice = housingPrice // Can add camera, lens, port prices if available

                        // Price range filter on combined price
                        if (filters.priceMin > 0 || filters.priceMax < 10000) {
                            if (totalPrice < filters.priceMin || totalPrice > filters.priceMax) {
                                return
                            }
                        }

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
                } else if (!filters.port) {
                    // If no specific port filter and no ports available, still show the combination
                    const housingPrice = housing.priceAmount ? Number(housing.priceAmount) : 0
                    const totalPrice = housingPrice

                    // Price range filter
                    if (filters.priceMin > 0 || filters.priceMax < 10000) {
                        if (totalPrice < filters.priceMin || totalPrice > filters.priceMax) {
                            return
                        }
                    }

                    combinations.push({
                        id: `${camera.id}-${lens.id}-${housing.id}-no-port`,
                        camera: cameraWithImageInfo,
                        lens,
                        housing,
                        port: null,
                        totalPrice,
                        currency: housing.priceCurrency || 'USD'
                    })
                }
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
            maxDepth: '0',
            priceMin: 0,
            priceMax: 10000,
            material: '',
            manufacturer: ''
        })
    }

    const hasActiveFilters = filters.cameraManufacturer !== '' ||
        filters.cameraModel !== '' ||
        filters.lens !== '' ||
        filters.port !== '' ||
        filters.maxDepth !== '0' ||
        filters.priceMin > 0 ||
        filters.priceMax < 10000 ||
        filters.material !== '' ||
        filters.manufacturer !== ''

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">


            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:w-80">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Camera Manufacturer */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Camera Manufacturer
                                    </label>
                                    <select
                                        value={filters.cameraManufacturer}
                                        onChange={(e) => setFilters({ ...filters, cameraManufacturer: e.target.value, cameraModel: '' })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    >
                                        <option value="">All camera manufacturers</option>
                                        {uniqueCameraBrands.map(brand => (
                                            <option key={brand} value={brand}>
                                                {brand}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Camera Model */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Camera Model
                                    </label>
                                    <select
                                        value={filters.cameraModel}
                                        onChange={(e) => setFilters({ ...filters, cameraModel: e.target.value })}
                                        disabled={!filters.cameraManufacturer}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraManufacturer ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!filters.cameraManufacturer ? 'Select manufacturer first' : 'All camera models'}
                                        </option>
                                        {availableCameraModels.map(camera => (
                                            <option key={camera.id} value={camera.name}>
                                                {camera.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Lens */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Lens
                                    </label>
                                    <select
                                        value={filters.lens}
                                        onChange={(e) => setFilters({ ...filters, lens: e.target.value, port: '' })}
                                        disabled={!filters.cameraModel || availableLenses.length === 0}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraModel || availableLenses.length === 0
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!filters.cameraModel
                                                ? 'Select camera model first'
                                                : availableLenses.length === 0
                                                    ? 'No compatible lenses'
                                                    : 'All lenses'}
                                        </option>
                                        {availableLenses.map(lens => (
                                            <option key={lens.id} value={lens.name}>
                                                {lens.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedCamera?.cameraMount && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Compatible with {selectedCamera.cameraMount.name}
                                        </p>
                                    )}
                                </div>

                                {/* Manufacturer */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Housings
                                    </label>
                                    <select
                                        value={filters.manufacturer}
                                        onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value, port: '' })}
                                        disabled={!filters.cameraModel || !filters.lens}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.cameraModel || !filters.lens
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!filters.cameraModel
                                                ? 'Select camera model first'
                                                : !filters.lens
                                                    ? 'Select lens first'
                                                    : 'All housings'}
                                        </option>
                                        {manufacturers.map(manufacturer => (
                                            <option key={manufacturer.id} value={manufacturer.name}>
                                                {manufacturer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Port */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Port
                                    </label>
                                    <select
                                        value={filters.port}
                                        onChange={(e) => setFilters({ ...filters, port: e.target.value })}
                                        disabled={!filters.manufacturer || !filters.lens || availablePorts.length === 0}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!filters.manufacturer || !filters.lens || availablePorts.length === 0
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            : 'bg-white text-gray-900'
                                            }`}
                                    >
                                        <option value="">
                                            {!filters.manufacturer
                                                ? 'Select housing first'
                                                : !filters.lens
                                                    ? 'Select lens first'
                                                    : availablePorts.length === 0
                                                        ? 'No compatible ports'
                                                        : 'All ports'}
                                        </option>
                                        {availablePorts.map(port => (
                                            <option key={port.id} value={port.name}>
                                                {port.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedHousing?.housingMount && selectedLens && availablePorts.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Compatible with {selectedHousing.housingMount.name} mount + {selectedLens.name}
                                        </p>
                                    )}
                                </div>

                                {/* Max Depth */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maximum Depth Rating [m]
                                    </label>
                                    <select
                                        value={filters.maxDepth}
                                        onChange={(e) => setFilters({ ...filters, maxDepth: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    >
                                        <option value="0">Any depth</option>
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="30">30</option>
                                        <option value="40">40</option>
                                        <option value="50">50</option>
                                        <option value="60">60</option>
                                        <option value="70">70</option>
                                        <option value="80">80</option>
                                        <option value="90">90</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Price Range: ${filters.priceMin} - ${filters.priceMax}
                                    </label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500">Min Price</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5000"
                                                step="100"
                                                value={filters.priceMin}
                                                onChange={(e) => setFilters({ ...filters, priceMin: Number(e.target.value) })}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Max Price</label>
                                            <input
                                                type="range"
                                                min="500"
                                                max="10000"
                                                step="100"
                                                value={filters.priceMax}
                                                onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Material */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Material
                                    </label>
                                    <select
                                        value={filters.material}
                                        onChange={(e) => setFilters({ ...filters, material: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    >
                                        <option value="">All materials</option>
                                        {uniqueMaterials.map(material => (
                                            <option key={material} value={material}>
                                                {material}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Active Filters Summary */}
                            {hasActiveFilters && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h3>
                                    <div className="space-y-1 text-xs text-gray-600">
                                        {filters.cameraManufacturer && <div>Camera Manufacturer: {filters.cameraManufacturer}</div>}
                                        {filters.cameraModel && <div>Camera Model: {filters.cameraModel}</div>}
                                        {filters.lens && <div>Lens: {filters.lens}</div>}
                                        {filters.port && <div>Port: {filters.port}</div>}
                                        {filters.manufacturer && <div>Housings: {filters.manufacturer}</div>}
                                        {filters.maxDepth !== '0' && <div>Min Depth: {filters.maxDepth}m</div>}
                                        {(filters.priceMin > 0 || filters.priceMax < 10000) &&
                                            <div>Price: ${filters.priceMin} - ${filters.priceMax}</div>}
                                        {filters.material && <div>Material: {filters.material}</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1">
                        {isFiltering && (
                            <div className="text-center py-8">
                                <div className="inline-flex items-center text-blue-600">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Filtering combinations...
                                </div>
                            </div>
                        )}

                        {!isFiltering && filteredCombinations.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No combinations found</h3>
                                <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}

                        {!isFiltering && filteredCombinations.length > 0 && (
                            <div className="flex justify-center">
                                <div key={`${filteredCombinations.length}-${JSON.stringify(filters)}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl w-full">
                                    {filteredCombinations.map((combo: any) => {
                                        const { camera, lens, housing, port, totalPrice, currency } = combo

                                        // Create detail URL for combination
                                        const detailUrl = `/combinations/${camera.slug}/${lens.slug}/${housing.slug}${port ? '/' + port.id : ''}`

                                        // Use pre-resolved image paths from server-side
                                        const housingImageInfo = housing.imageInfo || {
                                            src: '/housings/fallback.png',
                                            fallback: '/housings/fallback.png'
                                        }
                                        const cameraImageInfo = camera.imageInfo || {
                                            src: '/cameras/fallback.png',
                                            fallback: '/cameras/fallback.png'
                                        }
                                        const lensImageInfo = lens.imageInfo || {
                                            src: '/lenses/fallback.png',
                                            fallback: '/lenses/fallback.png'
                                        }
                                        const portImageInfo = port?.imageInfo || {
                                            src: '/ports/fallback.png',
                                            fallback: '/ports/fallback.png'
                                        }

                                        return (
                                            <Link
                                                key={combo.id}
                                                href={detailUrl}
                                                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group cursor-pointer overflow-hidden"
                                            >
                                                <div className="p-6">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-6">
                                                        <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                            Complete Underwater Setup
                                                        </h3>
                                                        <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                                                            Complete
                                                        </div>
                                                    </div>

                                                    {/* Components with Inline Images */}
                                                    <div className="space-y-4 mb-5">
                                                        {/* Camera */}
                                                        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-blue-50 transition-colors">
                                                            <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                                                <HousingImage
                                                                    src={cameraImageInfo.src}
                                                                    fallback={cameraImageInfo.fallback}
                                                                    alt={`${camera.brand.name} ${camera.name}`}
                                                                    className="object-contain w-full h-full p-1 group-hover:scale-110 transition-transform duration-300"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                    📷 Camera
                                                                </div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {camera.brand.name} {camera.name}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Lens */}
                                                        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-blue-50 transition-colors">
                                                            <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                                                <HousingImage
                                                                    src={lensImageInfo.src}
                                                                    fallback={lensImageInfo.fallback}
                                                                    alt={lens.name}
                                                                    className="object-contain w-full h-full p-1 group-hover:scale-110 transition-transform duration-300"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                    🔍 Lens
                                                                </div>
                                                                <div className="text-sm font-semibold text-gray-900 truncate">
                                                                    {lens.name}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Housing */}
                                                        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-blue-50 transition-colors">
                                                            <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                                                <HousingImage
                                                                    src={housingImageInfo.src}
                                                                    fallback={housingImageInfo.fallback}
                                                                    alt={housing.name}
                                                                    className="object-contain w-full h-full p-1 group-hover:scale-110 transition-transform duration-300"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                    🏠 Housing
                                                                </div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {housing.manufacturer.name} {housing.model}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Port */}
                                                        {port && (
                                                            <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-blue-50 transition-colors">
                                                                <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                                                    <HousingImage
                                                                        src={portImageInfo.src}
                                                                        fallback={portImageInfo.fallback}
                                                                        alt={port.name}
                                                                        className="object-contain w-full h-full p-1 group-hover:scale-110 transition-transform duration-300"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                        🔌 Port
                                                                    </div>
                                                                    <div className="text-sm font-semibold text-gray-900">
                                                                        {port.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Specs */}
                                                    <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                                                        {housing.depthRating && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Depth Rating:</span>
                                                                <span className="font-medium text-green-700">{housing.depthRating}m</span>
                                                            </div>
                                                        )}

                                                        {housing.material && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Material:</span>
                                                                <span className="font-medium">{housing.material}</span>
                                                            </div>
                                                        )}

                                                        {totalPrice > 0 && (
                                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                                <span className="text-gray-600">Total Price:</span>
                                                                <span className="font-bold text-green-600 text-lg">
                                                                    ${totalPrice.toLocaleString()} {currency}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Click indicator */}
                                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                                        <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                            <span>View full setup & gallery</span>
                                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}