import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HousingImage } from '@/components/HousingImage'
import { getPortImagePathWithFallback } from '@/lib/images'
import PriceTag from '@/components/PriceTag'
import { Metadata } from 'next'

interface Props {
    params: Promise<{ manufacturer: string; gear: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { manufacturer: mSlug, gear: gearSlug } = await params
    const gear = await prisma.gear.findFirst({
        where: { slug: gearSlug, manufacturer: { slug: mSlug } },
        include: { manufacturer: true },
    })
    if (!gear || !gear.manufacturer) return {}
    return {
        title: `${gear.name} - ${gear.manufacturer.name}`,
        description: gear.description ?? `${gear.name} gear by ${gear.manufacturer.name}`,
    }
}

export default async function GearDetailPage({ params }: Props) {
    const { manufacturer: mSlug, gear: gearSlug } = await params
    const [manufacturer, gear] = await Promise.all([
        prisma.manufacturer.findUnique({ where: { slug: mSlug } }),
        prisma.gear.findFirst({
            where: { slug: gearSlug, manufacturer: { slug: mSlug } },
            include: {
                manufacturer: true,
                lenses: { select: { id: true, name: true, slug: true } },
            },
        }),
    ])

    if (!gear || !manufacturer) notFound()

    const imageInfo = getPortImagePathWithFallback(gear.productPhotos)
    const priceAmount = gear.priceAmount ? parseFloat(gear.priceAmount.toString()) : null

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
                        <Link href={`/gear/${mSlug}/gears`} className="hover:text-blue-600 transition-colors">Gears</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{gear.name}</span>
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
                                alt={gear.name}
                                className="object-contain p-8"
                            />
                        </div>

                        <div className="p-8 flex flex-col">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                {manufacturer.name} &middot; Gear
                            </div>
                            <h1 className="text-2xl font-bold text-blue-900 mb-6">{gear.name}</h1>

                            {gear.description && (
                                <p className="text-sm text-gray-600 mb-6">{gear.description}</p>
                            )}

                            {priceAmount != null && (
                                <div className="text-2xl font-bold text-blue-700 mb-6">
                                    <PriceTag amount={priceAmount} currency={gear.priceCurrency ?? 'USD'} />
                                </div>
                            )}

                            {gear.lenses.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compatible lenses</p>
                                    <ul className="space-y-1">
                                        {gear.lenses.map(l => (
                                            <li key={l.id} className="text-sm text-gray-800">• {l.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {gear.productUrl && (
                                <a
                                    href={gear.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                                >
                                    View on {manufacturer.name} →
                                </a>
                            )}

                            <div className="mt-auto">
                                <Link
                                    href={`/gear/${mSlug}/gears`}
                                    className="inline-block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    ← Back to {manufacturer.name} Gears
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
