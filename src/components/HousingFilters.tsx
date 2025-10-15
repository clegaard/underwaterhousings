'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Types for our filters
type FilterState = {
    compatibleCamera: string
    maxDepth: number
    priceMin: number
    priceMax: number
    material: string
    manufacturer: string
}

// Client-side component for advanced filtering
export default function HousingFilters({ initialHousings, cameras, manufacturers }: {
    initialHousings: any[],
    cameras: any[],
    manufacturers: any[]
}) {
    const [filters, setFilters] = useState<FilterState>({
        compatibleCamera: '',
        maxDepth: 0,
        priceMin: 0,
        priceMax: 10000,
        material: '',
        manufacturer: ''
    })

    const [filteredHousings, setFilteredHousings] = useState(initialHousings)
    const [isFiltering, setIsFiltering] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Get unique values for filter options
    const uniqueMaterials = Array.from(new Set(initialHousings.map(h => h.material).filter(Boolean)))
    const uniqueDepthRatings = Array.from(new Set(initialHousings.map(h => h.depthRating).filter(Boolean)))

    // Parse depth rating to get numeric value for comparison
    const parseDepthRating = (depthRating: string): number => {
        if (!depthRating) return 0
        const match = depthRating.match(/(\d+)m/)
        return match ? parseInt(match[1]) : 0
    }

    // Apply filters
    useEffect(() => {
        setIsFiltering(true)

        let filtered = initialHousings.filter(housing => {
            // Camera compatibility filter
            if (filters.compatibleCamera && housing.Camera) {
                const cameraFullName = `${housing.Camera.brand.name} ${housing.Camera.name}`
                if (!cameraFullName.toLowerCase().includes(filters.compatibleCamera.toLowerCase())) {
                    return false
                }
            }

            // Max depth filter
            if (filters.maxDepth > 0) {
                const housingDepth = parseDepthRating(housing.depthRating)
                if (housingDepth < filters.maxDepth) {
                    return false
                }
            }

            // Price range filter
            if (housing.priceAmount) {
                const price = Number(housing.priceAmount)
                // Only apply price filter if user has changed from defaults
                if (filters.priceMin > 0 || filters.priceMax < 10000) {
                    if (price < filters.priceMin || price > filters.priceMax) {
                        return false
                    }
                }
            }

            // Material filter
            if (filters.material && housing.material !== filters.material) {
                return false
            }

            // Manufacturer filter
            if (filters.manufacturer && housing.manufacturer.name !== filters.manufacturer) {
                return false
            }

            return true
        })

        setFilteredHousings(filtered)
        setIsFiltering(false)
    }, [filters, initialHousings])

    const clearFilters = () => {
        setFilters({
            compatibleCamera: '',
            maxDepth: 0,
            priceMin: 0,
            priceMax: 10000,
            material: '',
            manufacturer: ''
        })
    }

    const hasActiveFilters = filters.compatibleCamera !== '' ||
        filters.maxDepth > 0 ||
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
                                {/* Camera Compatibility */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Compatible Camera
                                    </label>
                                    <select
                                        value={filters.compatibleCamera}
                                        onChange={(e) => setFilters({ ...filters, compatibleCamera: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All cameras</option>
                                        {cameras.map(camera => (
                                            <option key={camera.id} value={`${camera.brand.name} ${camera.name}`}>
                                                {camera.brand.name} {camera.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Manufacturer */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Manufacturer
                                    </label>
                                    <select
                                        value={filters.manufacturer}
                                        onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">All manufacturers</option>
                                        {manufacturers.map(manufacturer => (
                                            <option key={manufacturer.id} value={manufacturer.name}>
                                                {manufacturer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Max Depth */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maximum Depth Rating
                                    </label>
                                    <select
                                        value={filters.maxDepth}
                                        onChange={(e) => setFilters({ ...filters, maxDepth: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={0}>Any depth</option>
                                        <option value={10}>10m / 33ft or deeper</option>
                                        <option value={20}>20m / 66ft or deeper</option>
                                        <option value={30}>30m / 98ft or deeper</option>
                                        <option value={40}>40m / 131ft or deeper</option>
                                        <option value={50}>50m / 164ft or deeper</option>
                                        <option value={60}>60m / 197ft or deeper</option>
                                        <option value={70}>70m / 230ft or deeper</option>
                                        <option value={80}>80m / 262ft or deeper</option>
                                        <option value={90}>90m / 295ft or deeper</option>
                                        <option value={100}>100m / 328ft or deeper</option>
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
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        {filters.compatibleCamera && <div>Camera: {filters.compatibleCamera}</div>}
                                        {filters.manufacturer && <div>Brand: {filters.manufacturer}</div>}
                                        {filters.maxDepth > 0 && <div>Min Depth: {filters.maxDepth}m</div>}
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
                                    Filtering housings...
                                </div>
                            </div>
                        )}

                        {!isFiltering && filteredHousings.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No housings found</h3>
                                <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}

                        {!isFiltering && filteredHousings.length > 0 && (
                            <div key={`${filteredHousings.length}-${JSON.stringify(filters)}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredHousings.map((housing: any) => {
                                    // Use database slugs for SEO-friendly URLs with new structure
                                    const detailUrl = `/housings/${housing.manufacturer.slug}/${housing.slug}`

                                    // For now, use the hardcoded Nauticam image for all housings as requested
                                    const imagePath = '/housings/nauticam/na-om5ii/front.webp'

                                    return (
                                        <Link
                                            key={housing.id}
                                            href={detailUrl}
                                            className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group cursor-pointer overflow-hidden"
                                        >
                                            {/* Housing Image */}
                                            <div className="relative w-full h-48 bg-gray-100">
                                                <Image
                                                    src={imagePath}
                                                    alt={housing.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>

                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">{housing.model}</h3>
                                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                        {housing.manufacturer.name}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-medium text-gray-800 mb-2">{housing.name}</h4>
                                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{housing.description}</p>

                                                <div className="space-y-2 text-sm">
                                                    {housing.Camera && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600">Compatible with:</span>
                                                            <span className="font-medium bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">
                                                                {housing.Camera.brand.name} {housing.Camera.name}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {housing.depthRating && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Depth Rating:</span>
                                                            <span className="font-medium text-green-700">{housing.depthRating}</span>
                                                        </div>
                                                    )}

                                                    {housing.material && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Material:</span>
                                                            <span className="font-medium">{housing.material}</span>
                                                        </div>
                                                    )}

                                                    {housing.priceAmount && (
                                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                            <span className="text-gray-600">Price:</span>
                                                            <span className="font-bold text-green-600 text-lg">
                                                                ${Number(housing.priceAmount).toLocaleString()} {housing.priceCurrency}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Click indicator */}
                                                <div className="mt-4 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                        <span>Click for details</span>
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}