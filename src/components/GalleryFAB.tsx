'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import GalleryUploadButton from './GalleryUploadButton'
import InstagramImportModal from './InstagramImportModal'

interface Props {
    currentUserId?: number
    variant?: 'fixed' | 'toolbar'
}

// Shared pill style for both option buttons
const PILL =
    'flex items-center gap-2 pl-3 pr-4 py-2.5 bg-white text-gray-800 rounded-full shadow-lg border border-gray-100 text-sm font-medium whitespace-nowrap select-none transition-all duration-150'

export default function GalleryFAB({ currentUserId, variant = 'fixed' }: Props) {
    const { data: session } = useSession()
    const isLoggedIn = !!session?.user

    const [expanded, setExpanded] = useState(false)
    const [deviceOpen, setDeviceOpen] = useState(false)
    const [instagramOpen, setInstagramOpen] = useState(false)
    const [showLoginTip, setShowLoginTip] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside the FAB
    useEffect(() => {
        if (!expanded) return
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setExpanded(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [expanded])

    function handleFabClick() {
        if (!isLoggedIn) {
            setShowLoginTip(t => !t)
            return
        }
        setExpanded(e => !e)
    }

    function openDevice() {
        setExpanded(false)
        setDeviceOpen(true)
    }

    function openInstagram() {
        setExpanded(false)
        setInstagramOpen(true)
    }

    // Individual option transition — slides up from the FAB and fades in.
    // delayIn/delayOut let us stagger so items cascade upward on open and
    // collapse downward on close.
    function optionStyle(delayInMs: number, delayOutMs: number): React.CSSProperties {
        return {
            opacity: expanded ? 1 : 0,
            // When visible: don't set an inline transform so Tailwind hover/active
            // classes (hover:-translate-y-0.5 etc.) take effect unobstructed.
            // When hidden: slide down + shrink for the exit animation.
            transform: expanded ? undefined : 'translateY(10px) scale(0.94)',
            pointerEvents: expanded ? 'auto' : 'none',
            transition: 'opacity 180ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: expanded ? `${delayInMs}ms` : `${delayOutMs}ms`,
        }
    }

    // ── Toolbar variant (desktop inline button) ──────────────────────────────
    if (variant === 'toolbar') {
        return (
            <>
                <div ref={containerRef} className="relative hidden sm:block">
                    {/* Dropdown — opens below the button */}
                    <div
                        className="absolute left-0 top-full mt-2 flex flex-col items-start gap-1.5 z-50"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* From Device — first item */}
                        <button
                            onClick={openDevice}
                            className={`${PILL} hover:bg-gray-50 hover:shadow-xl hover:border-gray-200 hover:translate-y-0.5 active:scale-95`}
                            style={optionStyle(0, 60)}
                            tabIndex={expanded ? 0 : -1}
                            aria-hidden={!expanded}
                        >
                            <svg className="w-5 h-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            From Device
                        </button>
                        {/* Instagram — second item */}
                        <button
                            onClick={openInstagram}
                            className={`${PILL} hover:bg-gray-50 hover:shadow-xl hover:border-gray-200 hover:translate-y-0.5 active:scale-95`}
                            style={optionStyle(80, 0)}
                            tabIndex={expanded ? 0 : -1}
                            aria-hidden={!expanded}
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                                <defs>
                                    <linearGradient id="ig-toolbar" x1="0%" y1="100%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#f09433" />
                                        <stop offset="50%" stopColor="#dc2743" />
                                        <stop offset="100%" stopColor="#bc1888" />
                                    </linearGradient>
                                </defs>
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-toolbar)" />
                                <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" fill="none" />
                                <circle cx="17.5" cy="6.5" r="1" fill="white" />
                            </svg>
                            Instagram
                        </button>
                    </div>

                    {/* Login tooltip */}
                    {showLoginTip && !isLoggedIn && (
                        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg pointer-events-none z-50">
                            Sign in to upload photos
                            <div className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-800" />
                        </div>
                    )}

                    {/* Toolbar button */}
                    <button
                        onClick={handleFabClick}
                        aria-label={expanded ? 'Close upload menu' : 'Upload photo'}
                        aria-expanded={expanded}
                        className={`
                            flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150
                            ${isLoggedIn
                                ? `bg-blue-600 text-white hover:bg-blue-500 active:scale-95 ${expanded ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.25)]' : 'shadow-sm hover:shadow-md'
                                }`
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        <svg
                            className="w-4 h-4 shrink-0"
                            style={{
                                transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
                                transition: 'transform 240ms cubic-bezier(0.34, 1.3, 0.64, 1)',
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload
                    </button>
                </div>

                <GalleryUploadButton
                    controlledOpen={deviceOpen}
                    onControlledClose={() => setDeviceOpen(false)}
                />
                <InstagramImportModal
                    isOpen={instagramOpen}
                    onClose={() => setInstagramOpen(false)}
                    currentUserId={currentUserId}
                />
            </>
        )
    }

    // ── Fixed FAB variant (mobile) ────────────────────────────────────────────
    return (
        <>
            {/*
             * Anchor the FAB to the bottom-right corner.
             * `bottom` uses env(safe-area-inset-bottom) so the button
             * stays above the iOS home indicator / Android nav bar.
             * Hidden on desktop — the toolbar variant is shown there instead.
             */}
            <div
                ref={containerRef}
                className="fixed right-5 z-40 sm:right-6 sm:hidden"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                {/*
                 * Option pills — absolutely positioned above the FAB so they
                 * never push the button or clip out of the viewport.
                 * `pointer-events: none` on the wrapper lets clicks pass through
                 * the invisible area; each button overrides to `auto` when visible.
                 */}
                <div
                    className="absolute right-0 flex flex-col items-end gap-2"
                    style={{
                        bottom: 'calc(100% + 12px)',
                        pointerEvents: 'none',
                    }}
                >
                    {/* Instagram — second to appear (stagger 80 ms) */}
                    <button
                        onClick={openInstagram}
                        className={`${PILL} hover:bg-gray-50 hover:shadow-xl hover:border-gray-200 hover:-translate-y-0.5 active:scale-95 active:translate-y-0`}
                        style={optionStyle(80, 0)}
                        tabIndex={expanded ? 0 : -1}
                        aria-hidden={!expanded}
                    >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                            <defs>
                                <linearGradient id="ig-fab" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#f09433" />
                                    <stop offset="50%" stopColor="#dc2743" />
                                    <stop offset="100%" stopColor="#bc1888" />
                                </linearGradient>
                            </defs>
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-fab)" />
                            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" fill="none" />
                            <circle cx="17.5" cy="6.5" r="1" fill="white" />
                        </svg>
                        Instagram
                    </button>

                    {/* From Device — first to appear (no delay) */}
                    <button
                        onClick={openDevice}
                        className={`${PILL} hover:bg-gray-50 hover:shadow-xl hover:border-gray-200 hover:-translate-y-0.5 active:scale-95 active:translate-y-0`}
                        style={optionStyle(0, 60)}
                        tabIndex={expanded ? 0 : -1}
                        aria-hidden={!expanded}
                    >
                        <svg className="w-5 h-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        From Device
                    </button>
                </div>

                {/* Login tooltip (unauthenticated users only) */}
                {showLoginTip && !isLoggedIn && (
                    <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
                        Sign in to upload photos
                        <div className="absolute top-full right-5 border-4 border-transparent border-t-gray-800" />
                    </div>
                )}

                {/* Main FAB button */}
                <button
                    onClick={handleFabClick}
                    aria-label={expanded ? 'Close menu' : 'Add photo'}
                    aria-expanded={expanded}
                    className={`
                        w-14 h-14 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-out
                        ${isLoggedIn
                            ? `bg-blue-600 text-white active:scale-95
                               hover:bg-blue-500
                               ${expanded
                                ? 'shadow-[0_0_0_6px_rgba(59,130,246,0.18)] scale-105'
                                : 'shadow-lg hover:shadow-xl'}`
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-md'
                        }
                    `}
                >
                    {/* + rotates to × */}
                    <svg
                        className="w-6 h-6"
                        style={{
                            transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
                            transition: 'transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1)',
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Device upload modal (controlled by FAB) */}
            <GalleryUploadButton
                controlledOpen={deviceOpen}
                onControlledClose={() => setDeviceOpen(false)}
            />

            {/* Instagram import modal */}
            <InstagramImportModal
                isOpen={instagramOpen}
                onClose={() => setInstagramOpen(false)}
                currentUserId={currentUserId}
            />
        </>
    )
}
