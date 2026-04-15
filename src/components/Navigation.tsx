'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import UserAvatar from '@/components/UserAvatar'

interface Manufacturer {
    id: string
    name: string
    slug: string
}

interface NavigationProps {
    manufacturers: Manufacturer[]
    cameraManufacturers: Manufacturer[]
    lensManufacturers: Manufacturer[]
    portManufacturers: Manufacturer[]
}

export default function Navigation({ manufacturers, cameraManufacturers, lensManufacturers, portManufacturers }: NavigationProps) {
    const { data: session } = useSession()
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [isCamerasOpen, setIsCamerasOpen] = useState(false)
    const [isLensesOpen, setIsLensesOpen] = useState(false)
    const [isHousingsOpen, setIsHousingsOpen] = useState(false)
    const [isPortsOpen, setIsPortsOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const camerasDropdownRef = useRef<HTMLDivElement>(null)
    const lensesDropdownRef = useRef<HTMLDivElement>(null)
    const housingsDropdownRef = useRef<HTMLDivElement>(null)
    const portsDropdownRef = useRef<HTMLDivElement>(null)

    function closeAll() {
        setIsCamerasOpen(false)
        setIsLensesOpen(false)
        setIsHousingsOpen(false)
        setIsPortsOpen(false)
    }

    // Fetch logged-in user's profile picture
    useEffect(() => {
        if (!session) { setProfilePicture(null); return }
        function fetchAvatar() {
            fetch('/api/users/me')
                .then(r => r.ok ? r.json() : null)
                .then(data => setProfilePicture(data?.profilePicture ?? null))
                .catch(() => setProfilePicture(null))
        }
        fetchAvatar()
        window.addEventListener('avatarUpdated', fetchAvatar)
        return () => window.removeEventListener('avatarUpdated', fetchAvatar)
    }, [session])
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (camerasDropdownRef.current && !camerasDropdownRef.current.contains(event.target as Node)) {
                setIsCamerasOpen(false)
            }
            if (lensesDropdownRef.current && !lensesDropdownRef.current.contains(event.target as Node)) {
                setIsLensesOpen(false)
            }
            if (housingsDropdownRef.current && !housingsDropdownRef.current.contains(event.target as Node)) {
                setIsHousingsOpen(false)
            }
            if (portsDropdownRef.current && !portsDropdownRef.current.contains(event.target as Node)) {
                setIsPortsOpen(false)
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
                <div className="flex justify-between items-center h-20">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo.png"
                                alt="Underwater Housings System Builder"
                                height={56}
                                width={224}
                                className="h-14 w-auto"
                                priority
                            />
                        </Link>
                    </div>

                    {/* Navigation Menu */}
                    <div className="flex items-center space-x-8">

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
                                    onClick={() => { closeAll(); setIsCamerasOpen(v => !v) }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse camera manufacturers"
                                >
                                    <svg className={`h-4 w-4 transition-transform ${isCamerasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {isCamerasOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {cameraManufacturers.map((m) => (
                                            <Link key={m.id} href={`/cameras/${m.slug}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors" onClick={() => setIsCamerasOpen(false)}>
                                                {m.name}
                                            </Link>
                                        ))}
                                        {cameraManufacturers.length === 0 && <div className="px-4 py-2 text-sm text-gray-500">No manufacturers available</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lenses Dropdown */}
                        <div className="relative" ref={lensesDropdownRef}>
                            <div className="flex items-center">
                                <Link
                                    href="/lenses"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                                    onClick={() => setIsLensesOpen(false)}
                                >
                                    Lenses
                                </Link>
                                <button
                                    onClick={() => { closeAll(); setIsLensesOpen(v => !v) }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse lens manufacturers"
                                >
                                    <svg className={`h-4 w-4 transition-transform ${isLensesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {isLensesOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {lensManufacturers.map((m) => (
                                            <Link key={m.id} href={`/lenses/${m.slug}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors" onClick={() => setIsLensesOpen(false)}>
                                                {m.name}
                                            </Link>
                                        ))}
                                        {lensManufacturers.length === 0 && <div className="px-4 py-2 text-sm text-gray-500">No manufacturers available</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Gear Dropdown */}
                        <div className="relative" ref={housingsDropdownRef}>
                            <div className="flex items-center">
                                <Link
                                    href="/gear"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                                    onClick={() => setIsHousingsOpen(false)}
                                >
                                    Gear
                                </Link>
                                <button
                                    onClick={() => { closeAll(); setIsHousingsOpen(v => !v) }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse gear manufacturers"
                                >
                                    <svg className={`h-4 w-4 transition-transform ${isHousingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {isHousingsOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {manufacturers.map((m) => (
                                            <Link key={m.id} href={`/gear/${m.slug}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors" onClick={() => setIsHousingsOpen(false)}>
                                                {m.name}
                                            </Link>
                                        ))}
                                        {manufacturers.length === 0 && <div className="px-4 py-2 text-sm text-gray-500">No manufacturers available</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link href="/manufacturers" className="text-gray-700 hover:text-blue-900 transition-colors font-medium">
                            Manufacturers
                        </Link>

                        <Link href="/gallery" className="text-gray-700 hover:text-blue-900 transition-colors font-medium">
                            Gallery
                        </Link>

                        <Link href="/about" className="text-gray-700 hover:text-blue-900 transition-colors font-medium">
                            About
                        </Link>

                        {/* Auth */}
                        {session ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 text-gray-700 hover:text-blue-900 transition-colors"
                                >
                                    <UserAvatar
                                        picture={profilePicture}
                                        name={session.user?.name ?? session.user?.email ?? '?'}
                                        size="base"
                                    />
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