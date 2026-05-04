export const SUPPORTED_CURRENCIES = [
    { code: 'USD', label: 'US Dollar', flag: '🇺🇸', symbol: '$' },
    { code: 'EUR', label: 'Euro', flag: '🇪🇺', symbol: '€' },
    { code: 'GBP', label: 'British Pound', flag: '🇬🇧', symbol: '£' },
    { code: 'JPY', label: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
    { code: 'AUD', label: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
    { code: 'CAD', label: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
    { code: 'CHF', label: 'Swiss Franc', flag: '🇨🇭', symbol: 'Fr' },
    { code: 'CNY', label: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
    { code: 'DKK', label: 'Danish Krone', flag: '🇩🇰', symbol: 'kr' },
    { code: 'HKD', label: 'Hong Kong Dollar', flag: '🇭🇰', symbol: 'HK$' },
    { code: 'IDR', label: 'Indonesian Rupiah', flag: '🇮🇩', symbol: 'Rp' },
    { code: 'KRW', label: 'Korean Won', flag: '🇰🇷', symbol: '₩' },
    { code: 'MYR', label: 'Malaysian Ringgit', flag: '🇲🇾', symbol: 'RM' },
    { code: 'NOK', label: 'Norwegian Krone', flag: '🇳🇴', symbol: 'kr' },
    { code: 'NZD', label: 'New Zealand Dollar', flag: '🇳🇿', symbol: 'NZ$' },
    { code: 'PHP', label: 'Philippine Peso', flag: '🇵🇭', symbol: '₱' },
    { code: 'SEK', label: 'Swedish Krona', flag: '🇸🇪', symbol: 'kr' },
    { code: 'SGD', label: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
    { code: 'THB', label: 'Thai Baht', flag: '🇹🇭', symbol: '฿' },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

/** Approximate fallback rates vs USD — used when the live fetch fails. */
export const FALLBACK_RATES: Record<string, number> = {
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 148, AUD: 1.53, CAD: 1.36,
    CHF: 0.89, DKK: 6.87, NOK: 10.55, SEK: 10.40, SGD: 1.34,
    NZD: 1.63, HKD: 7.82, THB: 35.1, IDR: 15700, MYR: 4.7,
    PHP: 56.5, CNY: 7.25, KRW: 1330,
}

/** Infer a sensible default currency from the browser locale. */
export function guessCurrencyFromLocale(): string {
    if (typeof navigator === 'undefined') return 'USD'
    const lang = navigator.language || 'en-US'
    const region = lang.split('-')[1]?.toUpperCase()
    const regionMap: Record<string, string> = {
        US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', NZ: 'NZD', SG: 'SGD',
        HK: 'HKD', JP: 'JPY', CN: 'CNY', KR: 'KRW', TH: 'THB', ID: 'IDR',
        MY: 'MYR', PH: 'PHP', NO: 'NOK', SE: 'SEK', DK: 'DKK', CH: 'CHF',
        DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
        AT: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR', GR: 'EUR', SK: 'EUR',
        SI: 'EUR', LU: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR',
    }
    const langMap: Record<string, string> = {
        ja: 'JPY', ko: 'KRW', th: 'THB', id: 'IDR', ms: 'MYR', zh: 'CNY',
        no: 'NOK', nb: 'NOK', nn: 'NOK', sv: 'SEK', da: 'DKK',
    }
    const lang2 = lang.split('-')[0].toLowerCase()
    const detected = (region && regionMap[region]) || langMap[lang2] || 'USD'
    return SUPPORTED_CURRENCIES.some(c => c.code === detected) ? detected : 'USD'
}
