import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import Link from 'next/link'
import ManufacturersClient from '@/components/ManufacturersClient'

export const metadata: Metadata = {
    title: 'Products - UW Housings',
    description: 'Browse all cameras, lenses, and underwater equipment by manufacturer',
}

export default async function ProductsPage() {
    const [manufacturers, session] = await Promise.all([
        prisma.manufacturer.findMany({
            include: {
                _count: { select: { cameras: true, housings: true, lenses: true, ports: true } },
            },
            orderBy: { name: 'asc' },
        }),
        auth(),
    ])

    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <nav className="text-sm text-gray-500 mb-2">
                                <Link href="/" className="hover:text-blue-600">Home</Link>
                                {' / '}
                                <span className="text-gray-700">Products</span>
                            </nav>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Products</h1>
                            <p className="text-xl text-gray-700">Browse cameras, lenses, and underwater equipment by manufacturer</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{manufacturers.length}</div>
                            <div className="text-sm text-gray-600">Manufacturer{manufacturers.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <ManufacturersClient manufacturers={manufacturers} isSuperuser={isSuperuser} />
            </div>
        </div>
    )
}
