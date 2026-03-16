import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const cameraSlug = searchParams.get('camera')
        const lensSlug = searchParams.get('lens')
        const housingSlug = searchParams.get('housing')
        const portId = searchParams.get('port')

        if (!cameraSlug || !lensSlug || !housingSlug) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: camera, lens, housing' },
                { status: 400 }
            )
        }

        // Fetch all components
        const [camera, lens, housing] = await Promise.all([
            prisma.camera.findUnique({
                where: { slug: cameraSlug },
                include: {
                    brand: true,
                    cameraMount: true
                }
            }),
            prisma.lens.findUnique({
                where: { slug: lensSlug },
                include: {
                    cameraMount: true
                }
            }),
            prisma.housing.findUnique({
                where: { slug: housingSlug },
                include: {
                    manufacturer: true,
                    Camera: {
                        include: {
                            brand: true
                        }
                    },
                    housingMount: true,
                    ports: {
                        include: {
                            lens: true,
                            housingMount: true
                        }
                    }
                }
            })
        ])

        if (!camera || !lens || !housing) {
            return NextResponse.json(
                { success: false, error: 'One or more components not found' },
                { status: 404 }
            )
        }

        // Validate compatibility
        if (lens.cameraMountId !== camera.cameraMountId) {
            return NextResponse.json(
                { success: false, error: 'Lens is not compatible with this camera mount' },
                { status: 400 }
            )
        }

        if (housing.cameraId !== camera.id) {
            return NextResponse.json(
                { success: false, error: 'Housing is not compatible with this camera' },
                { status: 400 }
            )
        }

        // Find compatible port
        let port = null
        if (portId) {
            port = housing.ports.find(p => p.id === portId)
        } else {
            // Find the first compatible port for this lens
            port = housing.ports.find(p => p.lensId === lens.id)
        }

        // Calculate combined pricing
        const housingPrice = housing.priceAmount ? Number(housing.priceAmount) : 0
        // Note: Add camera, lens, port prices if available in your schema
        const totalPrice = housingPrice
        const currency = housing.priceCurrency || 'USD'

        // In a real implementation, you would fetch sample photos from a gallery table
        // For now, return placeholder structure
        const sampleGallery = [
            {
                id: '1',
                url: `/gallery/${cameraSlug}-${lensSlug}-sample-1.jpg`,
                thumbnail: `/gallery/${cameraSlug}-${lensSlug}-sample-1-thumb.jpg`,
                caption: `Sample photo taken with ${camera.brand.name} ${camera.name} and ${lens.name}`,
                photographer: 'Sample Photographer',
                location: 'Sample Location'
            }
        ]

        return NextResponse.json({
            success: true,
            combination: {
                camera: {
                    id: camera.id,
                    name: camera.name,
                    slug: camera.slug,
                    brand: camera.brand.name,
                    brandSlug: camera.brand.slug,
                    mount: camera.cameraMount?.name
                },
                lens: {
                    id: lens.id,
                    name: lens.name,
                    slug: lens.slug,
                    mount: lens.cameraMount?.name
                },
                housing: {
                    id: housing.id,
                    name: housing.name,
                    model: housing.model,
                    slug: housing.slug,
                    manufacturer: housing.manufacturer.name,
                    manufacturerSlug: housing.manufacturer.slug,
                    depthRating: housing.depthRating,
                    material: housing.material,
                    description: housing.description,
                    price: housingPrice
                },
                port: port ? {
                    id: port.id,
                    name: port.name
                } : null,
                pricing: {
                    housing: housingPrice,
                    total: totalPrice,
                    currency
                },
                compatibility: {
                    validated: true,
                    cameraMount: camera.cameraMount?.name,
                    housingMount: housing.housingMount?.name
                },
                gallery: sampleGallery
            }
        })
    } catch (error) {
        console.error('Error fetching combination:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
