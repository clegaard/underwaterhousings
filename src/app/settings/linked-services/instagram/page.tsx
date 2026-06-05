'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LinkedServiceCard, SERVICE_DEFINITIONS } from '@/components/LinkedServiceCard'

const SERVICE_DEF = SERVICE_DEFINITIONS.find(s => s.id === 'instagram')!

interface LinkedServiceData {
    service: string
    serviceUsername: string | null
    tokenExpiry: string | null
}

export default function InstagramLinkedServicePage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [connected, setConnected] = useState(false)
    const [username, setUsername] = useState<string | null>(null)
    const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
    const [loading, setLoading] = useState(true)
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    useEffect(() => {
        const conn = searchParams.get('connected')
        const err = searchParams.get('error')

        if (conn === '1') {
            setBanner({ type: 'success', message: 'Instagram connected successfully.' })
            router.replace('/settings/linked-services/instagram')
        } else if (err) {
            const messages: Record<string, string> = {
                access_denied: 'You denied access to Instagram.',
                state_mismatch: 'Security check failed. Please try again.',
                token_exchange_failed: 'Could not exchange the Instagram authorization code. Please try again.',
                invalid_callback: 'Invalid callback. Please try again.',
            }
            setBanner({ type: 'error', message: messages[err] ?? 'An unknown error occurred.' })
            router.replace('/settings/linked-services/instagram')
        }
    }, [searchParams, router])

    useEffect(() => {
        fetch('/api/linked-services')
            .then(r => r.ok ? r.json() : { services: [] })
            .then(({ services }: { services: LinkedServiceData[] }) => {
                const ig = services.find(s => s.service === 'instagram')
                if (ig) {
                    setConnected(true)
                    setUsername(ig.serviceUsername)
                    setTokenExpiry(ig.tokenExpiry ? new Date(ig.tokenExpiry) : null)
                }
            })
            .finally(() => setLoading(false))
    }, [])

    async function handleDisconnect() {
        const res = await fetch('/api/linked-services/instagram', { method: 'DELETE' })
        if (!res.ok) throw new Error('Disconnect failed')
        setConnected(false)
        setUsername(null)
        setTokenExpiry(null)
        setBanner({ type: 'success', message: 'Instagram disconnected.' })
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Instagram</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Connect your Instagram account to import photos directly from your feed.
                    Your access token is stored securely and only used to read your media.
                </p>
            </div>

            {banner && (
                <div
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${banner.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                >
                    {banner.message}
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    Loading…
                </div>
            ) : (
                <LinkedServiceCard
                    service={SERVICE_DEF}
                    connected={connected}
                    username={username}
                    connectHref="/api/linked-services/instagram/connect"
                    onDisconnect={handleDisconnect}
                />
            )}

            {connected && tokenExpiry && (
                <p className="text-xs text-gray-400">
                    Access token expires{' '}
                    {tokenExpiry < new Date()
                        ? 'has expired — please reconnect.'
                        : `on ${tokenExpiry.toLocaleDateString(undefined, { dateStyle: 'medium' })}.`}
                </p>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500 space-y-2">
                <p className="font-medium text-gray-700">About permissions</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>We request read-only access to your Instagram media.</li>
                    <li>We never post, like, or comment on your behalf.</li>
                    <li>You can disconnect at any time and your token will be deleted.</li>
                </ul>
            </div>
        </div>
    )
}
