'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import UserAvatar from '@/components/UserAvatar'
import { useCurrency } from '@/components/CurrencyContext'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

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
    const { userCurrency, setUserCurrency } = useCurrency()
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [isCamerasOpen, setIsCamerasOpen] = useState(false)
    const [isLensesOpen, setIsLensesOpen] = useState(false)
    const [isHousingsOpen, setIsHousingsOpen] = useState(false)
    const [isPortsOpen, setIsPortsOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
    const [currencySearch, setCurrencySearch] = useState('')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const currencySearchRef = useRef<HTMLInputElement>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const camerasDropdownRef = useRef<HTMLDivElement>(null)
    const lensesDropdownRef = useRef<HTMLDivElement>(null)
    const housingsDropdownRef = useRef<HTMLDivElement>(null)
    const portsDropdownRef = useRef<HTMLDivElement>(null)
    const currencyDropdownRef = useRef<HTMLDivElement>(null)

    const selectedCurrencyMeta = SUPPORTED_CURRENCIES.find(c => c.code === userCurrency) ?? SUPPORTED_CURRENCIES[0]

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
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
                setIsCurrencyOpen(false)
                setCurrencySearch('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isMobileMenuOpen])

    return (
        <nav className="bg-white shadow-lg border-b">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16 md:h-20">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo.png"
                                alt="Underwater Housings System Builder"
                                height={56}
                                width={224}
                                className="h-10 md:h-14 w-auto"
                                priority
                            />
                        </Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden flex items-center justify-center w-10 h-10 text-gray-700 hover:text-blue-900 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMobileMenuOpen(v => !v)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isMobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>

                    {/* Navigation Menu (desktop) */}
                    <div className="hidden md:flex items-center space-x-8">

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

                        {/* Underwater Products Dropdown */}
                        <div className="relative" ref={housingsDropdownRef}>
                            <div className="flex items-center">
                                <Link
                                    href="/gear"
                                    className="text-gray-700 hover:text-blue-900 transition-colors font-medium"
                                    onClick={() => setIsHousingsOpen(false)}
                                >
                                    Underwater Products
                                </Link>
                                <button
                                    onClick={() => { closeAll(); setIsHousingsOpen(v => !v) }}
                                    className="ml-1 p-0.5 text-gray-700 hover:text-blue-900 transition-colors"
                                    aria-label="Browse underwater product manufacturers"
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

                        {/* Currency selector */}
                        <div className="relative" ref={currencyDropdownRef}>
                            <button
                                onClick={() => {
                                    setIsCurrencyOpen(v => {
                                        if (!v) setTimeout(() => currencySearchRef.current?.focus(), 0)
                                        else setCurrencySearch('')
                                        return !v
                                    })
                                }}
                                className="flex items-center gap-1.5 text-gray-700 hover:text-blue-900 transition-colors font-medium focus:outline-none"
                                aria-label="Select currency"
                            >
                                <span className="text-base leading-none">{selectedCurrencyMeta.flag}</span>
                                <span>{selectedCurrencyMeta.code}</span>
                                <svg className={`w-3 h-3 text-gray-400 ml-0.5 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isCurrencyOpen && (() => {
                                const filtered = SUPPORTED_CURRENCIES.filter(c =>
                                    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                    c.label.toLowerCase().includes(currencySearch.toLowerCase())
                                )
                                return (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black/10 z-50 overflow-hidden">
                                        <div className="px-3 pt-3 pb-2">
                                            <input
                                                ref={currencySearchRef}
                                                type="text"
                                                value={currencySearch}
                                                onChange={e => setCurrencySearch(e.target.value)}
                                                placeholder="Search…"
                                                className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {filtered.length === 0 ? (
                                                <p className="px-4 py-3 text-xs text-gray-400 text-center">No results</p>
                                            ) : filtered.map((c, i) => {
                                                const isSelected = c.code === userCurrency
                                                return (
                                                    <button
                                                        key={c.code}
                                                        onClick={() => { setUserCurrency(c.code); setIsCurrencyOpen(false); setCurrencySearch('') }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isSelected
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                            } ${i > 0 ? 'border-t border-gray-100' : ''}`}
                                                    >
                                                        <span className="text-lg leading-none">{c.flag}</span>
                                                        <span className="flex-1 text-left font-medium">
                                                            {c.code}
                                                            {c.code === 'USD' && <span className={`ml-1 text-xs font-normal ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>(Default)</span>}
                                                        </span>
                                                        <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>({c.symbol})</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>

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

            {/* Mobile drawer */}
            {isMobileMenuOpen && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-0 left-0 right-0 bg-white shadow-xl overflow-y-auto max-h-full">
                        <div className="px-4 py-2 divide-y divide-gray-100">

                            {/* Cameras */}
                            <div>
                                <button
                                    onClick={() => { closeAll(); setIsCamerasOpen(v => !v) }}
                                    className="flex items-center justify-between w-full py-4 text-base font-medium text-gray-900"
                                >
                                    Cameras
                                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCamerasOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isCamerasOpen && (
                                    <div className="pb-3 pl-4 space-y-1">
                                        <Link href="/cameras" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-blue-600 font-medium">All Cameras</Link>
                                        {cameraManufacturers.map(m => (
                                            <Link key={m.id} href={`/cameras/${m.slug}`} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-gray-700">
                                                {m.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Lenses */}
                            <div>
                                <button
                                    onClick={() => { closeAll(); setIsLensesOpen(v => !v) }}
                                    className="flex items-center justify-between w-full py-4 text-base font-medium text-gray-900"
                                >
                                    Lenses
                                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isLensesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isLensesOpen && (
                                    <div className="pb-3 pl-4 space-y-1">
                                        <Link href="/lenses" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-blue-600 font-medium">All Lenses</Link>
                                        {lensManufacturers.map(m => (
                                            <Link key={m.id} href={`/lenses/${m.slug}`} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-gray-700">
                                                {m.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Underwater Products */}
                            <div>
                                <button
                                    onClick={() => { closeAll(); setIsHousingsOpen(v => !v) }}
                                    className="flex items-center justify-between w-full py-4 text-base font-medium text-gray-900"
                                >
                                    Underwater Products
                                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isHousingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {isHousingsOpen && (
                                    <div className="pb-3 pl-4 space-y-1">
                                        <Link href="/gear" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-blue-600 font-medium">All Products</Link>
                                        {manufacturers.map(m => (
                                            <Link key={m.id} href={`/gear/${m.slug}`} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-gray-700">
                                                {m.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Flat links */}
                            <div className="py-2 space-y-1">
                                <Link href="/manufacturers" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900">Manufacturers</Link>
                                <Link href="/gallery" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900">Gallery</Link>
                                <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900">About</Link>
                            </div>

                            {/* Currency picker */}
                            <div className="py-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Currency</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {SUPPORTED_CURRENCIES.slice(0, 9).map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => { setUserCurrency(c.code); setIsMobileMenuOpen(false) }}
                                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm border transition-colors ${c.code === userCurrency
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span>{c.flag}</span>
                                            <span>{c.code}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Use desktop nav for more currencies</p>
                            </div>

                            {/* User section */}
                            <div className="py-4">
                                {session ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar picture={profilePicture} name={session.user?.name ?? session.user?.email ?? '?'} size="base" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                                                <p className="text-xs text-gray-500">{session.user?.email}</p>
                                            </div>
                                        </div>
                                        <Link href={`/users/${session.user?.id}`} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-sm text-gray-700">Profile</Link>
                                        <button onClick={() => { setIsMobileMenuOpen(false); signOut({ callbackUrl: '/' }) }} className="w-full text-left py-2 text-sm text-red-600">Sign out</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">Log in</Link>
                                        <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)} className="flex-1 text-center py-2.5 bg-blue-600 rounded-lg text-sm font-medium text-white">Sign up</Link>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}