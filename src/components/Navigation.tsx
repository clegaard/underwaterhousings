'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import UserAvatar from '@/components/UserAvatar'
import { useCurrency } from '@/components/CurrencyContext'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'
import SearchBar from '@/components/SearchBar'

export default function Navigation() {
    const { data: session } = useSession()
    const { userCurrency, setUserCurrency } = useCurrency()
    const [profilePicture, setProfilePicture] = useState<string | null>(null)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false)
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
    const [currencySearch, setCurrencySearch] = useState('')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchFocusCounter, setSearchFocusCounter] = useState(0)
    const currencySearchRef = useRef<HTMLInputElement>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const mobileUserMenuRef = useRef<HTMLDivElement>(null)
    const currencyDropdownRef = useRef<HTMLDivElement>(null)

    const selectedCurrencyMeta = SUPPORTED_CURRENCIES.find(c => c.code === userCurrency) ?? SUPPORTED_CURRENCIES[0]

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
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false)
            }
            if (mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(event.target as Node)) {
                setIsMobileUserMenuOpen(false)
            }
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
                setIsCurrencyOpen(false)
                setCurrencySearch('')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        document.body.style.overflow = (isMobileMenuOpen || isSearchOpen) ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isMobileMenuOpen, isSearchOpen])

    // Cmd+K / Ctrl+K — focus inline search on desktop, open overlay on mobile
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setSearchFocusCounter(c => c + 1)
                setIsMobileMenuOpen(false)
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isSearchOpen])

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
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

                        {/* Mobile: search icon + user avatar / login icon + hamburger */}
                        <div className="flex items-center gap-1 md:hidden">
                            {/* Search icon */}
                            <button
                                onClick={() => { setIsSearchOpen(true); setIsMobileMenuOpen(false) }}
                                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-blue-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Search"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                            </button>

                            {/* User button — always visible in top bar on mobile */}
                            <div className="relative" ref={mobileUserMenuRef}>
                                {session ? (
                                    <>
                                        <button
                                            onClick={() => setIsMobileUserMenuOpen(v => !v)}
                                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            aria-label="Account menu"
                                        >
                                            <UserAvatar
                                                picture={profilePicture}
                                                name={session.user?.name ?? session.user?.email ?? '?'}
                                                size="base"
                                            />
                                        </button>
                                        {isMobileUserMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-black/10 dark:ring-white/10 z-50 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{session.user?.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user?.email}</p>
                                                </div>
                                                <Link
                                                    href={`/users/${session.user?.id}`}
                                                    onClick={() => setIsMobileUserMenuOpen(false)}
                                                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                                    Profile
                                                </Link>
                                                <Link
                                                    href="/settings/profile"
                                                    onClick={() => setIsMobileUserMenuOpen(false)}
                                                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                                    Settings
                                                </Link>
                                                <button
                                                    onClick={() => { setIsMobileUserMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                                                    Sign out
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-blue-900 hover:bg-gray-100 transition-colors"
                                        aria-label="Log in"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    </Link>
                                )}
                            </div>

                            {/* Hamburger */}
                            <button
                                className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                        </div>

                        {/* Navigation Menu (desktop) */}
                        <div className="hidden md:flex items-center flex-1 justify-end">

                            {/* Inline search — expands between logo and nav links */}
                            <div className="flex-1 max-w-xl mx-6">
                                <SearchBar
                                    placeholder="Search cameras, lenses, housings, ports…"
                                    triggerFocus={searchFocusCounter}
                                    className="[&_input]:py-2.5 [&_input]:text-sm [&_input]:rounded-xl"
                                />
                            </div>

                            <div className="flex items-center space-x-8">

                                <Link href="/builder" className="text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 transition-colors font-medium whitespace-nowrap">
                                    Builder
                                </Link>

                                <Link href="/products" className="text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 transition-colors font-medium whitespace-nowrap">
                                    Products
                                </Link>

                                <Link href="/gallery" className="text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 transition-colors font-medium whitespace-nowrap">
                                    Gallery
                                </Link>

                                <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 transition-colors font-medium whitespace-nowrap">
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
                                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 z-50 overflow-hidden">
                                                <div className="px-3 pt-3 pb-2">
                                                    <input
                                                        ref={currencySearchRef}
                                                        type="text"
                                                        value={currencySearch}
                                                        onChange={e => setCurrencySearch(e.target.value)}
                                                        placeholder="Search…"
                                                        className="w-full text-sm px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
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
                                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                    } ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
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
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50">
                                                <div className="py-1">
                                                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                        {session.user?.email}
                                                    </div>
                                                    <Link
                                                        href={`/users/${session.user?.id}`}
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                                        Profile
                                                    </Link>
                                                    <Link
                                                        href="/settings/profile"
                                                        onClick={() => setIsUserMenuOpen(false)}
                                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                                        Settings
                                                    </Link>
                                                    <button
                                                        onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                                                        Sign out
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-blue-900 hover:bg-gray-100 transition-colors"
                                        aria-label="Log in"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile drawer */}
                    {isMobileMenuOpen && (
                        <div className="fixed top-16 inset-x-0 bottom-0 z-40 md:hidden">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
                            <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-xl overflow-y-auto max-h-full">
                                <div className="px-4 py-2 divide-y divide-gray-100 dark:divide-gray-700">

                                    {/* Flat nav links */}
                                    <div className="py-2 space-y-1">
                                        <Link href="/builder" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900 dark:text-gray-100">Builder</Link>
                                        <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900 dark:text-gray-100">Products</Link>
                                        <Link href="/gallery" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900 dark:text-gray-100">Gallery</Link>
                                        <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="block py-3 text-base font-medium text-gray-900 dark:text-gray-100">About</Link>
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
                                                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                        }`}
                                                >
                                                    <span>{c.flag}</span>
                                                    <span>{c.code}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Use desktop nav for more currencies</p>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Mobile search overlay ────────────────────────────────────────── */}
            {isSearchOpen && (
                <div
                    className="fixed inset-0 z-200 flex flex-col md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Search"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsSearchOpen(false)}
                    />

                    {/* Search panel */}
                    <div
                        className="relative mx-auto w-full max-w-2xl px-4 pt-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
                            <SearchBar
                                autoFocus
                                placeholder="Search cameras, lenses, housings, ports…"
                                onNavigate={() => setIsSearchOpen(false)}
                            />
                        </div>
                        <p className="mt-2 text-center text-xs text-gray-400">
                            Press <kbd className="font-mono bg-white/20 rounded px-1">Esc</kbd> to close
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
