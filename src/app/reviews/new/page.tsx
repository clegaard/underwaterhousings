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
    imagePath: string | null
    camera: { id: number; name: string; brand: { name: string }; productPhotos: string[] }
    lens: { id: number; name: string; productPhotos: string[] } | null
    housing: { id: number; name: string; manufacturer: { name: string }; productPhotos: string[] } | null
    port: { id: number; name: string; productPhotos: string[] } | null
    portAdapter: { id: number; name: string; manufacturer: { name: string }; productPhotos: string[] } | null
    extensionRings: { id: number; name: string; productPhotos: string[] }[]
    reviewLinks: { reviewId: number; review: { id: number; status: string } }[]
}

async function getUserSystems(userId: number): Promise<UserSystem[]> {
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
            portAdapter: { include: { manufacturer: true } },
            extensionRings: true,
            reviewLinks: {
                select: {
                    reviewId: true,
                    review: { select: { id: true, status: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return systems as unknown as UserSystem[]
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
