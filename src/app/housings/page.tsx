import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import Link from 'next/link'
import { withBase } from '@/lib/images'

export const metadata: Metadata = {
    title: 'Housing Manufacturers - UW Housings',
    description: 'Browse underwater camera housings by manufacturer',
}

async function getHousingManufacturers() {
    try {
        return await prisma.manufacturer.findMany({
            include: {
                _count: {
                    select: { housings: true }
                }
            },
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error('Error fetching housing manufacturers:', error)
        return []
    }
}

export default async function HousingsPage() {
    const [manufacturers, session] = await Promise.all([
        getHousingManufacturers(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser
    const visible = isSuperuser ? manufacturers : manufacturers.filter(m => m._count.housings > 0)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Housing Manufacturers</h1>
                            <p className="text-xl text-gray-700">
                                Browse underwater housings by manufacturer
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{visible.length}</div>
                            <div className="text-sm text-gray-600">Manufacturer{visible.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {visible.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visible.map((manufacturer) => (
                            <Link
                                key={manufacturer.id}
                                href={`/housings/${manufacturer.slug}`}
                                className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                            >
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
                                            Housings
                                        </span>
                                    </div>
                                </div>
                                {manufacturer.description && (
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{manufacturer.description}</p>
                                )}
                                <div className="flex justify-between text-sm mb-4">
                                    <span className="text-gray-600">Housing Models:</span>
                                    <span className="font-medium text-blue-800">{manufacturer._count.housings}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                        <span>View housings</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm max-w-md">
                            <div className="text-6xl mb-4">🏠</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No housing manufacturers found</h3>
                            <p className="text-gray-600">No housing manufacturers are currently available.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
