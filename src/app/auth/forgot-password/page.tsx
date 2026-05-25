'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function ForgotPasswordPage() {
    const router = useRouter()
    const params = useSearchParams()
    const [email, setEmail] = useState(() => params.get('email') ?? '')
    const [emailError, setEmailError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    function validateEmail(value: string) {
        if (!value) return ''
        return EMAIL_RE.test(value) ? '' : 'Please enter a valid email address'
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const err = validateEmail(email)
        if (err) { setEmailError(err); return }
        setEmailError('')
        setLoading(true)

        // Always POST — response is deliberately generic to avoid user enumeration
        await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })

        setLoading(false)
        setSent(true)

        // Short delay so the user can read the confirmation before being navigated
        setTimeout(() => {
            router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)
        }, 1800)
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center px-4">
            <div className="animate-auth-card bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8">

                {sent ? (
                    <div className="animate-auth-scale-in text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path className="auth-checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your inbox</h2>
                        <p className="text-sm text-gray-500">
                            If an account exists for <span className="font-medium text-gray-700">{email}</span>, we've sent a reset code. Redirecting…
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Enter your email and we'll send you a reset code.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onBlur={e => setEmailError(validateEmail(e.target.value))}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${emailError ? 'border-red-400' : 'border-gray-300'}`}
                                    placeholder="you@example.com"
                                />
                                {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Sending code…
                                    </span>
                                ) : 'Send reset code'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Remember your password?{" "}
                            <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}

            </div>
        </div>
    )
}
