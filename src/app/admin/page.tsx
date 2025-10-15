import { prisma } from '@/lib/prisma'
import AdminDashboard from '@/components/AdminDashboard'

async function getAdminData() {
    try {
        const [housingManufacturers, cameraManufacturers, cameras, housings] = await Promise.all([
            prisma.housingManufacturer.findMany({
                orderBy: { name: 'asc' }
            }),
            prisma.cameraManufacturer.findMany({
                orderBy: { name: 'asc' }
            }),
            prisma.camera.findMany({
                include: {
                    brand: true
                },
                orderBy: { name: 'asc' }
            }),
            prisma.housing.findMany({
                include: {
                    manufacturer: true,
                    Camera: {
                        include: {
                            brand: true
                        }
                    }
                },
                orderBy: { model: 'asc' }
            })
        ])

        return {
            housingManufacturers,
            cameraManufacturers,
            cameras,
            housings
        }
    } catch (error) {
        console.error('Error fetching admin data:', error)
        return {
            housingManufacturers: [],
            cameraManufacturers: [],
            cameras: [],
            housings: []
        }
    }
}

export default async function AdminPage() {
    const data = await getAdminData()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage manufacturers, cameras, and housings</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <AdminDashboard initialData={data} />
            </div>
        </div>
    )
}