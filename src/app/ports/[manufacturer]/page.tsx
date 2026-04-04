import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getPortImagePathWithFallback } from '@/lib/images'
import PortManufacturerPortsClient from '@/components/PortManufacturerPortsClient'

interface PortManufacturerPageProps {
    params: { manufacturer: string }
}

async function getPortManufacturerPorts(manufacturerSlug: string) {
    try {
        return await prisma.manufacturer.findUnique({
            where: { slug: manufacturerSlug },
            include: {
                ports: {
                    include: { housingMount: true },
                    orderBy: { name: 'asc' },
                },
            },
        })
    } catch (error) {
        console.error('Error fetching port manufacturer:', error)
        return null
    }
}

export default async function PortManufacturerPage({ params }: PortManufacturerPageProps) {
    const [manufacturer, session, housingMounts] = await Promise.all([
        getPortManufacturerPorts(params.manufacturer),
        auth(),
        prisma.housingMount.findMany({ orderBy: { name: 'asc' } }),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const portsData = manufacturer.ports.map(port => ({
        id: port.id,
        name: port.name,
        slug: port.slug,
        housingMount: port.housingMount,
        productPhotos: port.productPhotos,
        imageInfo: getPortImagePathWithFallback(port.productPhotos),
    }))

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">{manufacturer.name} Ports</h1>
                            <p className="text-xl text-gray-700">Port models from {manufacturer.name}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{portsData.length}</div>
                            <div className="text-sm text-gray-600">Port{portsData.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
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
