import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getPortImagePathWithFallback } from '@/lib/images'
import ExtensionRingsClient from '@/components/ExtensionRingsClient'

interface Props {
    params: Promise<{ manufacturer: string }>
}

async function getData(slug: string) {
    const manufacturer = await prisma.manufacturer.findUnique({
        where: { slug },
        include: {
            extensionRings: {
                include: { housingMount: true },
                orderBy: { name: 'asc' },
            },
            housingMounts: { orderBy: { name: 'asc' } },
            _count: { select: { extensionRings: true } },
        },
    })
    return { manufacturer }
}

export async function generateMetadata({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const { manufacturer } = await getData(mSlug)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Extension Rings`,
        description: `Browse all ${manufacturer._count.extensionRings} extension rings from ${manufacturer.name}`,
    }
}

export default async function ExtensionRingsListingPage({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const [{ manufacturer }, session] = await Promise.all([
        getData(mSlug),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const ringsData = manufacturer.extensionRings.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        housingMount: r.housingMount,
        lengthMm: r.lengthMm,
        priceAmount: r.priceAmount ? parseFloat(r.priceAmount.toString()) : null,
        priceCurrency: r.priceCurrency,
        productPhotos: r.productPhotos,
        imageInfo: getPortImagePathWithFallback(r.productPhotos),
        productId: r.productId ?? null,
        productUrl: r.productUrl ?? null,
    }))

    const housingMounts = manufacturer.housingMounts.map(m => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
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
                        <span className="text-gray-700">Extension Rings</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Extension Rings</h1>
                    <p className="text-gray-500 mt-1">
                        {manufacturer._count.extensionRings} extension ring{manufacturer._count.extensionRings !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <ExtensionRingsClient
                    rings={ringsData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    housingMounts={housingMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
