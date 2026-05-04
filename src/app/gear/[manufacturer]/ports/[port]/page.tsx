import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'
import PriceTag from '@/components/PriceTag'
import { Metadata } from 'next'

interface Props {
    params: { manufacturer: string; port: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const port = await prisma.port.findFirst({
        where: { slug: params.port, manufacturer: { slug: params.manufacturer } },
        include: { manufacturer: true },
    })
    if (!port) return {}
    return {
        title: `${port.name} - ${port.manufacturer.name}`,
        description: port.description ?? `${port.name} port by ${port.manufacturer.name}`,
    }
}

export default async function PortDetailPage({ params }: Props) {
    const [manufacturer, port] = await Promise.all([
        prisma.manufacturer.findUnique({ where: { slug: params.manufacturer } }),
        prisma.port.findFirst({
            where: { slug: params.port, manufacturer: { slug: params.manufacturer } },
            include: {
                housingMount: true,
                manufacturer: true,
                lens: { select: { id: true, name: true, slug: true } },
            },
        }),
    ])

    if (!port || !manufacturer) notFound()

    const imageInfo = getPortImagePathWithFallback(port.productPhotos)
    const priceAmount = port.priceAmount ? parseFloat(port.priceAmount.toString()) : null

    const specs: { label: string; value: string }[] = []
    if (port.housingMount) specs.push({ label: 'Mount system', value: port.housingMount.name })
    specs.push({ label: 'Type', value: port.isFlatPort ? 'Flat port' : 'Dome port' })
    if (!port.isFlatPort && port.hemisphereWidth != null) {
        specs.push({ label: 'Dome width', value: `${port.hemisphereWidth} mm` })
    }
    if (port.portRadius != null) specs.push({ label: 'Port radius', value: `${port.portRadius} mm` })
    if (port.portDepth != null) specs.push({ label: 'Port depth', value: `${port.portDepth} mm` })
    if (!port.isFlatPort && port.radiusOfCurvature != null) {
        specs.push({ label: 'Radius of curvature', value: `${port.radiusOfCurvature} mm` })
    }
    if (port.depthRating != null) specs.push({ label: 'Depth rating', value: `${port.depthRating} m` })

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2 flex gap-1 items-center flex-wrap">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        <span>/</span>
                        <Link href={`/gear/${params.manufacturer}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        <span>/</span>
                        <Link href={`/gear/${params.manufacturer}/ports`} className="hover:text-blue-600 transition-colors">Ports</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{port.name}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Image */}
                        <div className="relative h-72 md:min-h-[20rem] bg-gray-50">
                            <HousingImage
                                src={imageInfo.src}
                                fallback={imageInfo.fallback}
                                alt={port.name}
                                className="object-contain p-8"
                            />
                        </div>

                        {/* Details */}
                        <div className="p-8 flex flex-col">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                {manufacturer.name} &middot; Port
                            </div>
                            <h1 className="text-2xl font-bold text-blue-900 mb-6">{port.name}</h1>

                            {specs.length > 0 && (
                                <dl className="space-y-2 mb-6">
                                    {specs.map(s => (
                                        <div key={s.label} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                                            <dt className="text-gray-500">{s.label}</dt>
                                            <dd className="font-medium text-gray-900">{s.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}

                            {port.description && (
                                <p className="text-sm text-gray-600 mb-6">{port.description}</p>
                            )}

                            {priceAmount != null && (
                                <div className="text-2xl font-bold text-blue-700 mb-6">
                                    <PriceTag amount={priceAmount} currency={port.priceCurrency ?? 'USD'} />
                                </div>
                            )}

                            {port.lens.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compatible lenses</p>
                                    <ul className="space-y-1">
                                        {port.lens.map(l => (
                                            <li key={l.id} className="text-sm text-gray-800">• {l.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {port.productUrl && (
                                <a
                                    href={port.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                                >
                                    View on {manufacturer.name} →
                                </a>
                            )}

                            <div className="mt-auto">
                                <Link
                                    href={`/gear/${params.manufacturer}/ports`}
                                    className="inline-block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    ← Back to {manufacturer.name} Ports
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
