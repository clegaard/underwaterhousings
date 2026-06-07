import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    getCameraImagePathWithFallback,
    getHousingImagePathWithFallback,
} from '@/lib/images'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const cameraSystems = await prisma.cameraSystem.findMany({
            select: {
                id: true,
                cameraId: true,
                lensId: true,
                housingId: true,
                portId: true,
                camera: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        productPhotos: true,
                        priceAmount: true,
                        priceCurrency: true,
                        brand: { select: { id: true, name: true, slug: true } },
                    },
                },
                lens: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        priceAmount: true,
                        priceCurrency: true,
                    },
                },
                housing: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        productPhotos: true,
                        priceAmount: true,
                        priceCurrency: true,
                        manufacturer: { select: { id: true, name: true, slug: true } },
                    },
                },
                port: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        priceAmount: true,
                        priceCurrency: true,
                    },
                },
                _count: { select: { galleryPhotos: true } },
            },
        })

        type ConfigEntry = {
            cameraSystemIds: number[]
            camera: (typeof cameraSystems)[0]['camera']
            lens: (typeof cameraSystems)[0]['lens']
            housing: (typeof cameraSystems)[0]['housing']
            port: (typeof cameraSystems)[0]['port']
            photoCount: number
        }

        // Aggregate camera systems by their component combination
        const configMap = new Map<string, ConfigEntry>()
        for (const cameraSystem of cameraSystems) {
            const key = `${cameraSystem.cameraId}|${cameraSystem.lensId ?? ''}|${cameraSystem.housingId ?? ''}|${cameraSystem.portId ?? ''}`
            const existing = configMap.get(key)
            if (existing) {
                existing.photoCount += cameraSystem._count.galleryPhotos
                existing.cameraSystemIds.push(cameraSystem.id)
            } else {
                configMap.set(key, {
                    cameraSystemIds: [cameraSystem.id],
                    camera: cameraSystem.camera,
                    lens: cameraSystem.lens,
                    housing: cameraSystem.housing,
                    port: cameraSystem.port,
                    photoCount: cameraSystem._count.galleryPhotos,
                })
            }
        }

        const sorted = [...configMap.values()]
            .filter(c => c.photoCount > 0)
            .sort((a, b) => b.photoCount - a.photoCount)
            .slice(0, 6)

        const result = sorted.map((config) => {
            const housingImgInfo = config.housing
                ? getHousingImagePathWithFallback(config.housing.productPhotos)
                : getCameraImagePathWithFallback(config.camera.productPhotos)

            let totalPriceUSD = 0
            if (config.camera.priceAmount) totalPriceUSD += Number(config.camera.priceAmount)
            if (config.lens?.priceAmount) totalPriceUSD += Number(config.lens.priceAmount)
            if (config.housing?.priceAmount) totalPriceUSD += Number(config.housing.priceAmount)
            if (config.port?.priceAmount) totalPriceUSD += Number(config.port.priceAmount)

            return {
                camera: {
                    name: config.camera.name,
                    brandName: config.camera.brand.name,
                },
                lens: config.lens ? { name: config.lens.name } : null,
                housing: config.housing
                    ? { name: config.housing.name, manufacturerName: config.housing.manufacturer.name }
                    : null,
                port: config.port ? { name: config.port.name } : null,
                photoCount: config.photoCount,
                mainImageSrc: housingImgInfo.src,
                mainImageFallback: housingImgInfo.fallback,
                totalPriceUSD: totalPriceUSD > 0 ? totalPriceUSD : null,
            }
        })

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching popular rigs:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch popular rigs' },
            { status: 500 }
        )
    }
}
