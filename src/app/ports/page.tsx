import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import Link from 'next/link'
import { withBase } from '@/lib/images'

export const metadata: Metadata = {
    title: 'Port Manufacturers - UW Housings',
    description: 'Browse ports by manufacturer',
}

async function getPortManufacturers() {
    try {
        return await prisma.manufacturer.findMany({
            include: {
                ports: true,
                _count: { select: { ports: true } },
            },
            orderBy: { name: 'asc' },
        })
    } catch (error) {
        console.error('Error fetching port manufacturers:', error)
        return []
    }
}

export default async function PortsPage() {
    const [manufacturers, session] = await Promise.all([
        getPortManufacturers(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser
    const withPorts = manufacturers.filter(m => m._count.ports > 0)
    const noPorts = isSuperuser ? manufacturers.filter(m => m._count.ports === 0) : []

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Port Manufacturers</h1>
                            <p className="text-xl text-gray-700">Browse ports by manufacturer</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{withPorts.length}</div>
                            <div className="text-sm text-gray-600">Manufacturer{withPorts.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">All Port Manufacturers</h2>
                </div>

                {withPorts.length > 0 ? (
                    <div className="flex justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full">
                            {withPorts.map((manufacturer) => (
                                <Link
                                    key={manufacturer.id}
                                    href={`/ports/${manufacturer.slug}`}
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
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Ports</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Port Models:</span>
                                                <span className="font-medium text-blue-800">{manufacturer._count.ports}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                                <span>View ports</span>
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
                        <div className="text-6xl mb-4">🔌</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No ports found</h3>
                        <p className="text-gray-600">
                            {isSuperuser
                                ? 'No ports have been added yet. Go to a manufacturer page to add ports.'
                                : 'No ports are currently available.'}
                        </p>
                    </div>
                )}

                {noPorts.length > 0 && (
                    <div className="mt-10 border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Other manufacturers</h3>
                        <div className="flex flex-wrap gap-2">
                            {noPorts.map((m) => (
                                <Link key={m.id} href={`/ports/${m.slug}`}
                                    className="flex items-center gap-2 bg-white rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                                >
                                    {m.logoPath && (
                                        <div className="relative w-4 h-4 overflow-hidden flex-shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={withBase(m.logoPath)} alt="" className="absolute inset-0 w-full h-full object-contain" />
                                        </div>
                                    )}
                                    {m.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
