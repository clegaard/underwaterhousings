import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import NewReviewClient from './NewReviewClient'

export const metadata = {
    title: 'Write a Review | Underwater Camera Housings',
}

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

interface SelectableComponent {
    type: ComponentType
    id: number
    label: string
    manufacturerName?: string
    productId?: string | null
}

async function getUserComponents(userId: number): Promise<SelectableComponent[]> {
    // Get all active camera systems for the user
    const systems = await prisma.cameraSystem.findMany({
        where: { userId, isActive: true },
        select: {
            cameraId: true,
            lensId: true,
            housingId: true,
            portId: true,
            portAdapterId: true,
        },
    })

    // Collect unique component type+id pairs
    const seen = new Set<string>()
    const components: SelectableComponent[] = []

    for (const cs of systems) {
        // Camera (always present)
        const camKey = `camera:${cs.cameraId}`
        if (!seen.has(camKey)) {
            seen.add(camKey)
            const cam = await prisma.camera.findUnique({
                where: { id: cs.cameraId },
                include: { brand: true },
            })
            if (cam) {
                components.push({
                    type: 'camera',
                    id: cam.id,
                    label: `${cam.brand.name} ${cam.name}`,
                    manufacturerName: cam.brand.name,
                    productId: cam.productId,
                })
            }
        }

        // Lens
        if (cs.lensId) {
            const key = `lens:${cs.lensId}`
            if (!seen.has(key)) {
                seen.add(key)
                const lens = await prisma.lens.findUnique({
                    where: { id: cs.lensId },
                    include: { manufacturer: true },
                })
                if (lens) {
                    components.push({
                        type: 'lens',
                        id: lens.id,
                        label: lens.name,
                        manufacturerName: lens.manufacturer?.name ?? undefined,
                        productId: lens.productId,
                    })
                }
            }
        }

        // Housing
        if (cs.housingId) {
            const key = `housing:${cs.housingId}`
            if (!seen.has(key)) {
                seen.add(key)
                const housing = await prisma.housing.findUnique({
                    where: { id: cs.housingId },
                    include: { manufacturer: true },
                })
                if (housing) {
                    components.push({
                        type: 'housing',
                        id: housing.id,
                        label: `${housing.manufacturer.name} ${housing.name}`,
                        manufacturerName: housing.manufacturer.name,
                        productId: housing.productId,
                    })
                }
            }
        }

        // Port
        if (cs.portId) {
            const key = `port:${cs.portId}`
            if (!seen.has(key)) {
                seen.add(key)
                const port = await prisma.port.findUnique({
                    where: { id: cs.portId },
                    include: { manufacturer: true },
                })
                if (port) {
                    components.push({
                        type: 'port',
                        id: port.id,
                        label: `${port.manufacturer.name} ${port.name}`,
                        manufacturerName: port.manufacturer.name,
                        productId: port.productId,
                    })
                }
            }
        }

        // Port Adapter
        if (cs.portAdapterId) {
            const key = `portAdapter:${cs.portAdapterId}`
            if (!seen.has(key)) {
                seen.add(key)
                const adapter = await prisma.portAdapter.findUnique({
                    where: { id: cs.portAdapterId },
                    include: { manufacturer: true },
                })
                if (adapter) {
                    components.push({
                        type: 'portAdapter',
                        id: adapter.id,
                        label: `${adapter.manufacturer.name} ${adapter.name}`,
                        manufacturerName: adapter.manufacturer.name,
                        productId: adapter.productId,
                    })
                }
            }
        }
    }

    // Also collect extension rings from the user's camera systems
    const systemsWithRings = await prisma.cameraSystem.findMany({
        where: { userId, isActive: true },
        include: { extensionRings: true },
    })
    for (const cs of systemsWithRings) {
        for (const ring of cs.extensionRings) {
            const key = `extensionRing:${ring.id}`
            if (!seen.has(key)) {
                seen.add(key)
                const er = await prisma.extensionRing.findUnique({
                    where: { id: ring.id },
                    include: { manufacturer: true },
                })
                if (er) {
                    components.push({
                        type: 'extensionRing',
                        id: er.id,
                        label: `${er.manufacturer.name} ${er.name}`,
                        manufacturerName: er.manufacturer.name,
                        productId: er.productId,
                    })
                }
            }
        }
    }

    return components
}

export default async function NewReviewPage() {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined

    if (!currentUserId) {
        return (
            <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
                    <p className="text-gray-500">You need to be signed in to write a review.</p>
                </div>
            </main>
        )
    }

    const components = await getUserComponents(currentUserId)

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <NewReviewClient userComponents={components} userId={currentUserId} />
                </Suspense>
            </div>
        </main>
    )
}
