'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { SUPPORTED_CURRENCIES, FALLBACK_RATES, guessCurrencyFromLocale } from '@/lib/currency'

const STORAGE_KEY = 'preferredCurrency'

interface CurrencyContextValue {
    userCurrency: string
    setUserCurrency: (code: string) => void
    /** Convert a numeric amount from `fromCurrency` to the user's currency. */
    convertAmount: (amount: number | null | undefined, fromCurrency?: string | null) => number
    /** Format a price from `fromCurrency` into a localised string in the user's currency. */
    formatMoney: (amount: number | null | undefined, fromCurrency?: string | null) => string | null
}

const CurrencyContext = createContext<CurrencyContextValue>({
    userCurrency: 'USD',
    setUserCurrency: () => { }, convertAmount: (amount) => amount ?? 0, formatMoney: () => null,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [userCurrency, _setUserCurrency] = useState<string>('USD')
    const [fxRates, setFxRates] = useState<Record<string, number>>(FALLBACK_RATES)

    // Restore persisted preference on first render
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        const initial =
            saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)
                ? saved
                : guessCurrencyFromLocale()
        _setUserCurrency(initial)
    }, [])

    // Fetch live exchange rates once on mount
    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(r => r.json())
            .then(data => { if (data?.rates) setFxRates(data.rates) })
            .catch(() => { /* keep FALLBACK_RATES */ })
    }, [])

    const setUserCurrency = useCallback((code: string) => {
        _setUserCurrency(code)
        localStorage.setItem(STORAGE_KEY, code)
    }, [])

    const convertAmount = useCallback(
        (amount: number | null | undefined, fromCurrency?: string | null): number => {
            if (!amount) return 0
            const src = fromCurrency ?? 'USD'
            const srcRate = fxRates[src] ?? 1
            const targetRate = fxRates[userCurrency] ?? 1
            return (amount / srcRate) * targetRate
        },
        [fxRates, userCurrency],
    )

    const formatMoney = useCallback(
        (amount: number | null | undefined, fromCurrency?: string | null): string | null => {
            if (!amount) return null
            const src = fromCurrency ?? 'USD'
            const srcRate = fxRates[src] ?? 1
            const targetRate = fxRates[userCurrency] ?? 1
            const converted = (amount / srcRate) * targetRate
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: userCurrency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(converted)
        },
        [fxRates, userCurrency],
    )

    return (
        <CurrencyContext.Provider value={{ userCurrency, setUserCurrency, convertAmount, formatMoney }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export function useCurrency() {
    return useContext(CurrencyContext)
}
