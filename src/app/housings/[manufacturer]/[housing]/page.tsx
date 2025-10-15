import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHousingImagePathWithFallback } from '@/lib/images'
import { HousingImage } from '@/components/HousingImage'

interface HousingDetailPageProps {
    params: {
        manufacturer: string
        housing: string
    }
}

async function getHousingDetail(manufacturerSlug: string, housingSlug: string) {
    try {
        const housing = await prisma.housing.findFirst({
            where: {
                AND: [
                    {
                        manufacturer: {
                            slug: manufacturerSlug
                        }
                    },
                    {
                        slug: housingSlug
                    }
                ]
            },
            include: {
                manufacturer: true,
                Camera: {
                    include: {
                        brand: true
                    }
                }
            }
        })

        return housing
    } catch (error) {
        console.error('Error fetching housing detail:', error)
        return null
    }
}

export default async function HousingDetailPage({ params }: HousingDetailPageProps) {
    const housing = await getHousingDetail(params.manufacturer, params.housing)

    if (!housing) {
        notFound()
    }

    // Convert Decimal to number for client rendering
    const housingData = {
        ...housing,
        priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                        <Link href="/" className="hover:text-blue-600 transition-colors">
                            Home
                        </Link>
                        <span>→</span>
                        <Link
                            href={`/housings/${params.manufacturer}`}
                            className="hover:text-blue-600 transition-colors capitalize"
                        >
                            {housing.manufacturer.name}
                        </Link>
                        <span>→</span>
                        <span className="text-gray-900 font-medium">{housing.model}</span>
                    </nav>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{housing.model}</h1>
                            <h2 className="text-xl text-gray-700 mb-4">{housing.name}</h2>
                            <div className="flex items-center gap-4">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {housing.manufacturer.name}
                                </span>
                                {housing.Camera && (
                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {housing.Camera.brand.name} {housing.Camera.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        {housing.priceAmount && (
                            <div className="text-right">
                                <div className="text-3xl font-bold text-green-600">
                                    ${Number(housing.priceAmount).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600">{housing.priceCurrency}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Housing Image */}
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                                {(() => {
                                    const imageInfo = getHousingImagePathWithFallback(housing.manufacturer.slug, housing.slug)
                                    return (
                                        <HousingImage
                                            src={imageInfo.src}
                                            fallback={imageInfo.fallback}
                                            alt={housing.name}
                                            className="object-cover"
                                        />
                                    )
                                })()}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Description</h3>
                            <p className="text-gray-700 leading-relaxed">
                                {housing.description || `The ${housing.model} is a professional underwater housing designed for the ${housing.Camera?.brand.name} ${housing.Camera?.name}. This housing provides exceptional build quality and reliability for underwater photography enthusiasts and professionals.`}
                            </p>
                        </div>

                        {/* Specifications */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Specifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Manufacturer</h4>
                                        <p className="text-gray-700">{housing.manufacturer.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Model</h4>
                                        <p className="text-gray-700">{housing.model}</p>
                                    </div>
                                    {housing.Camera && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Compatible Camera</h4>
                                            <p className="text-gray-700">{housing.Camera.brand.name} {housing.Camera.name}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {housing.depthRating && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Depth Rating</h4>
                                            <p className="text-gray-700">{housing.depthRating}</p>
                                        </div>
                                    )}
                                    {housing.material && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Material</h4>
                                            <p className="text-gray-700">{housing.material}</p>
                                        </div>
                                    )}
                                    {housing.priceAmount && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Price</h4>
                                            <p className="text-gray-700">
                                                ${Number(housing.priceAmount).toLocaleString()} {housing.priceCurrency}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href="/"
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                                >
                                    ← Back to Search
                                </Link>
                                <Link
                                    href={`/${params.manufacturer}`}
                                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block"
                                >
                                    View All {housing.manufacturer.name} Housings
                                </Link>
                            </div>
                        </div>

                        {housing.Camera && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Camera Compatibility</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm text-gray-700">
                                            {housing.Camera.brand.name} {housing.Camera.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Key Features</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Professional grade construction</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Precision machined controls</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Reliable sealing system</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Compatible with accessories</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}