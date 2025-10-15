import { prisma } from '@/lib/prisma'
import HousingFilters from '@/components/HousingFilters'

// Server-side data fetching functions
async function getHousingsData() {
    try {
        const [housings, cameras, manufacturers] = await Promise.all([
            prisma.housing.findMany({
                include: {
                    manufacturer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    Camera: {
                        include: {
                            brand: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            prisma.camera.findMany({
                include: {
                    brand: true
                },
                orderBy: [
                    { brand: { name: 'asc' } },
                    { name: 'asc' }
                ]
            }),
            prisma.housingManufacturer.findMany({
                orderBy: {
                    name: 'asc'
                }
            })
        ])

        return {
            housings: housings.map(housing => ({
                ...housing,
                priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null
            })),
            cameras,
            manufacturers,
            source: 'database'
        }
    } catch (error) {
        console.log('Database not available:', error instanceof Error ? error.message : error)
        return { housings: [], cameras: [], manufacturers: [], source: 'fallback' }
    }
}

export default async function Home() {
    const { housings, cameras, manufacturers, source } = await getHousingsData()

    if (source === 'fallback') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Connection Error</h1>
                    <p className="text-gray-600 mb-4">Unable to connect to the database. Please check your connection.</p>
                    <div className="text-sm text-gray-500">
                        Make sure PostgreSQL is running and the database is properly configured.
                    </div>
                </div>
            </div>
        )
    }

    return <HousingFilters initialHousings={housings} cameras={cameras} manufacturers={manufacturers} />
}