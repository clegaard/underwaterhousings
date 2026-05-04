import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getPortImagePathWithFallback } from '@/lib/images'
import PortManufacturerPortsClient from '@/components/PortManufacturerPortsClient'

interface Props {
    params: { manufacturer: string }
}

async function getData(slug: string) {
    const manufacturer = await prisma.manufacturer.findUnique({
        where: { slug },
        include: {
            ports: {
                include: { housingMount: true },
                orderBy: { name: 'asc' },
            },
            housingMounts: { orderBy: { name: 'asc' } },
            _count: { select: { ports: true } },
        },
    })
    return { manufacturer }
}

export async function generateMetadata({ params }: Props) {
    const { manufacturer } = await getData(params.manufacturer)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Ports`,
        description: `Browse all ${manufacturer._count.ports} ports from ${manufacturer.name}`,
    }
}

export default async function PortsListingPage({ params }: Props) {
    const [{ manufacturer }, session] = await Promise.all([
        getData(params.manufacturer),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const portsData = manufacturer.ports.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        housingMount: p.housingMount,
        productPhotos: p.productPhotos,
        imageInfo: getPortImagePathWithFallback(p.productPhotos),
        productId: p.productId ?? null,
        productUrl: p.productUrl ?? null,
        isFlatPort: p.isFlatPort,
        portRadius: p.portRadius ?? null,
        portDepth: p.portDepth ?? null,
        radiusOfCurvature: p.radiusOfCurvature ?? null,
        depthRating: p.depthRating ?? null,
    }))

    const housingMounts = manufacturer.housingMounts.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        {' / '}
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        {' / '}
                        <Link href={`/gear/${params.manufacturer}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        {' / '}
                        <span className="text-gray-700">Ports</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Ports</h1>
                    <p className="text-gray-500 mt-1">
                        {manufacturer._count.ports} port{manufacturer._count.ports !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <PortManufacturerPortsClient
                    ports={portsData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    housingMounts={housingMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
