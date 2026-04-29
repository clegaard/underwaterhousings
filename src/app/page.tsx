import { prisma } from '@/lib/prisma'
import { withBase, getHousingImagePathWithFallback, getCameraImagePathWithFallback, getLensImagePathWithFallback, getPortImagePathWithFallback } from '@/lib/images'
import HousingFilters from '@/components/HousingFilters'

// Server-side data fetching functions
async function getHousingsData() {
    try {
        // Optimized: Reduced from 5 queries to 3 queries
        const [housings, cameras, lenses, portsRaw, portChartEntriesRaw] = await Promise.all([
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
                    rigReviews: {
                        select: {
                            id: true,
                            ratingOpticalQuality: true,
                            ratingReliability: true,
                            ratingEaseOfUse: true,
                            comment: true,
                            reviewPhotos: true,
                            createdAt: true,
                            user: { select: { id: true, name: true, profilePicture: true } },
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            prisma.camera.findMany({
                include: {
                    brand: true,
                    cameraMount: true,
                    rigReviews: {
                        select: {
                            id: true,
                            ratingOpticalQuality: true,
                            ratingReliability: true,
                            ratingEaseOfUse: true,
                            comment: true,
                            reviewPhotos: true,
                            createdAt: true,
                            user: { select: { id: true, name: true, profilePicture: true } },
                        }
                    }
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
                orderBy: {
                    name: 'asc'
                }
            }),
            prisma.port.findMany({
                include: {
                    lens: true,
                    housingMount: true,
                    manufacturer: { select: { slug: true } },
                },
                orderBy: {
                    name: 'asc'
                }
            }),
            prisma.portChartEntry.findMany({
                include: {
                    port: {
                        select: {
                            id: true, name: true, slug: true, isFlatPort: true,
                            priceAmount: true, depthRating: true, housingMountId: true,
                        },
                    },
                    steps: {
                        include: {
                            extensionRing: { select: { id: true, name: true, slug: true, lengthMm: true, priceAmount: true } },
                            portAdapter: { select: { id: true, name: true, slug: true, priceAmount: true } },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
            }),
        ])

        // Derive manufacturers from housings (no separate query needed)
        const manufacturersMap = new Map()
        housings.forEach(housing => {
            if (!manufacturersMap.has(housing.manufacturer.id)) {
                manufacturersMap.set(housing.manufacturer.id, housing.manufacturer)
            }
        })
        const manufacturers = Array.from(manufacturersMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        )

        const ports = portsRaw.map(port => {
            const imageInfo = getPortImagePathWithFallback(port.productPhotos)
            return {
                ...port,
                imageInfo
            }
        })

        return {
            housings: housings.map(housing => {
                const imageInfo = getHousingImagePathWithFallback(housing.productPhotos)
                return {
                    ...housing,
                    priceAmount: housing.priceAmount ? Number(housing.priceAmount) : null,
                    imageInfo,
                    rigReviews: housing.rigReviews.map((r: any) => ({
                        ...r,
                        createdAt: r.createdAt.toISOString(),
                        reviewPhotos: r.reviewPhotos.map((p: string) => withBase(p)),
                        user: { ...r.user, profilePicture: r.user.profilePicture ? withBase(r.user.profilePicture) : null },
                    })),
                }
            }),
            cameras: cameras.map(camera => {
                const imageInfo = getCameraImagePathWithFallback(camera.productPhotos)
                return {
                    ...camera,
                    imageInfo,
                    rigReviews: camera.rigReviews.map((r: any) => ({
                        ...r,
                        createdAt: r.createdAt.toISOString(),
                        reviewPhotos: r.reviewPhotos.map((p: string) => withBase(p)),
                        user: { ...r.user, profilePicture: r.user.profilePicture ? withBase(r.user.profilePicture) : null },
                    })),
                }
            }),
            lenses: lenses.map(lens => {
                const imageInfo = getLensImagePathWithFallback(lens.productPhotos)
                return {
                    ...lens,
                    imageInfo
                }
            }),
            manufacturers,
            ports,
            portChartEntries: portChartEntriesRaw.map(e => ({
                id: e.id,
                manufacturerId: e.manufacturerId,
                lensId: e.lensId,
                portId: e.portId,
                isRecommended: e.isRecommended,
                notes: e.notes,
                port: e.port ? {
                    id: e.port.id,
                    name: e.port.name,
                    slug: e.port.slug,
                    isFlatPort: e.port.isFlatPort,
                    priceAmount: e.port.priceAmount ? Number(e.port.priceAmount) : null,
                    depthRating: e.port.depthRating,
                    housingMountId: e.port.housingMountId,
                } : null,
                steps: e.steps.map(s => ({
                    order: s.order,
                    extensionRing: s.extensionRing ? {
                        id: s.extensionRing.id,
                        name: s.extensionRing.name,
                        slug: s.extensionRing.slug,
                        lengthMm: s.extensionRing.lengthMm,
                        priceAmount: s.extensionRing.priceAmount ? Number(s.extensionRing.priceAmount) : null,
                    } : null,
                    portAdapter: s.portAdapter ? {
                        id: s.portAdapter.id,
                        name: s.portAdapter.name,
                        slug: s.portAdapter.slug,
                        priceAmount: s.portAdapter.priceAmount ? Number(s.portAdapter.priceAmount) : null,
                    } : null,
                })),
            })),
            source: 'database'
        }
    } catch (error) {
        console.log('Database not available:', error instanceof Error ? error.message : error)
        return { housings: [], cameras: [], manufacturers: [], lenses: [], ports: [], portChartEntries: [], source: 'fallback' }
    }
}

export default async function Home() {
    const { housings, cameras, manufacturers, lenses, ports, portChartEntries, source } = await getHousingsData()

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

    return <HousingFilters initialHousings={housings} cameras={cameras} manufacturers={manufacturers} lenses={lenses} ports={ports} portChartEntries={portChartEntries} />
}