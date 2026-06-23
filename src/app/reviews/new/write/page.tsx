import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import WriteReviewClient from './WriteReviewClient'

export const metadata = {
    title: 'Write Your Review | Underwater Camera Housings',
}

async function getDraftReview(id: number, userId: number) {
    const review = await prisma.review.findUnique({
        where: { id },
        include: {
            systems: {
                include: {
                    cameraSystem: {
                        include: {
                            camera: { include: { brand: true } },
                            lens: true,
                            housing: { include: { manufacturer: true } },
                            port: true,
                            portAdapter: { include: { manufacturer: true } },
                            extensionRings: true,
                        },
                    },
                },
            },
        },
    })

    if (!review || review.userId !== userId) return null
    if (review.status !== 'draft') return null

    const firstSystem = review.systems[0]
    const cs = firstSystem?.cameraSystem

    return {
        id: review.id,
        body: review.body,
        cameraSystem: cs ?? null,
        systemComponents: {
            cameras: cs ? [cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null].filter(Boolean) as string[] : [],
            lenses: cs ? [cs.lens?.name].filter(Boolean) as string[] : [],
            housings: cs ? [cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null].filter(Boolean) as string[] : [],
            ports: [cs.port?.name].filter(Boolean) as string[],
        },
    }
}

export default async function WriteReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined
    if (!currentUserId) redirect('/auth/login')

    const { id } = await searchParams
    if (!id) redirect('/reviews/new')

    const review = await getDraftReview(parseInt(id), currentUserId)
    if (!review) notFound()

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <WriteReviewClient review={JSON.parse(JSON.stringify(review))} userId={currentUserId} />
                </Suspense>
            </div>
        </main>
    )
}
