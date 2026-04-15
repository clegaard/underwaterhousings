import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'
import { Metadata } from 'next'

interface Props {
    params: { manufacturer: string; item: string }
}

async function findItem(manufacturerSlug: string, itemSlug: string) {
    const [manufacturer, port, ring, adapter] = await Promise.all([
        prisma.manufacturer.findUnique({ where: { slug: manufacturerSlug } }),
        prisma.port.findFirst({
            where: { slug: itemSlug, manufacturer: { slug: manufacturerSlug } },
            include: { housingMount: true, manufacturer: true },
        }),
        prisma.extensionRing.findFirst({
            where: { slug: itemSlug, manufacturer: { slug: manufacturerSlug } },
            include: { housingMount: true, manufacturer: true },
        }),
        prisma.portAdapter.findFirst({
            where: { slug: itemSlug, manufacturer: { slug: manufacturerSlug } },
            include: { inputHousingMount: true, outputHousingMount: true, manufacturer: true },
        }),
    ])

    if (port) return { kind: 'port' as const, item: port, manufacturer }
    if (ring) return { kind: 'extensionRing' as const, item: ring, manufacturer }
    if (adapter) return { kind: 'portAdapter' as const, item: adapter, manufacturer }
    return { kind: null as null, item: null, manufacturer }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { item, manufacturer } = await findItem(params.manufacturer, params.item)
    if (!item || !manufacturer) return {}
    return {
        title: `${item.name} - ${manufacturer.name}`,
        description: (item as { description?: string | null }).description ?? `${item.name} from ${manufacturer.name}`,
    }
}

export default async function GearItemPage({ params }: Props) {
    const { kind, item, manufacturer } = await findItem(params.manufacturer, params.item)

    if (!item || !manufacturer || !kind) notFound()

    const imageInfo = getPortImagePathWithFallback(item.productPhotos)
    const priceAmount = (item as { priceAmount?: unknown }).priceAmount
        ? parseFloat(String((item as { priceAmount?: unknown }).priceAmount))
        : null
    const priceCurrency = (item as { priceCurrency?: string | null }).priceCurrency ?? 'USD'
    const description = (item as { description?: string | null }).description

    let subtitle = ''
    let specs: { label: string; value: string }[] = []

    if (kind === 'port') {
        subtitle = 'Port'
        const p = item as typeof item & { housingMount: { name: string; slug: string } | null; isFlatPort: boolean; hemisphereWidth: number | null; depthRating: number | null }
        if (p.housingMount) {
            specs.push({ label: 'Mount system', value: p.housingMount.name })
        }
        specs.push({ label: 'Type', value: p.isFlatPort ? 'Flat port' : 'Dome port' })
        if (!p.isFlatPort && p.hemisphereWidth != null) {
            specs.push({ label: 'Dome width', value: `${p.hemisphereWidth} mm` })
        }
        if (p.depthRating != null) {
            specs.push({ label: 'Depth rating', value: `${p.depthRating} m` })
        }
    } else if (kind === 'extensionRing') {
        subtitle = 'Extension Ring'
        const r = item as typeof item & { housingMount: { name: string } | null; lengthMm: number | null }
        if (r.housingMount) {
            specs.push({ label: 'Mount system', value: r.housingMount.name })
        }
        if (r.lengthMm != null) {
            specs.push({ label: 'Length', value: `${r.lengthMm} mm` })
        }
    } else if (kind === 'portAdapter') {
        subtitle = 'Port Adapter'
        const a = item as typeof item & { inputHousingMount: { name: string } | null; outputHousingMount: { name: string } | null }
        if (a.inputHousingMount) {
            specs.push({ label: 'Input mount', value: a.inputHousingMount.name })
        }
        if (a.outputHousingMount) {
            specs.push({ label: 'Output mount', value: a.outputHousingMount.name })
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2 flex gap-1 items-center flex-wrap">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        <span>/</span>
                        <Link href={`/gear/${params.manufacturer}`} className="hover:text-blue-600 transition-colors capitalize">
                            {manufacturer.name}
                        </Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{item.name}</span>
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
                                alt={item.name}
                                className="object-contain p-8"
                            />
                        </div>

                        {/* Details */}
                        <div className="p-8 flex flex-col">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                {manufacturer.name} &middot; {subtitle}
                            </div>
                            <h1 className="text-2xl font-bold text-blue-900 mb-6">{item.name}</h1>

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

                            {description && (
                                <p className="text-sm text-gray-600 mb-6">{description}</p>
                            )}

                            {priceAmount != null && (
                                <div className="text-2xl font-bold text-blue-700 mb-6">
                                    {priceCurrency} {priceAmount.toFixed(2)}
                                </div>
                            )}

                            <div className="mt-auto">
                                <Link
                                    href={`/gear/${params.manufacturer}`}
                                    className="inline-block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    ← Back to {manufacturer.name}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
