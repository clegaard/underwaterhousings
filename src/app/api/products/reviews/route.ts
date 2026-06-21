import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/reviews?type=camera&id=5
// Returns reviews where the given product is part of the camera system.
export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams
    const type = sp.get('type')  // camera | lens | housing | port
    const id = sp.get('id')

    if (!type || !id) {
        return NextResponse.json({ success: false, error: 'type and id are required' }, { status: 400 })
    }

    const productId = parseInt(id)

    try {
        const csWhere: Record<string, number> = {}
        switch (type) {
            case 'camera':
                csWhere.cameraId = productId
                break
            case 'lens':
                csWhere.lensId = productId
                break
            case 'housing':
                csWhere.housingId = productId
                break
            case 'port':
                csWhere.portId = productId
                break
            default:
                return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
        }

        const reviews = await prisma.review.findMany({
            where: {
                status: 'published',
                systems: {
                    some: {
                        cameraSystem: csWhere,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                user: { select: { id: true, name: true, profilePicture: true } },
                systems: {
                    include: {
                        cameraSystem: {
                            include: {
                                camera: { select: { name: true, brand: { select: { name: true } } } },
                                lens: { select: { name: true } },
                                housing: { select: { name: true, manufacturer: { select: { name: true } } } },
                                port: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        })

        const data = reviews.map(r => {
            const systemSummaries = r.systems.map(rs => {
                const cs = rs.cameraSystem
                return {
                    camera: cs.camera ? `${cs.camera.brand.name} ${cs.camera.name}` : null,
                    lens: cs.lens?.name ?? null,
                    housing: cs.housing ? `${cs.housing.manufacturer.name} ${cs.housing.name}` : null,
                    port: cs.port?.name ?? null,
                    description: rs.description ?? null,
                }
            })

            let excerpt = ''
            if (r.body) {
                try {
                    const sections = JSON.parse(r.body)
                    if (sections?.introduction) {
                        excerpt = sections.introduction.replace(/<[^>]*>/g, '').slice(0, 200)
                    }
                } catch {
                    excerpt = r.body.replace(/<[^>]*>/g, '').slice(0, 200)
                }
            }

            return {
                id: r.id,
                systemSummaries,
                createdAt: r.createdAt.toISOString(),
                user: r.user,
                bodyExcerpt: excerpt ? excerpt + (excerpt.length >= 200 ? '…' : '') : '',
            }
        })

        return NextResponse.json({ success: true, data, count: data.length })
    } catch (error) {
        console.error('Error fetching product reviews:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 })
    }
}
