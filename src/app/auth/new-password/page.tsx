'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function NewPasswordPage() {
    const router = useRouter()
    const params = useSearchParams()
    const email = params.get('email') ?? ''
    const sessionToken = params.get('token') ?? ''

    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
        setError('')
        setLoading(true)

        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionToken, password }),
        })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Something went wrong')
            setLoading(false)
            return
        }

        setDone(true)

        const result = await signIn('credentials', { email, password, redirect: false })
        if (!result?.error) {
            router.push('/')
            router.refresh()
        } else {
            router.push('/auth/login')
        }
    }

    if (done) {
        return (
            <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center px-4">
                <div className="animate-auth-card bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
                    <div className="animate-auth-scale-in w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path className="auth-checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Password updated!</h2>
                    <p className="text-sm text-gray-500">Signing you in…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center px-4">
            <div className="animate-auth-card bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Choose a new password for{' '}
                        <span className="font-medium text-gray-700">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                minLength={8}
                                autoFocus
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Min. 8 characters"
                            />
                            {password.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 hover:scale-110 active:scale-95 transition-all duration-150"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || password.length < 8}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Updating password…
                            </span>
                        ) : 'Set new password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
