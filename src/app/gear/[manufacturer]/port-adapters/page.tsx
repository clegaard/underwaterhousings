import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import Link from 'next/link'
import { getPortImagePathWithFallback } from '@/lib/images'
import PortAdaptersClient from '@/components/PortAdaptersClient'

interface Props {
    params: Promise<{ manufacturer: string }>
}

async function getData(slug: string) {
    const manufacturer = await prisma.manufacturer.findUnique({
        where: { slug },
        include: {
            portAdapters: {
                include: { inputHousingMount: true, outputHousingMount: true },
                orderBy: { name: 'asc' },
            },
            housingMounts: { orderBy: { name: 'asc' } },
            _count: { select: { portAdapters: true } },
        },
    })
    return { manufacturer }
}

export async function generateMetadata({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const { manufacturer } = await getData(mSlug)
    if (!manufacturer) return {}
    return {
        title: `${manufacturer.name} Port Adapters`,
        description: `Browse all ${manufacturer._count.portAdapters} port adapters from ${manufacturer.name}`,
    }
}

export default async function PortAdaptersListingPage({ params }: Props) {
    const { manufacturer: mSlug } = await params
    const [{ manufacturer }, session] = await Promise.all([
        getData(mSlug),
        auth(),
    ])

    if (!manufacturer) notFound()

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    const adaptersData = manufacturer.portAdapters.map(a => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        inputHousingMount: a.inputHousingMount,
        outputHousingMount: a.outputHousingMount,
        priceAmount: a.priceAmount ? parseFloat(a.priceAmount.toString()) : null,
        priceCurrency: a.priceCurrency,
        productPhotos: a.productPhotos,
        imageInfo: getPortImagePathWithFallback(a.productPhotos),
        productId: a.productId ?? null,
        productUrl: a.productUrl ?? null,
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
                        <Link href={`/gear/${mSlug}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        {' / '}
                        <span className="text-gray-700">Port Adapters</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">{manufacturer.name} Port Adapters</h1>
                    <p className="text-gray-500 mt-1">
                        {manufacturer._count.portAdapters} port adapter{manufacturer._count.portAdapters !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <PortAdaptersClient
                    adapters={adaptersData}
                    manufacturer={{ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug }}
                    housingMounts={housingMounts}
                    isSuperuser={isSuperuser}
                />
            </div>
        </div>
    )
}
