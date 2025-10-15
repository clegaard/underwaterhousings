'use client'

import { useState } from 'react'

interface AdminData {
    housingManufacturers: any[]
    cameraManufacturers: any[]
    cameras: any[]
    housings: any[]
}

interface AdminDashboardProps {
    initialData: AdminData
}

export default function AdminDashboard({ initialData }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState('housings')
    const [data, setData] = useState(initialData)

    const tabs = [
        { id: 'housings', label: 'Housings', count: data.housings.length },
        { id: 'cameras', label: 'Cameras', count: data.cameras.length },
        { id: 'housingManufacturers', label: 'Housing Manufacturers', count: data.housingManufacturers.length },
        { id: 'cameraManufacturers', label: 'Camera Manufacturers', count: data.cameraManufacturers.length },
    ]

    return (
        <div className="bg-white rounded-lg shadow-sm">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                            <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'housings' && (
                    <HousingsManagement
                        housings={data.housings}
                        housingManufacturers={data.housingManufacturers}
                        cameras={data.cameras}
                        onDataUpdate={(newData) => setData({ ...data, housings: newData })}
                    />
                )}

                {activeTab === 'cameras' && (
                    <CamerasManagement
                        cameras={data.cameras}
                        cameraManufacturers={data.cameraManufacturers}
                        onDataUpdate={(newData) => setData({ ...data, cameras: newData })}
                    />
                )}

                {activeTab === 'housingManufacturers' && (
                    <HousingManufacturersManagement
                        manufacturers={data.housingManufacturers}
                        onDataUpdate={(newData) => setData({ ...data, housingManufacturers: newData })}
                    />
                )}

                {activeTab === 'cameraManufacturers' && (
                    <CameraManufacturersManagement
                        manufacturers={data.cameraManufacturers}
                        onDataUpdate={(newData) => setData({ ...data, cameraManufacturers: newData })}
                    />
                )}
            </div>
        </div>
    )
}

