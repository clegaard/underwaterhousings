'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const RESEND_COOLDOWN = 60
const OTP_TTL = 600

function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function ResetPasswordPage() {
    const router = useRouter()
    const params = useSearchParams()
    const email = params.get('email') ?? ''

    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [errKey, setErrKey] = useState(0)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [expiresIn, setExpiresIn] = useState(OTP_TTL)
    const expiryRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const expired = expiresIn === 0
    const timerColor = expiresIn <= 60
        ? 'text-red-500'
        : expiresIn <= 120 ? 'text-amber-500' : 'text-gray-400'

    useEffect(() => {
        startCooldown()
        expiryRef.current = setInterval(() => {
            setExpiresIn(prev => {
                if (prev <= 1) { clearInterval(expiryRef.current!); return 0 }
                return prev - 1
            })
        }, 1000)
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
            if (expiryRef.current) clearInterval(expiryRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function startCooldown() {
        setCooldown(RESEND_COOLDOWN)
        if (cooldownRef.current) clearInterval(cooldownRef.current)
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
                return prev - 1
            })
        }, 1000)
    }

    async function submitOtp(code: string) {
        if (code.length !== 6) { setError('Please enter the 6-digit code.'); setErrKey(k => k + 1); return }
        if (expiresIn === 0) { setError('Code has expired. Please request a new one.'); setErrKey(k => k + 1); return }
        setError('')
        setLoading(true)

        const res = await fetch('/api/auth/verify-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: code }),
        })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Something went wrong')
            setErrKey(k => k + 1)
            setLoading(false)
            return
        }

        // Show success animation, then navigate
        setSuccess(true)
        await new Promise(r => setTimeout(r, 1900))

        router.push(
            `/auth/new-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.sessionToken)}`
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        await submitOtp(otp)
    }

    async function handleResend() {
        if (cooldown > 0) return
        setError('')

        await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })

        setOtp('')
        setExpiresIn(OTP_TTL)
        if (expiryRef.current) clearInterval(expiryRef.current)
        expiryRef.current = setInterval(() => {
            setExpiresIn(prev => {
                if (prev <= 1) { clearInterval(expiryRef.current!); return 0 }
                return prev - 1
            })
        }, 1000)
        startCooldown()
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-blue-50 to-blue-100 flex items-center justify-center px-4">
            <div className="animate-auth-card bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Enter reset code</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        We sent a 6-digit code to{' '}
                        <span className="font-medium text-gray-700">{email}</span>
                        {'. '}
                        {expired ? (
                            <span className="text-red-500 font-medium">The code has expired.</span>
                        ) : (
                            <span className={`font-mono font-medium tabular-nums ${timerColor}`}>
                                Expires in {formatTime(expiresIn)}.
                            </span>
                        )}
                    </p>
                </div>

                {success ? (
                    <div className="animate-auth-scale-in text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path className="auth-checkmark-path" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Code verified!</h2>
                        <p className="text-sm text-gray-500">Taking you to set a new password…</p>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reset code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                                        setOtp(val)
                                        if (val.length === 6 && !expired && !loading) submitOtp(val)
                                    }}
                                    autoFocus
                                    disabled={expired || loading}
                                    className={`w-full px-4 py-3 border rounded-lg text-2xl font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 ${loading
                                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                                            : expired
                                                ? 'border-red-300 bg-red-50 text-red-400'
                                                : 'border-gray-300'
                                        }`}
                                    placeholder="——————"
                                />
                            </div>

                            {expired && (
                                <p className="text-sm text-red-600">Your code has expired. Use the button below to request a new one.</p>
                            )}

                            {error && !expired && (
                                <p key={errKey} className="text-sm text-red-600 animate-auth-shake">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6 || expired}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Verifying…
                                    </span>
                                ) : 'Verify code'}
                            </button>
                        </form>

                        <div className="mt-6 flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={cooldown > 0}
                                className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400 disabled:cursor-default transition-colors duration-150"
                            >
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                            </button>
                            <Link href="/auth/forgot-password" className="text-gray-500 hover:text-gray-700 transition-colors duration-150">
                                ← Change email
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
