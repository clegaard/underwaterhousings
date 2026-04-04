import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import Link from 'next/link'
import { withBase } from '@/lib/images'

export const metadata: Metadata = {
    title: 'Lens Manufacturers - UW Housings',
    description: 'Browse lenses by manufacturer',
}

async function getLensManufacturers() {
    try {
        return await prisma.manufacturer.findMany({
            include: {
                lenses: true,
                _count: { select: { lenses: true } },
            },
            orderBy: { name: 'asc' },
        })
    } catch (error) {
        console.error('Error fetching lens manufacturers:', error)
        return []
    }
}

export default async function LensesPage() {
    const [manufacturers, session] = await Promise.all([
        getLensManufacturers(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser
    const withLenses = manufacturers.filter(m => m._count.lenses > 0)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Lens Manufacturers</h1>
                            <p className="text-xl text-gray-700">Browse lenses by manufacturer</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{withLenses.length}</div>
                            <div className="text-sm text-gray-600">Manufacturer{withLenses.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">All Lens Manufacturers</h2>
                    <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        ← Back to Home
                    </Link>
                </div>

                {withLenses.length > 0 ? (
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full">
                            {withLenses.map((manufacturer) => (
                                <Link
                                    key={manufacturer.id}
                                    href={`/lenses/${manufacturer.slug}`}
                                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 block group"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start gap-3 mb-3">
                                            {manufacturer.logoPath && (
                                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 mt-0.5">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={withBase(manufacturer.logoPath)} alt={`${manufacturer.name} logo`} className="absolute inset-0 w-full h-full object-contain p-1" />
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start flex-1">
                                                <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                    {manufacturer.name}
                                                </h3>
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    Lenses
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Lens Models:</span>
                                                <span className="font-medium text-blue-800">{manufacturer._count.lenses}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                <span>View lenses</span>
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <div className="text-6xl mb-4">🔭</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No lenses found</h3>
                        <p className="text-gray-600">
                            {isSuperuser
                                ? 'No lenses have been added yet. Go to a manufacturer page to add lenses.'
                                : 'No lenses are currently available.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