// Housing Manufacturers Management Component
function HousingManufacturersManagement({ manufacturers, onDataUpdate }: {
    manufacturers: any[],
    onDataUpdate: (data: any[]) => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', description: '' })

    const resetForm = () => {
        setFormData({ name: '', description: '' })
    }

    const startEdit = (manufacturer: any) => {
        setFormData({
            name: manufacturer.name || '',
            description: manufacturer.description || ''
        })
        setEditingId(manufacturer.id)
        setIsAdding(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        resetForm()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const isEditing = editingId !== null
            const url = isEditing ? `/api/admin/housing-manufacturers?id=${editingId}` : '/api/admin/housing-manufacturers'
            const method = isEditing ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const updatedManufacturer = await response.json()
                if (isEditing) {
                    onDataUpdate(manufacturers.map(m => m.id === editingId ? updatedManufacturer : m))
                } else {
                    onDataUpdate([...manufacturers, updatedManufacturer])
                }
                resetForm()
                setIsAdding(false)
                setEditingId(null)
            }
        } catch (error) {
            console.error('Error saving manufacturer:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/housing-manufacturers?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onDataUpdate(manufacturers.filter(m => m.id !== id))
            } else {
                const error = await response.json()
                alert(error.error || 'Failed to delete manufacturer')
            }
        } catch (error) {
            console.error('Error deleting manufacturer:', error)
            alert('Failed to delete manufacturer')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Housing Manufacturers</h2>
                <button
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        resetForm()
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Manufacturer
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                        {editingId ? 'Edit Housing Manufacturer' : 'Add New Housing Manufacturer'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false)
                                    cancelEdit()
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {manufacturers.map((manufacturer) => (
                    <div key={manufacturer.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{manufacturer.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{manufacturer.description}</p>
                                <p className="text-xs text-gray-500 mt-2">Slug: {manufacturer.slug}</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                <button
                                    onClick={() => startEdit(manufacturer)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Camera Manufacturers Management Component
function CameraManufacturersManagement({ manufacturers, onDataUpdate }: {
    manufacturers: any[],
    onDataUpdate: (data: any[]) => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', isActive: true })

    const resetForm = () => {
        setFormData({ name: '', isActive: true })
    }

    const startEdit = (manufacturer: any) => {
        setFormData({
            name: manufacturer.name || '',
            isActive: manufacturer.isActive !== undefined ? manufacturer.isActive : true
        })
        setEditingId(manufacturer.id)
        setIsAdding(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        resetForm()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const isEditing = editingId !== null
            const url = isEditing ? `/api/admin/camera-manufacturers?id=${editingId}` : '/api/admin/camera-manufacturers'
            const method = isEditing ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const updatedManufacturer = await response.json()
                if (isEditing) {
                    onDataUpdate(manufacturers.map(m => m.id === editingId ? updatedManufacturer : m))
                } else {
                    onDataUpdate([...manufacturers, updatedManufacturer])
                }
                resetForm()
                setIsAdding(false)
                setEditingId(null)
            }
        } catch (error) {
            console.error('Error saving manufacturer:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/camera-manufacturers?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onDataUpdate(manufacturers.filter(m => m.id !== id))
            } else {
                const error = await response.json()
                alert(error.error || 'Failed to delete manufacturer')
            }
        } catch (error) {
            console.error('Error deleting manufacturer:', error)
            alert('Failed to delete manufacturer')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Camera Manufacturers</h2>
                <button
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        resetForm()
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Manufacturer
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                        {editingId ? 'Edit Camera Manufacturer' : 'Add New Camera Manufacturer'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                Active
                            </label>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false)
                                    cancelEdit()
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {manufacturers.map((manufacturer) => (
                    <div key={manufacturer.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">{manufacturer.name}</h3>
                                    <span className={`px-2 py-1 text-xs rounded-full ${manufacturer.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {manufacturer.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Slug: {manufacturer.slug}</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                <button
                                    onClick={() => startEdit(manufacturer)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Cameras Management Component
function CamerasManagement({ cameras, cameraManufacturers, onDataUpdate }: {
    cameras: any[],
    cameraManufacturers: any[],
    onDataUpdate: (data: any[]) => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', cameraManufacturerId: '' })

    const resetForm = () => {
        setFormData({ name: '', cameraManufacturerId: '' })
    }

    const startEdit = (camera: any) => {
        setFormData({
            name: camera.name || '',
            cameraManufacturerId: camera.cameraManufacturerId || ''
        })
        setEditingId(camera.id)
        setIsAdding(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        resetForm()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const isEditing = editingId !== null
            const url = isEditing ? `/api/admin/cameras?id=${editingId}` : '/api/admin/cameras'
            const method = isEditing ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const updatedCamera = await response.json()
                if (isEditing) {
                    onDataUpdate(cameras.map(c => c.id === editingId ? updatedCamera : c))
                } else {
                    onDataUpdate([...cameras, updatedCamera])
                }
                resetForm()
                setIsAdding(false)
                setEditingId(null)
            }
        } catch (error) {
            console.error('Error saving camera:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/cameras?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onDataUpdate(cameras.filter(c => c.id !== id))
            } else {
                const error = await response.json()
                alert(error.error || 'Failed to delete camera')
            }
        } catch (error) {
            console.error('Error deleting camera:', error)
            alert('Failed to delete camera')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Cameras</h2>
                <button
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        resetForm()
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Camera
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                        {editingId ? 'Edit Camera' : 'Add New Camera'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                            <select
                                value={formData.cameraManufacturerId}
                                onChange={(e) => setFormData({ ...formData, cameraManufacturerId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a manufacturer</option>
                                {cameraManufacturers.map((manufacturer) => (
                                    <option key={manufacturer.id} value={manufacturer.id}>
                                        {manufacturer.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false)
                                    cancelEdit()
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {cameras.map((camera) => (
                    <div key={camera.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">{camera.name}</h3>
                                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                        {camera.brand?.name}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Slug: {camera.slug}</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                <button
                                    onClick={() => startEdit(camera)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(camera.id, camera.name)}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Housings Management Component
function HousingsManagement({ housings, housingManufacturers, cameras, onDataUpdate }: {
    housings: any[],
    housingManufacturers: any[],
    cameras: any[],
    onDataUpdate: (data: any[]) => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        model: '',
        name: '',
        description: '',
        priceAmount: '',
        priceCurrency: 'USD',
        depthRating: '',
        material: '',
        housingManufacturerId: '',
        cameraId: ''
    })

    const resetForm = () => {
        setFormData({
            model: '',
            name: '',
            description: '',
            priceAmount: '',
            priceCurrency: 'USD',
            depthRating: '',
            material: '',
            housingManufacturerId: '',
            cameraId: ''
        })
    }

    const startEdit = (housing: any) => {
        setFormData({
            model: housing.model || '',
            name: housing.name || '',
            description: housing.description || '',
            priceAmount: housing.priceAmount?.toString() || '',
            priceCurrency: housing.priceCurrency || 'USD',
            depthRating: housing.depthRating?.toString() || '',
            material: housing.material || '',
            housingManufacturerId: housing.housingManufacturerId || '',
            cameraId: housing.cameraId || ''
        })
        setEditingId(housing.id)
        setIsAdding(false)
    }

    const cancelEdit = () => {
        setEditingId(null)
        resetForm()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const isEditing = editingId !== null
            const url = isEditing ? `/api/admin/housings?id=${editingId}` : '/api/admin/housings'
            const method = isEditing ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    priceAmount: formData.priceAmount ? parseFloat(formData.priceAmount) : null,
                    depthRating: formData.depthRating ? parseInt(formData.depthRating) : null
                })
            })

            if (response.ok) {
                const updatedHousing = await response.json()
                if (isEditing) {
                    onDataUpdate(housings.map(h => h.id === editingId ? updatedHousing : h))
                } else {
                    onDataUpdate([...housings, updatedHousing])
                }
                resetForm()
                setIsAdding(false)
                setEditingId(null)
            }
        } catch (error) {
            console.error('Error saving housing:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/housings?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onDataUpdate(housings.filter(h => h.id !== id))
            } else {
                const error = await response.json()
                alert(error.error || 'Failed to delete housing')
            }
        } catch (error) {
            console.error('Error deleting housing:', error)
            alert('Failed to delete housing')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Housings</h2>
                <button
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        resetForm()
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Housing
                </button>
            </div>

            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                        {editingId ? 'Edit Housing' : 'Add New Housing'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.priceAmount}
                                    onChange={(e) => setFormData({ ...formData, priceAmount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={formData.priceCurrency}
                                    onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Depth Rating (meters)</label>
                                <input
                                    type="number"
                                    value={formData.depthRating}
                                    onChange={(e) => setFormData({ ...formData, depthRating: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 40"
                                    min="0"
                                    max="1000"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                                <input
                                    type="text"
                                    value={formData.material}
                                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Aluminum"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Housing Manufacturer</label>
                                <select
                                    value={formData.housingManufacturerId}
                                    onChange={(e) => setFormData({ ...formData, housingManufacturerId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select manufacturer</option>
                                    {housingManufacturers.map((manufacturer) => (
                                        <option key={manufacturer.id} value={manufacturer.id}>
                                            {manufacturer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Compatible Camera</label>
                                <select
                                    value={formData.cameraId}
                                    onChange={(e) => setFormData({ ...formData, cameraId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select camera</option>
                                    {cameras.map((camera) => (
                                        <option key={camera.id} value={camera.id}>
                                            {camera.brand?.name} {camera.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false)
                                    cancelEdit()
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {housings.map((housing) => (
                    <div key={housing.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{housing.model}</h3>
                                <p className="text-sm text-gray-600 mt-1">{housing.name}</p>
                                <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                                    <span>Manufacturer: {housing.manufacturer?.name}</span>
                                    <span>Camera: {housing.Camera?.brand?.name} {housing.Camera?.name}</span>
                                    {housing.priceAmount && (
                                        <span>Price: ${housing.priceAmount} {housing.priceCurrency}</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Slug: {housing.slug}</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                {housing.depthRating && (
                                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {housing.depthRating}m
                                    </span>
                                )}
                                <button
                                    onClick={() => startEdit(housing)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(housing.id, housing.name)}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}