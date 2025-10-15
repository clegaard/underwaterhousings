'use client'

import { useEffect, useState } from 'react'
import Navigation from './Navigation'

interface Manufacturer {
    id: string
    name: string
    slug: string
}

export default function NavigationWrapper() {
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
    const [cameraManufacturers, setCameraManufacturers] = useState<Manufacturer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [manufacturersResponse, cameraManufacturersResponse] = await Promise.all([
                    fetch('/api/manufacturers?simple=true'),
                    fetch('/api/camera-manufacturers?simple=true')
                ])

                if (manufacturersResponse.ok) {
                    const manufacturersData = await manufacturersResponse.json()
                    setManufacturers(manufacturersData)
                }

                if (cameraManufacturersResponse.ok) {
                    const cameraManufacturersData = await cameraManufacturersResponse.json()
                    setCameraManufacturers(cameraManufacturersData)
                }
            } catch (error) {
                console.error('Failed to fetch manufacturers:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <nav className="bg-white shadow-lg border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="text-xl font-bold text-blue-900">🌊 UW Housings</div>
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="text-gray-700">Loading...</div>
                        </div>
                    </div>
                </div>
            </nav>
        )
    }

    return <Navigation manufacturers={manufacturers} cameraManufacturers={cameraManufacturers} />
}