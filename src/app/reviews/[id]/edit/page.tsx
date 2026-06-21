import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import WriteReviewClient from '@/app/reviews/new/write/WriteReviewClient'

export const metadata = { title: 'Edit Review | Underwater Camera Housings' }

async function getReview(id: number, userId: number) {
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
                        },
                    },
                },
            },
        },
    })
    if (!review || review.userId !== userId) return null

    const firstSystem = review.systems[0]
    const cs = firstSystem?.cameraSystem
    const systemLabel = cs ? [
        cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null,
        cs.lens?.name ?? null,
        cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null,
        cs.port?.name ?? null,
    ].filter(Boolean).join(' · ') : ''

    return {
        id: review.id,
        body: review.body,
        status: review.status,
        cameraSystemId: firstSystem?.cameraSystemId ?? null,
        systemLabel,
        systemComponents: {
            cameras: cs ? [cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null].filter(Boolean) as string[] : [],
            lenses: cs ? [cs.lens?.name].filter(Boolean) as string[] : [],
            housings: cs ? [cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null].filter(Boolean) as string[] : [],
            ports: cs ? [cs.port?.name].filter(Boolean) as string[] : [],
        },
    }
}

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined
    if (!currentUserId) redirect('/auth/login')

    const { id } = await params
    const review = await getReview(parseInt(id), currentUserId)
    if (!review) notFound()

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <WriteReviewClient
                        review={JSON.parse(JSON.stringify(review))}
                        userId={currentUserId}
                        mode="edit"
                    />
                </Suspense>
            </div>
        </main>
    )
}
