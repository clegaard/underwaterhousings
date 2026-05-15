import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'
import PriceTag from '@/components/PriceTag'
import { Metadata } from 'next'

interface Props {
    params: Promise<{ manufacturer: string; adapter: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { manufacturer: mSlug, adapter: adapterSlug } = await params
    const adapter = await prisma.portAdapter.findFirst({
        where: { slug: adapterSlug, manufacturer: { slug: mSlug } },
        include: { manufacturer: true },
    })
    if (!adapter) return {}
    return {
        title: `${adapter.name} - ${adapter.manufacturer.name}`,
        description: adapter.description ?? `${adapter.name} port adapter by ${adapter.manufacturer.name}`,
    }
}

export default async function PortAdapterDetailPage({ params }: Props) {
    const { manufacturer: mSlug, adapter: adapterSlug } = await params
    const [manufacturer, adapter] = await Promise.all([
        prisma.manufacturer.findUnique({ where: { slug: mSlug } }),
        prisma.portAdapter.findFirst({
            where: { slug: adapterSlug, manufacturer: { slug: mSlug } },
            include: { inputHousingMount: true, outputHousingMount: true, manufacturer: true },
        }),
    ])

    if (!adapter || !manufacturer) notFound()

    const imageInfo = getPortImagePathWithFallback(adapter.productPhotos)
    const priceAmount = adapter.priceAmount ? parseFloat(adapter.priceAmount.toString()) : null

    const specs: { label: string; value: string }[] = []
    if (adapter.inputHousingMount) specs.push({ label: 'Input mount', value: adapter.inputHousingMount.name })
    if (adapter.outputHousingMount) specs.push({ label: 'Output mount', value: adapter.outputHousingMount.name })

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2 flex gap-1 items-center flex-wrap">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        <span>/</span>
                        <Link href={`/gear/${mSlug}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        <span>/</span>
                        <Link href={`/gear/${mSlug}/port-adapters`} className="hover:text-blue-600 transition-colors">Port Adapters</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{adapter.name}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="relative h-72 md:min-h-[20rem] bg-gray-50">
                            <HousingImage
                                src={imageInfo.src}
                                fallback={imageInfo.fallback}
                                alt={adapter.name}
                                className="object-contain p-8"
                            />
                        </div>

                        <div className="p-8 flex flex-col">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                {manufacturer.name} &middot; Port Adapter
                            </div>
                            <h1 className="text-2xl font-bold text-blue-900 mb-6">{adapter.name}</h1>

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

                            {adapter.description && (
                                <p className="text-sm text-gray-600 mb-6">{adapter.description}</p>
                            )}

                            {priceAmount != null && (
                                <div className="text-2xl font-bold text-blue-700 mb-6">
                                    <PriceTag amount={priceAmount} currency={adapter.priceCurrency ?? 'USD'} />
                                </div>
                            )}

                            {adapter.productUrl && (
                                <a
                                    href={adapter.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                                >
                                    View on {manufacturer.name} →
                                </a>
                            )}

                            <div className="mt-auto">
                                <Link
                                    href={`/gear/${mSlug}/port-adapters`}
                                    className="inline-block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    ← Back to {manufacturer.name} Port Adapters
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
