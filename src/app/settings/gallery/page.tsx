'use client'

import { useState, useEffect, FormEvent } from 'react'

interface GallerySettings {
    allowFullResDownload: boolean
}

function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false)
    return (
        <span className="relative inline-flex items-center ml-1.5">
            <button
                type="button"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="More information"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
            </button>
            {visible && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none">
                    {text}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </span>
            )}
        </span>
    )
}

export default function GallerySettingsPage() {
    const [settings, setSettings] = useState<GallerySettings>({ allowFullResDownload: true })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/users/me/settings')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setSettings({ allowFullResDownload: data.allowFullResDownload ?? true })
                }
            })
            .finally(() => setLoading(false))
    }, [])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSuccess(false)
        try {
            const res = await fetch('/api/users/me/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gallery: settings }),
            })
            if (!res.ok) {
                const data = await res.json()
                setError(data.error ?? 'Failed to save settings.')
            } else {
                setSuccess(true)
            }
        } catch {
            setError('An unexpected error occurred.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Gallery</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Control how your gallery photos are shared with others.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Downloads</p>
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={settings.allowFullResDownload}
                            onChange={e => {
                                setSettings(s => ({ ...s, allowFullResDownload: e.target.checked }))
                                setSuccess(false)
                                setError(null)
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="flex-1">
                            <span className="flex items-center text-sm font-medium text-gray-900">
                                Allow full-resolution download
                                <InfoTooltip text="Enabling this lets other photographers download your photos at full resolution, which makes side-by-side image quality comparisons much more meaningful — especially when evaluating port sharpness, chromatic aberration, and corner performance." />
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                                When enabled, visitors can download the original high-resolution file from your gallery.
                            </span>
                        </span>
                    </label>
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
                {success && (
                    <p className="text-sm text-green-600">Gallery settings saved.</p>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? 'Saving…' : 'Save settings'}
                    </button>
                </div>
            </form>
        </div>
    )
}
