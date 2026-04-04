import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { auth } from '@/auth'
import ManufacturersClient from '@/components/ManufacturersClient'

export const metadata: Metadata = {
    title: 'Manufacturers - UW Housings',
    description: 'Browse all manufacturers of cameras, housings, lenses and ports',
}

async function getManufacturers() {
    try {
        return await prisma.manufacturer.findMany({
            include: {
                _count: { select: { cameras: true, housings: true, lenses: true, ports: true } },
            },
            orderBy: { name: 'asc' },
        })
    } catch (error) {
        console.error('Error fetching manufacturers:', error)
        return []
    }
}

export default async function ManufacturersPage() {
    const [manufacturers, session] = await Promise.all([
        getManufacturers(),
        auth(),
    ])
    const isSuperuser = !!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-900 mb-2">Manufacturers</h1>
                            <p className="text-xl text-gray-700">All brands in the UW Housings catalog</p>
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
