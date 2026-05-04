'use client'

import { useCurrency } from '@/components/CurrencyContext'

/**
 * Renders a price using the user's selected currency.
 * Use this in server-rendered pages where you can't call useCurrency() directly.
 */
export default function PriceTag({
    amount,
    currency,
    className,
}: {
    amount: number | string | null | undefined
    currency?: string | null
    className?: string
}) {
    const { formatMoney } = useCurrency()
    const numeric = amount != null ? Number(amount) : null
    const formatted = formatMoney(numeric, currency)
    if (!formatted) return null
    return <span className={className}>{formatted}</span>
}
