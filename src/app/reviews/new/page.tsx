import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import NewReviewClient from './NewReviewClient'

export const metadata = {
    title: 'Write a Review | Underwater Camera Housings',
}

interface UserSystem {
    id: number
    name: string
    camera: { name: string; brand: { name: string } }
    lens: { name: string } | null
    housing: { name: string; manufacturer: { name: string } } | null
    port: { name: string } | null
    _count: { reviewLinks: number }
}

async function getUserSystems(userId: number): Promise<UserSystem[]> {
    // Get user's camera systems that don't already have reviews
    const systems = await prisma.cameraSystem.findMany({
        where: {
            userId,
            isActive: true,
        },
        include: {
            camera: { include: { brand: true } },
            lens: true,
            housing: { include: { manufacturer: true } },
            port: true,
            _count: { select: { reviewLinks: true } },
        },
        orderBy: { createdAt: 'desc' },
    })

    return systems.filter(s => s._count.reviewLinks === 0)
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

    const systems = await getUserSystems(currentUserId)

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <NewReviewClient userSystems={systems} userId={currentUserId} />
                </Suspense>
            </div>
        </main>
    )
}
