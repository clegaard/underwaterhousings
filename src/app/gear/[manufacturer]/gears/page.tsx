import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getPortImagePathWithFallback } from '@/lib/images'
import GearsClient from '@/components/GearsClient'

interface Props {
    params: Promise<{ manufacturer: string }>
}

async function getData(slug: string) {
    const [manufacturer, allLenses] = await Promise.all([
        prisma.manufacturer.findUnique({
            where: { slug },
            include: {
                gears: {
                    include: { lenses: { select: { id: true, name: true } } },
                    orderBy: { name: 'asc' },
                },
                _count: { select: { gears: true } },
            },
        }),
        prisma.lens.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ])
    return { manufacturer, allLenses }
}

export async function generateMetadata({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const { manufacturer } = await getData(mSlug)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Gears`,
        description: `Browse all ${manufacturer._count.gears} gears from ${manufacturer.name}`,
    }
}

export default async function GearsListingPage({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const [{ manufacturer, allLenses }, session] = await Promise.all([
        getData(mSlug),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const gearsData = manufacturer.gears.map(g => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        priceAmount: g.priceAmount ? parseFloat(g.priceAmount.toString()) : null,
        priceCurrency: g.priceCurrency,
        productPhotos: g.productPhotos,
        imageInfo: getPortImagePathWithFallback(g.productPhotos),
        lenses: g.lenses,
        productId: g.productId ?? null,
        productUrl: g.productUrl ?? null,
    }))

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        {' / '}
                        <Link href="/gear" className="hover:text-blue-600 transition-colors">Gear</Link>
                        {' / '}
                        <Link href={`/gear/${mSlug}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        {' / '}
                        <span className="text-gray-700">Gears</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Gears</h1>
                    <p className="text-gray-500 mt-1">
                        {manufacturer._count.gears} gear{manufacturer._count.gears !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <GearsClient
                    gears={gearsData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    allLenses={allLenses}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
