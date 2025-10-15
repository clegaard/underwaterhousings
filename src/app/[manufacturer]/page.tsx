import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface ManufacturerPageProps {
    params: {
        manufacturer: string
    }
}

async function getManufacturerHousings(manufacturerSlug: string) {
    try {
        const manufacturer = await prisma.housingManufacturer.findUnique({
            where: {
                slug: manufacturerSlug
            },
            include: {
                housings: {
                    include: {
                        Camera: {
                            include: {
                                brand: true
                            }
                        }
                    },
                    orderBy: {
                        model: 'asc'
                    }
                }
            }
        })

        return manufacturer
    } catch (error) {
        console.error('Error fetching manufacturer housings:', error)
        return null
    }
}

export default async function ManufacturerPage({ params }: ManufacturerPageProps) {
    const manufacturer = await getManufacturerHousings(params.manufacturer)

    if (!manufacturer) {
        notFound()
    }

    // Convert Decimal fields to numbers
    const housingsData = manufacturer.housings.map(housing => ({
        ...housing,
        priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                        <Link href="/" className="hover:text-blue-600 transition-colors">
                            Home
                        </Link>
                        <span>→</span>
                        <span className="text-gray-900 font-medium">{manufacturer.name}</span>
                    </nav>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{manufacturer.name}</h1>
                            <p className="text-xl text-gray-700">
                                {manufacturer.description || `Professional underwater camera housings from ${manufacturer.name}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{housingsData.length}</div>
                            <div className="text-sm text-gray-600">Housing{housingsData.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        All {manufacturer.name} Housings
                    </h2>
                    <Link
                        href="/"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ← Back to Search
                    </Link>
                </div>

                {housingsData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {housingsData.map((housing) => {
                            // Use database slugs for SEO-friendly URLs
                            const detailUrl = `/${manufacturer.slug}/${housing.slug}`

                            return (
                                <Link
                                    key={housing.id}
                                    href={detailUrl}
                                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                {housing.model}
                                            </h3>
                                            {housing.Camera && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    {housing.Camera.brand.name} {housing.Camera.name}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="text-sm font-medium text-gray-800 mb-2">{housing.name}</h4>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                            {housing.description || `Professional underwater housing for ${housing.Camera?.brand.name} ${housing.Camera?.name}`}
                                        </p>

                                        <div className="space-y-2 text-sm">
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
                                                <span>View details</span>
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
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <div className="text-6xl mb-4">📷</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No housings found</h3>
                        <p className="text-gray-600 mb-4">
                            No housings are currently available from {manufacturer.name}
                        </p>
                        <Link
                            href="/"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse all manufacturers
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}