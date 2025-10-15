import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// Fallback data in case database is not available
const fallbackManufacturers = [
    {
        id: '1',
        name: 'Nauticam',
        description: 'Premium aluminum housings for professional underwater photography',
        country: 'Hong Kong',
        website: 'https://www.nauticam.com',
        keyFeatures: ['N100/N120 Port System', 'Depth rated to 100m', 'Professional grade controls'],
        _count: { housings: 25 }
    },
    {
        id: '2',
        name: 'Aquatica',
        description: 'High-quality housings for Canon and Nikon cameras',
        country: 'Canada',
        website: 'https://www.aquatica.ca',
        keyFeatures: ['Over 40 years experience', 'Canadian engineering', 'Precision machined aluminum'],
        _count: { housings: 18 }
    },
    {
        id: '3',
        name: 'Isotta',
        description: 'Italian-made housings with precision engineering',
        country: 'Italy',
        website: 'https://www.isotecnic.it',
        keyFeatures: ['Made in Italy', 'Wide camera compatibility', 'Competitive pricing'],
        _count: { housings: 32 }
    },
    {
        id: '4',
        name: 'AOI',
        description: 'Taiwanese underwater housings and accessories',
        country: 'Taiwan',
        website: 'https://www.aoi-uw.com',
        keyFeatures: ['Mirrorless specialists', 'Compact design', 'Innovative features'],
        _count: { housings: 15 }
    },
    {
        id: '5',
        name: 'Sea Frogs',
        description: 'Affordable underwater housings for all photographers',
        country: 'Hong Kong',
        website: 'https://www.seafrogs.com.hk',
        keyFeatures: ['Budget-friendly options', 'Salted Line series', 'Wide camera support'],
        _count: { housings: 22 }
    },
    {
        id: '6',
        name: 'DiveVolk',
        description: 'Revolutionary smartphone housings with touchscreen technology',
        country: 'China',
        website: 'https://www.divevolkdiving.com',
        keyFeatures: ['SeaTouch technology', 'Full touchscreen access', 'Smartphone compatibility'],
        _count: { housings: 8 }
    }
]

type ManufacturerData = {
    id: string
    name: string
    description: string | null
    country: string | null
    website: string | null
    keyFeatures?: string[]
    _count: { housings: number }
}

async function getManufacturers(): Promise<{ manufacturers: ManufacturerData[], source: string }> {
    try {
        const manufacturers = await prisma.manufacturer.findMany({
            include: {
                _count: {
                    select: {
                        housings: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Transform database data to match our type
        const transformedManufacturers: ManufacturerData[] = manufacturers.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            country: m.country,
            website: m.website,
            keyFeatures: [], // Database doesn't have keyFeatures field, so we'll use empty array
            _count: m._count
        }))

        return { manufacturers: transformedManufacturers, source: 'database' }
    } catch (error) {
        console.log('Database not available, using fallback data:', error instanceof Error ? error.message : error)
        return { manufacturers: fallbackManufacturers, source: 'fallback' }
    }
}

export default async function Home() {
    const { manufacturers, source } = await getManufacturers()

    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-8">
            <div className="mx-auto max-w-6xl">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-blue-900 mb-4">
                        Underwater Camera Housings
                    </h1>
                    <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                        Comprehensive catalog of underwater camera housings from leading manufacturers worldwide
                    </p>
                    {source === 'fallback' && (
                        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg inline-block">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Database not connected - showing demo data
                            </p>
                        </div>
                    )}
                    {source === 'database' && (
                        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-lg inline-block">
                            <p className="text-sm text-green-800">
                                ✅ Live data from database
                            </p>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {manufacturers.map((manufacturer: ManufacturerData) => (
                        <div key={manufacturer.id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-semibold text-blue-900">{manufacturer.name}</h2>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {manufacturer._count.housings} housings
                                </span>
                            </div>
                            <p className="text-gray-600 mb-4">{manufacturer.description}</p>
                            {manufacturer.country && (
                                <p className="text-xs text-gray-500 mb-3">📍 {manufacturer.country}</p>
                            )}
                            <div className="text-sm text-blue-600">
                                {manufacturer.keyFeatures ?
                                    manufacturer.keyFeatures.map((feature: string, index: number) => (
                                        <div key={index}>• {feature}</div>
                                    )) :
                                    <div>• Professional underwater housings</div>
                                }
                            </div>
                            {manufacturer.website && (
                                <div className="mt-4">
                                    <a
                                        href={manufacturer.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                        Visit Website →
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white p-8 rounded-lg shadow-lg">
                    <h2 className="text-3xl font-bold text-center mb-8 text-blue-900">Project Features</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-blue-800">🏗️ Technical Stack</h3>
                            <ul className="space-y-2 text-gray-700">
                                <li>• Next.js 14 with App Router</li>
                                <li>• TypeScript for type safety</li>
                                <li>• Tailwind CSS for styling</li>
                                <li>• PostgreSQL database</li>
                                <li>• Prisma ORM with full schema</li>
                                <li>• Comprehensive scraping from 6 manufacturers</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-blue-800">📊 Database Schema</h3>
                            <ul className="space-y-2 text-gray-700">
                                <li>• Manufacturers and housing products</li>
                                <li>• Camera brands and models</li>
                                <li>• Housing compatibility matrix</li>
                                <li>• Accessories and reviews</li>
                                <li>• Scraping logs and metadata</li>
                                <li>• Flexible pricing and specifications</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <h3 className="text-xl font-semibold mb-4 text-blue-800">🚀 API Endpoints</h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                href="/api/manufacturers"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                /api/manufacturers
                            </Link>
                            <Link
                                href="/api/housings"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                /api/housings
                            </Link>
                        </div>
                        <p className="text-sm text-gray-600 mt-4">
                            Click the buttons above to test the API endpoints with sample data
                        </p>
                    </div>
                </div>

                <footer className="mt-12 text-center text-gray-600">
                    <p>🌊 Comprehensive underwater housing database with scraped data from leading manufacturers</p>
                </footer>
            </div>
        </main>
    )
}