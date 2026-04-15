import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import Link from 'next/link'
import Image from 'next/image'
import { withBase } from '@/lib/images'

export const metadata: Metadata = {
    title: 'Housings, Ports & Accessories - UW Housings',
    description: 'Browse underwater camera housings, ports, and accessories by manufacturer',
}

export default async function GearPage() {
    const [manufacturers, session] = await Promise.all([
        prisma.manufacturer.findMany({
            include: {
                _count: {
                    select: { housings: true, ports: true, extensionRings: true, portAdapters: true },
                },
            },
            orderBy: { name: 'asc' },
        }),
        auth(),
    ])

    // Only show manufacturers with at least one housing, port, extension ring, or port adapter
    const gearManufacturers = manufacturers.filter(
        m =>
            m._count.housings > 0 ||
            m._count.ports > 0 ||
            m._count.extensionRings > 0 ||
            m._count.portAdapters > 0,
    )

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <nav className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-blue-600">Home</Link>
                        {' / '}
                        <span className="text-gray-700">Housings, Ports &amp; Accessories</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-blue-900">Housings, Ports &amp; Accessories</h1>
                    <p className="text-gray-600 mt-1">Browse underwater camera housings, ports, and accessories by manufacturer</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gearManufacturers.map(m => (
                        <Link
                            key={m.id}
                            href={`/gear/${m.slug}`}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all p-6 flex flex-col gap-3"
                        >
                            {m.logoPath && (
                                <div className="h-12 flex items-center">
                                    <Image
                                        src={withBase(m.logoPath)}
                                        alt={`${m.name} logo`}
                                        width={160}
                                        height={48}
                                        className="h-10 w-auto object-contain"
                                    />
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-blue-900">{m.name}</h2>
                            {m.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">{m.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                {m._count.housings > 0 && (
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                        {m._count.housings} housing{m._count.housings !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {m._count.ports > 0 && (
                                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                                        {m._count.ports} port{m._count.ports !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {m._count.extensionRings > 0 && (
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                                        {m._count.extensionRings} extension ring{m._count.extensionRings !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {m._count.portAdapters > 0 && (
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                                        {m._count.portAdapters} adapter{m._count.portAdapters !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>

                {gearManufacturers.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        No gear data available yet.
                    </div>
                )}
            </div>
        </div>
    )
}
