'use client'

import { useState } from 'react'

export type ServiceId = 'instagram' | 'facebook' | 'google_photos' | 'apple_photos'

export interface LinkedServiceDef {
    id: ServiceId
    name: string
    description: string
    icon: React.ReactNode
    brandColor: string
    available: boolean
}

interface LinkedServiceCardProps {
    service: LinkedServiceDef
    connected: boolean
    username?: string | null
    connectHref?: string
    onDisconnect?: () => Promise<void>
}

function InstagramIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
    )
}

function FacebookIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )
}

function GooglePhotosIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 12.25a.25.25 0 1 1 0 .5.25.25 0 0 1 0-.5zm0-1a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM11.25 6.5A5.25 5.25 0 0 0 6 11.75H.75a.75.75 0 0 0 0 1.5H6a5.25 5.25 0 0 0 5.25 5.25v5.25a.75.75 0 0 0 1.5 0V18.5A5.25 5.25 0 0 0 18 13.25h5.25a.75.75 0 0 0 0-1.5H18A5.25 5.25 0 0 0 12.75 6.5V1.25a.75.75 0 0 0-1.5 0zm0 1.56V11.5H7.56A3.75 3.75 0 0 1 11.25 8.06zm1.5 0a3.75 3.75 0 0 1 3.69 3.44H12.75zm0 7.88V12h3.69a3.75 3.75 0 0 1-3.69 3.44zm-1.5 0A3.75 3.75 0 0 1 7.56 12.5h3.69z" />
        </svg>
    )
}

function AppleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
    )
}

export const SERVICE_DEFINITIONS: LinkedServiceDef[] = [
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Import photos from your Instagram feed.',
        icon: <InstagramIcon />,
        brandColor: '#E1306C',
        available: true,
    },
    {
        id: 'facebook',
        name: 'Facebook',
        description: 'Import photos from your Facebook albums.',
        icon: <FacebookIcon />,
        brandColor: '#1877F2',
        available: false,
    },
    {
        id: 'google_photos',
        name: 'Google Photos',
        description: 'Import photos from your Google Photos library.',
        icon: <GooglePhotosIcon />,
        brandColor: '#4285F4',
        available: false,
    },
    {
        id: 'apple_photos',
        name: 'Apple Photos',
        description: 'Import photos from your iCloud Photo Library.',
        icon: <AppleIcon />,
        brandColor: '#555555',
        available: false,
    },
]

export function LinkedServiceCard({
    service,
    connected,
    username,
    connectHref,
    onDisconnect,
}: LinkedServiceCardProps) {
    const [disconnecting, setDisconnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleDisconnect() {
        setDisconnecting(true)
        setError(null)
        try {
            await onDisconnect?.()
        } catch {
            setError('Failed to disconnect. Please try again.')
            setDisconnecting(false)
        }
    }

    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${service.brandColor}18` }}
                >
                    <span style={{ color: service.brandColor }}>{service.icon}</span>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm">{service.name}</h3>
                        {connected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Connected
                            </span>
                        ) : !service.available ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                Coming soon
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{service.description}</p>
                    {connected && username && (
                        <p className="mt-1 text-xs text-gray-400">@{username}</p>
                    )}
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                </div>
            </div>

            {service.available && (
                <div className="shrink-0">
                    {connected ? (
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                    ) : (
                        <a
                            href={connectHref}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: service.brandColor }}
                        >
                            Connect
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}
