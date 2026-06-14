import { prisma } from '@/lib/prisma'
import { withBase, getHousingImagePathWithFallback, getCameraImagePathWithFallback, getLensImagePathWithFallback, getPortImagePathWithFallback } from '@/lib/images'
import HousingBuilder from '@/components/HousingBuilder'
import PopularCameraSystemsSection from '@/components/PopularCameraSystemsSection'

async function getBuilderData() {
    try {
        const [housings, cameras, lenses, portsRaw] = await Promise.all([
            prisma.housing.findMany({
                include: {
                    manufacturer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    cameras: {
                        include: {
                            brand: true,
                            cameraMount: true
                        }
                    },
                    housingMount: true,
                },
                orderBy: { name: 'asc' }
            }),
            prisma.camera.findMany({
                include: {
                    brand: true,
                    cameraMount: true,
                },
                orderBy: [
                    { brand: { name: 'asc' } },
                    { name: 'asc' }
                ]
            }),
            prisma.lens.findMany({
                include: {
                    cameraMount: true,
                    manufacturer: { select: { slug: true } },
                },
                orderBy: { name: 'asc' }
            }),
            prisma.port.findMany({
                include: {
                    housingMount: true,
                    manufacturer: { select: { slug: true } },
                },
                orderBy: { name: 'asc' }
            }),
        ])

        const manufacturersMap = new Map()
        housings.forEach(housing => {
            if (!manufacturersMap.has(housing.manufacturer.id)) {
                manufacturersMap.set(housing.manufacturer.id, housing.manufacturer)
            }
        })
        const manufacturers = Array.from(manufacturersMap.values()).sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
        )

        const ports = portsRaw.map(port => ({
            ...port,
            imageInfo: getPortImagePathWithFallback(port.productPhotos)
        }))

        return {
            housings: housings.map(housing => ({
                ...housing,
                priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null,
                imageInfo: getHousingImagePathWithFallback(housing.productPhotos),
            })),
            cameras: cameras.map(camera => ({
                ...camera,
                imageInfo: getCameraImagePathWithFallback(camera.productPhotos),
            })),
            lenses: lenses.map(lens => ({
                ...lens,
                imageInfo: getLensImagePathWithFallback(lens.productPhotos)
            })),
            manufacturers,
            ports,
            source: 'database' as const,
        }
    } catch (error) {
        console.log('Database not available:', error instanceof Error ? error.message : error)
        return { housings: [], cameras: [], manufacturers: [], lenses: [], ports: [], source: 'fallback' as const }
    }
}

export default async function BuilderPage() {
    const { housings, cameras, manufacturers, lenses, ports, source } = await getBuilderData()

    if (source === 'fallback') {
        return (
            <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center">
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

    return (
        <>
            <div className="bg-blue-50">
                <div className="max-w-5xl mx-auto px-4 pt-8 pb-2">
                    <PopularCameraSystemsSection />
                </div>
            </div>
            <div id="builder">
                <HousingBuilder
                    initialHousings={housings}
                    cameras={cameras}
                    manufacturers={manufacturers}
                    lenses={lenses}
                    ports={ports}
                />
            </div>
        </>
    )
}
