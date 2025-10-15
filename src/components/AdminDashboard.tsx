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
    const [formData, setFormData] = useState({ name: '', description: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch('/api/admin/housing-manufacturers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const newManufacturer = await response.json()
                onDataUpdate([...manufacturers, newManufacturer])
                setFormData({ name: '', description: '' })
                setIsAdding(false)
            }
        } catch (error) {
            console.error('Error adding manufacturer:', error)
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
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Manufacturer
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Add New Housing Manufacturer</h3>
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
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
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
                            <button
                                onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
                                className="ml-4 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                            >
                                Delete
                            </button>
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
    const [formData, setFormData] = useState({ name: '', isActive: true })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch('/api/admin/camera-manufacturers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const newManufacturer = await response.json()
                onDataUpdate([...manufacturers, newManufacturer])
                setFormData({ name: '', isActive: true })
                setIsAdding(false)
            }
        } catch (error) {
            console.error('Error adding manufacturer:', error)
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
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Manufacturer
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Add New Camera Manufacturer</h3>
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
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
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
                            <button
                                onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
                                className="ml-4 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                            >
                                Delete
                            </button>
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
    const [formData, setFormData] = useState({ name: '', cameraManufacturerId: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch('/api/admin/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const newCamera = await response.json()
                onDataUpdate([...cameras, newCamera])
                setFormData({ name: '', cameraManufacturerId: '' })
                setIsAdding(false)
            }
        } catch (error) {
            console.error('Error adding camera:', error)
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
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Camera
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Add New Camera</h3>
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
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
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
                            <button
                                onClick={() => handleDelete(camera.id, camera.name)}
                                className="ml-4 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                            >
                                Delete
                            </button>
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch('/api/admin/housings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    priceAmount: formData.priceAmount ? parseFloat(formData.priceAmount) : null
                })
            })

            if (response.ok) {
                const newHousing = await response.json()
                onDataUpdate([...housings, newHousing])
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
                setIsAdding(false)
            }
        } catch (error) {
            console.error('Error adding housing:', error)
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
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Housing
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Add New Housing</h3>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Depth Rating</label>
                                <input
                                    type="text"
                                    value={formData.depthRating}
                                    onChange={(e) => setFormData({ ...formData, depthRating: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 40m/130ft"
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
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
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
                                        {housing.depthRating}
                                    </span>
                                )}
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