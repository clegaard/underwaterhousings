'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Manufacturer {
    id: string
    name: string
    slug: string
}

interface NavigationProps {
    manufacturers: Manufacturer[]
}

export default function Navigation({ manufacturers }: NavigationProps) {
    const [isHousingsOpen, setIsHousingsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsHousingsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <nav className="bg-white shadow-lg border-b">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <Link href="/" className="text-xl font-bold text-blue-900 hover:text-blue-700 transition-colors">
                            🌊 UW Housings
                        </Link>
                    </div>

                    {/* Navigation Menu */}
                    <div className="flex items-center space-x-8">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                        >
                            Home
                        </Link>

                        {/* Housings Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsHousingsOpen(!isHousingsOpen)}
                                className="flex items-center text-gray-700 hover:text-blue-900 transition-colors font-medium"
                            >
                                Housings
                                <svg
                                    className={`ml-1 h-4 w-4 transition-transform ${isHousingsOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {isHousingsOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {manufacturers.map((manufacturer) => (
                                            <Link
                                                key={manufacturer.id}
                                                href={`/housings/${manufacturer.slug}`}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                                                onClick={() => setIsHousingsOpen(false)}
                                            >
                                                {manufacturer.name}
                                            </Link>
                                        ))}

                                        {manufacturers.length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">
                                                No manufacturers available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional nav items can be added here */}
                        <Link
                            href="/about"
                            className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                        >
                            About
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}