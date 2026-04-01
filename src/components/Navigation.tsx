'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

interface Manufacturer {
    id: string
    name: string
    slug: string
}

interface NavigationProps {
    manufacturers: Manufacturer[]
    cameraManufacturers: Manufacturer[]
}

export default function Navigation({ manufacturers, cameraManufacturers }: NavigationProps) {
    const { data: session } = useSession()
    const [isHousingsOpen, setIsHousingsOpen] = useState(false)
    const [isCamerasOpen, setIsCamerasOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const housingsDropdownRef = useRef<HTMLDivElement>(null)
    const camerasDropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (housingsDropdownRef.current && !housingsDropdownRef.current.contains(event.target as Node)) {
                setIsHousingsOpen(false)
            }
            if (camerasDropdownRef.current && !camerasDropdownRef.current.contains(event.target as Node)) {
                setIsCamerasOpen(false)
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
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
                        <div className="relative" ref={housingsDropdownRef}>
                            <div className="flex items-center">
                                <Link
                                    href="/housings"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                                    onClick={() => setIsHousingsOpen(false)}
                                >
                                    Housings
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsHousingsOpen(!isHousingsOpen)
                                        setIsCamerasOpen(false)
                                    }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse housing manufacturers"
                                >
                                    <svg
                                        className={`h-4 w-4 transition-transform ${isHousingsOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

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

                        {/* Cameras Dropdown */}
                        <div className="relative" ref={camerasDropdownRef}>
                            <div className="flex items-center">
                                <Link
                                    href="/cameras"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                                    onClick={() => setIsCamerasOpen(false)}
                                >
                                    Cameras
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsCamerasOpen(!isCamerasOpen)
                                        setIsHousingsOpen(false)
                                    }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse camera manufacturers"
                                >
                                    <svg
                                        className={`h-4 w-4 transition-transform ${isCamerasOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {isCamerasOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {cameraManufacturers.map((manufacturer) => (
                                            <Link
                                                key={manufacturer.id}
                                                href={`/cameras/${manufacturer.slug}`}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                                                onClick={() => setIsCamerasOpen(false)}
                                            >
                                                {manufacturer.name}
                                            </Link>
                                        ))}

                                        {cameraManufacturers.length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">
                                                No camera manufacturers available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link
                            href="/gallery"
                            className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                        >
                            Gallery
                        </Link>

                        {/* Additional nav items can be added here */}
                        <Link
                            href="/about"
                            className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                        >
                            About
                        </Link>

                        {/* Auth */}
                        {session ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 text-gray-700 hover:text-blue-900 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                        {(session.user?.name ?? session.user?.email ?? '?')[0].toUpperCase()}
                                    </div>
                                    <svg className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                        <div className="py-1">
                                            <div className="px-4 py-2 text-xs text-gray-500 border-b">
                                                {session.user?.email}
                                            </div>
                                            <Link
                                                href={`/users/${session.user?.id}`}
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Profile
                                            </Link>
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium text-sm"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}