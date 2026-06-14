import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import EditReviewClient from './EditReviewClient'

export const metadata = { title: 'Edit Review | Underwater Camera Housings' }

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

interface SelectableComponent {
    type: ComponentType
    id: number
    label: string
    manufacturerName?: string
    productId?: string | null
}

interface ReviewComponent {
    componentType: ComponentType
    componentId: number
    description: string | null
    label: string
    manufacturerName?: string
}

async function getReview(id: number, userId: number) {
    const review = await prisma.review.findUnique({
        where: { id },
        include: {
            components: true,
        },
    })
    if (!review || review.userId !== userId) return null

    // Enrich components with labels
    const components: ReviewComponent[] = []
    for (const rc of review.components) {
        const detail = await fetchComponentLabel(rc.componentType as ComponentType, rc.componentId)
        if (detail) {
            components.push({
                componentType: rc.componentType as ComponentType,
                componentId: rc.componentId,
                description: rc.description,
                label: detail.label,
                manufacturerName: detail.manufacturerName,
            })
        }
    }

    return {
        id: review.id,
        title: review.title,
        body: review.body,
        status: review.status,
        components,
    }
}

async function fetchComponentLabel(type: ComponentType, id: number): Promise<{ label: string; manufacturerName?: string } | null> {
    switch (type) {
        case 'camera': {
            const c = await prisma.camera.findUnique({ where: { id }, include: { brand: true } })
            return c ? { label: `${c.brand.name} ${c.name}`, manufacturerName: c.brand.name } : null
        }
        case 'lens': {
            const l = await prisma.lens.findUnique({ where: { id }, include: { manufacturer: true } })
            return l ? { label: l.name, manufacturerName: l.manufacturer?.name ?? undefined } : null
        }
        case 'housing': {
            const h = await prisma.housing.findUnique({ where: { id }, include: { manufacturer: true } })
            return h ? { label: `${h.manufacturer.name} ${h.name}`, manufacturerName: h.manufacturer.name } : null
        }
        case 'port': {
            const p = await prisma.port.findUnique({ where: { id }, include: { manufacturer: true } })
            return p ? { label: `${p.manufacturer.name} ${p.name}`, manufacturerName: p.manufacturer.name } : null
        }
        case 'portAdapter': {
            const a = await prisma.portAdapter.findUnique({ where: { id }, include: { manufacturer: true } })
            return a ? { label: `${a.manufacturer.name} ${a.name}`, manufacturerName: a.manufacturer.name } : null
        }
        case 'extensionRing': {
            const e = await prisma.extensionRing.findUnique({ where: { id }, include: { manufacturer: true } })
            return e ? { label: `${e.manufacturer.name} ${e.name}`, manufacturerName: e.manufacturer.name } : null
        }
        default:
            return null
    }
}

async function getUserComponents(userId: number): Promise<SelectableComponent[]> {
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

    const seen = new Set<string>()
    const components: SelectableComponent[] = []

    for (const cs of systems) {
        const camKey = `camera:${cs.cameraId}`
        if (!seen.has(camKey)) {
            seen.add(camKey)
            const cam = await prisma.camera.findUnique({ where: { id: cs.cameraId }, include: { brand: true } })
            if (cam) components.push({ type: 'camera', id: cam.id, label: `${cam.brand.name} ${cam.name}`, manufacturerName: cam.brand.name, productId: cam.productId })
        }
        if (cs.lensId) {
            const key = `lens:${cs.lensId}`
            if (!seen.has(key)) {
                seen.add(key)
                const lens = await prisma.lens.findUnique({ where: { id: cs.lensId }, include: { manufacturer: true } })
                if (lens) components.push({ type: 'lens', id: lens.id, label: lens.name, manufacturerName: lens.manufacturer?.name ?? undefined, productId: lens.productId })
            }
        }
        if (cs.housingId) {
            const key = `housing:${cs.housingId}`
            if (!seen.has(key)) {
                seen.add(key)
                const h = await prisma.housing.findUnique({ where: { id: cs.housingId }, include: { manufacturer: true } })
                if (h) components.push({ type: 'housing', id: h.id, label: `${h.manufacturer.name} ${h.name}`, manufacturerName: h.manufacturer.name, productId: h.productId })
            }
        }
        if (cs.portId) {
            const key = `port:${cs.portId}`
            if (!seen.has(key)) {
                seen.add(key)
                const p = await prisma.port.findUnique({ where: { id: cs.portId }, include: { manufacturer: true } })
                if (p) components.push({ type: 'port', id: p.id, label: `${p.manufacturer.name} ${p.name}`, manufacturerName: p.manufacturer.name, productId: p.productId })
            }
        }
        if (cs.portAdapterId) {
            const key = `portAdapter:${cs.portAdapterId}`
            if (!seen.has(key)) {
                seen.add(key)
                const a = await prisma.portAdapter.findUnique({ where: { id: cs.portAdapterId }, include: { manufacturer: true } })
                if (a) components.push({ type: 'portAdapter', id: a.id, label: `${a.manufacturer.name} ${a.name}`, manufacturerName: a.manufacturer.name, productId: a.productId })
            }
        }
    }

    const systemsWithRings = await prisma.cameraSystem.findMany({
        where: { userId, isActive: true },
        include: { extensionRings: true },
    })
    for (const cs of systemsWithRings) {
        for (const ring of cs.extensionRings) {
            const key = `extensionRing:${ring.id}`
            if (!seen.has(key)) {
                seen.add(key)
                const er = await prisma.extensionRing.findUnique({ where: { id: ring.id }, include: { manufacturer: true } })
                if (er) components.push({ type: 'extensionRing', id: er.id, label: `${er.manufacturer.name} ${er.name}`, manufacturerName: er.manufacturer.name, productId: er.productId })
            }
        }
    }

    return components
}

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    const currentUserId = session?.user?.id ? parseInt(session.user.id) : undefined
    if (!currentUserId) redirect('/auth/login')

    const { id } = await params
    const [review, components] = await Promise.all([
        getReview(parseInt(id), currentUserId),
        getUserComponents(currentUserId),
    ])
    if (!review) notFound()

    return (
        <main className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Suspense>
                    <EditReviewClient
                        review={JSON.parse(JSON.stringify(review))}
                        userComponents={components}
                        userId={currentUserId}
                    />
                </Suspense>
            </div>
        </main>
    )
}
