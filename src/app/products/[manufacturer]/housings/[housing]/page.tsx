import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HousingImage } from '@/components/HousingImage'
import ImageGallery from '@/components/ImageGallery'
import GalleryPhotoGrid from '@/components/GalleryPhotoGrid'
import { getAllHousingImages, withBase } from '@/lib/images'
import PriceTag from '@/components/PriceTag'
import ProductReviewsSection from '@/components/ProductReviewsSection'
import { Metadata } from 'next'

interface Props {
    params: Promise<{ manufacturer: string; housing: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { manufacturer: mSlug, housing: housingSlug } = await params
    const housing = await prisma.housing.findFirst({
        where: { slug: housingSlug, manufacturer: { slug: mSlug } },
        include: { manufacturer: true },
    })
    if (!housing) return {}
    return {
        title: `${housing.name} - ${housing.manufacturer.name}`,
        description: housing.description ?? `${housing.name} underwater housing by ${housing.manufacturer.name}`,
    }
}

export default async function HousingDetailPage({ params }: Props) {
    const { manufacturer: mSlug, housing: housingSlug } = await params
    const [manufacturer, housing] = await Promise.all([
        prisma.manufacturer.findUnique({ where: { slug: mSlug } }),
        prisma.housing.findFirst({
            where: { slug: housingSlug, manufacturer: { slug: mSlug } },
            include: {
                manufacturer: true,
                cameras: { include: { brand: true } },
            },
        }),
    ])

    if (!housing || !manufacturer) notFound()

    const housingImages = getAllHousingImages(housing.productPhotos, housing.name)
    const priceAmount = housing.priceAmount ? Number(housing.priceAmount) : null

    const galleryPhotos = await prisma.galleryPhoto.findMany({
        where: { cameraSystem: { housingId: housing.id } },
        orderBy: { takenAt: 'desc' },
        take: 12,
    })

    const specs: { label: string; value: string }[] = []
    if (housing.cameras.length > 0) {
        housing.cameras.forEach(c => specs.push({ label: 'Compatible camera', value: `${c.brand.name} ${c.name}` }))
    }
    if (housing.depthRating) specs.push({ label: 'Depth rating', value: `${housing.depthRating} m` })
    if (housing.material) specs.push({ label: 'Material', value: housing.material })
    specs.push({ label: 'Interchangeable port', value: housing.interchangeablePort ? 'Yes' : 'No' })
    if (housing.cameraMountRecession != null) {
        specs.push({ label: 'Camera mount recession', value: `${housing.cameraMountRecession} mm` })
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2 flex gap-1 items-center flex-wrap">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
                        <span>/</span>
                        <Link href={`/products/${mSlug}`} className="hover:text-blue-600 transition-colors">{manufacturer.name}</Link>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{housing.name}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                    {manufacturer.name} &middot; Housing
                                </div>
                                <h1 className="text-2xl font-bold text-blue-900">{housing.name}</h1>
                            </div>
                            {priceAmount != null && (
                                <div className="text-2xl font-bold text-blue-700">
                                    <PriceTag amount={priceAmount} currency={housing.priceCurrency ?? 'USD'} />
                                </div>
                            )}
                        </div>

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

                        {housing.description && (
                            <p className="text-sm text-gray-600 mb-6">{housing.description}</p>
                        )}

                        <div className="flex gap-3 flex-wrap">
                            {housing.productUrl && (
                                <a
                                    href={housing.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    View on {manufacturer.name} →
                                </a>
                            )}
                            <Link
                                href={`/products/${mSlug}#housings`}
                                className="inline-block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                ← Back to {manufacturer.name} Housings
                            </Link>
                        </div>
                    </div>
                </div>

                {housingImages.length > 0 && (
                    <ImageGallery images={housingImages} />
                )}
            </div>

            {/* Reviews */}
            <ProductReviewsSection productType="housing" productId={housing.id} />

            <div className="max-w-4xl mx-auto px-4 pb-8">
                <GalleryPhotoGrid
                    photos={galleryPhotos}
                    heading="Photos taken with this housing"
                    viewAllHref={`/gallery?housing=${housing.slug}`}
                    viewAllLabel="View all photos in gallery →"
                />
            </div>
        </div>
    )
}
