'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'

// ─── API response types ───────────────────────────────────────────────────────

interface CameraItem {
    id: number
    name: string
    brandName: string
    brandSlug: string
    interchangeableLens: boolean
    canBeUsedWithoutAHousing: boolean
    productPhoto: string | null
    photoCount: number
}

interface LensItem {
    id: number
    name: string
    focalLengthTele: number
    focalLengthWide: number | null
    manufacturerName: string | null
    productPhoto: string | null
    photoCount: number
}

interface HousingItem {
    id: number
    name: string
    manufacturerName: string
    manufacturerSlug: string
    interchangeablePort: boolean
    housingMountId: number | null
    productPhoto: string | null
    priceAmount: number | null
    priceCurrency: string | null
    photoCount: number
}

interface PortItem {
    id: number
    name: string
    manufacturerName: string
    isFlatPort: boolean
    productPhoto: string | null
    priceAmount: number | null
    priceCurrency: string | null
    photoCount: number
}

type Step = 'camera' | 'lens' | 'housing' | 'port'
type AnyItem = CameraItem | LensItem | HousingItem | PortItem

// ─── Popularity bar ───────────────────────────────────────────────────────────

function PopBar({ count, max }: { count: number; max: number }) {
    if (!max || count === 0) return null
    const pct = Math.max(6, Math.round((count / max) * 100))
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-300 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right">{count}</span>
        </div>
    )
}

// ─── Suggestion row ───────────────────────────────────────────────────────────

function SuggestionRow({
    step,
    item,
    maxCount,
    onSelect,
    formatMoney,
}: {
    step: Step
    item: AnyItem
    maxCount: number
    onSelect: () => void
    formatMoney: (amount: number, currency: string) => string
}) {
    const [imgFailed, setImgFailed] = useState(false)
    const errRef = useRef(false)
    const photo: string | null = (item as any).productPhoto ?? null
    const showImage = step !== 'lens' && !!photo && !imgFailed

    let secondary = ''
    if (step === 'camera') {
        secondary = (item as CameraItem).brandName
    } else if (step === 'lens') {
        const l = item as LensItem
        const fl = l.focalLengthWide
            ? `${l.focalLengthWide}–${l.focalLengthTele} mm`
            : `${l.focalLengthTele} mm`
        secondary = l.manufacturerName ? `${l.manufacturerName} · ${fl}` : fl
    } else if (step === 'housing') {
        secondary = (item as HousingItem).manufacturerName
    } else if (step === 'port') {
        const p = item as PortItem
        secondary = `${p.isFlatPort ? 'Flat port' : 'Dome port'} · ${p.manufacturerName}`
    }

    const priceItem = item as HousingItem | PortItem
    const showPrice = (step === 'housing' || step === 'port') && priceItem.priceAmount !== null

    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault() // keep focus on input until handler fires
                onSelect()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
        >
            {/* Product image (all steps except lens) */}
            {step !== 'lens' && (
                <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {showImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={photo!}
                            alt=""
                            className="w-full h-full object-contain p-1"
                            onError={() => {
                                if (!errRef.current) { errRef.current = true; setImgFailed(true) }
                            }}
                        />
                    ) : (
                        <div className="w-5 h-4 bg-gray-200 rounded-sm" />
                    )}
                </div>
            )}

            {/* Name + secondary info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                {secondary && <p className="text-xs text-gray-400 truncate">{secondary}</p>}
            </div>

            {/* Price */}
            {showPrice && (
                <span className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
                    {formatMoney(priceItem.priceAmount!, priceItem.priceCurrency ?? 'USD')}
                </span>
            )}

            {/* Popularity bar */}
            <PopBar count={item.photoCount} max={maxCount} />
        </button>
    )
}

// ─── Token pill ───────────────────────────────────────────────────────────────

function Token({
    label,
    value,
    colorCls,
    onRemove,
}: {
    label: string
    value: string
    colorCls: string
    onRemove: () => void
}) {
    return (
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${colorCls} max-w-55`}>
            <span className="opacity-50 text-[10px] uppercase tracking-wide shrink-0">{label}</span>
            <span className="truncate mx-0.5">{value}</span>
            <button
                type="button"
                onClick={onRemove}
                className="opacity-40 hover:opacity-90 transition-opacity ml-0.5 leading-none text-base shrink-0"
                aria-label={`Remove ${label}`}
            >
                ×
            </button>
        </span>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SmartRigSearchBar({
    cameras,
    housings,
}: {
    cameras: any[]
    housings: any[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { formatMoney } = useCurrency()

    const cameraModel = searchParams.get('cameraModel') ?? ''
    const lensName = searchParams.get('lens') ?? ''
    const housingName = searchParams.get('housing') ?? ''
    const portName = searchParams.get('port') ?? ''

    const selectedCamera = useMemo(
        () => (cameraModel ? cameras.find((c: any) => c.name === cameraModel) ?? null : null),
        [cameras, cameraModel]
    )
    const selectedHousing = useMemo(
        () => (housingName ? housings.find((h: any) => h.name === housingName) ?? null : null),
        [housings, housingName]
    )

    // Determine what to search for next
    const activeStep = useMemo((): Step | null => {
        if (!cameraModel) return 'camera'
        if (selectedCamera?.interchangeableLens !== false && !lensName) return 'lens'
        if (!housingName) return 'housing'
        if (selectedHousing?.interchangeablePort !== false && !portName) return 'port'
        return null
    }, [cameraModel, lensName, housingName, portName, selectedCamera, selectedHousing])

    const [suggestions, setSuggestions] = useState<AnyItem[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(true)

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Fetch suggestions whenever the step or relevant context changes
    useEffect(() => {
        if (!activeStep) { setSuggestions([]); return }
        let cancelled = false
        setLoading(true)

        const params = new URLSearchParams({ step: activeStep })
        if (activeStep === 'lens') {
            if (selectedCamera?.cameraMount?.id) params.set('cameraMountId', String(selectedCamera.cameraMount.id))
            if (selectedCamera?.id) params.set('cameraId', String(selectedCamera.id))
        } else if (activeStep === 'housing') {
            if (selectedCamera?.id) params.set('cameraId', String(selectedCamera.id))
        } else if (activeStep === 'port') {
            if (selectedHousing?.housingMount?.id) params.set('housingMountId', String(selectedHousing.housingMount.id))
            if (selectedHousing?.id) params.set('housingId', String(selectedHousing.id))
            if (selectedCamera?.id) params.set('cameraId', String(selectedCamera.id))
        }

        fetch(`/api/rig-suggestions?${params.toString()}`)
            .then(r => r.json())
            .then(data => { if (!cancelled) { setSuggestions(Array.isArray(data) ? data : []); setLoading(false) } })
            .catch(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [
        activeStep,
        selectedCamera?.id,
        selectedCamera?.cameraMount?.id,
        selectedHousing?.id,
        selectedHousing?.housingMount?.id,
    ])

    // Close dropdown on outside click
    useEffect(() => {
        function onMouseDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', onMouseDown)
        return () => document.removeEventListener('mousedown', onMouseDown)
    }, [])

    // Re-open dropdown and clear search text when step advances
    useEffect(() => { setQuery(''); setIsOpen(true) }, [activeStep])

    function updateParams(updates: Record<string, string>) {
        const params = new URLSearchParams(searchParams.toString())
        const cascade = ['cameraBrand', 'cameraModel', 'lens', 'housing', 'port']
        const firstChanged = cascade.findIndex(k => k in updates)
        cascade.slice(firstChanged + 1).forEach(k => { if (!(k in updates)) params.delete(k) })
        Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k) })
        router.replace(`/builder?${params.toString()}`, { scroll: false })
    }

    function selectItem(item: AnyItem) {
        if (!activeStep) return
        setIsOpen(false)
        setQuery('')
        if (activeStep === 'camera') {
            const c = item as CameraItem
            updateParams({ cameraBrand: c.brandName, cameraModel: c.name })
        } else if (activeStep === 'lens') {
            updateParams({ lens: item.name })
        } else if (activeStep === 'housing') {
            updateParams({ housing: item.name })
        } else {
            updateParams({ port: item.name })
        }
    }

    function removeToken(which: 'camera' | 'lens' | 'housing' | 'port') {
        const params = new URLSearchParams(searchParams.toString())
        if (which === 'camera') {
            ['cameraBrand', 'cameraModel', 'lens', 'housing', 'port'].forEach(k => params.delete(k))
        } else if (which === 'lens') {
            params.delete('lens'); params.delete('port')
        } else if (which === 'housing') {
            params.delete('housing'); params.delete('port')
        } else {
            params.delete('port')
        }
        router.replace(`/builder?${params.toString()}`, { scroll: false })
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return suggestions
        const tokens = q.split(/\s+/).filter(Boolean)
        return suggestions.filter(item => {
            let text = item.name
            if (activeStep === 'camera') text = `${(item as CameraItem).brandName} ${item.name}`
            else if (activeStep === 'lens') text = `${(item as LensItem).manufacturerName ?? ''} ${item.name}`
            else if (activeStep === 'housing') text = `${(item as HousingItem).manufacturerName} ${item.name}`
            else if (activeStep === 'port') text = `${(item as PortItem).manufacturerName} ${item.name}`
            const lower = text.toLowerCase()
            return tokens.every(t => lower.includes(t))
        })
    }, [suggestions, query, activeStep])

    const maxCount = filtered[0]?.photoCount ?? 1

    const placeholders: Record<Step, string> = {
        camera: 'Search cameras…',
        lens: 'Search lenses…',
        housing: 'Search housings…',
        port: 'Search ports…',
    }

    const dropdownHeader: Record<Step, string> = {
        camera: 'Popular cameras',
        lens: selectedCamera
            ? `Lenses for ${selectedCamera.brand?.name ?? ''} ${selectedCamera.cameraMount?.name ?? 'mount'}`
            : 'Lenses',
        housing: cameraModel ? `Housings for ${cameraModel}` : 'Housings',
        port: selectedHousing?.housingMount?.name
            ? `Ports for ${selectedHousing.housingMount.name} mount`
            : 'Ports',
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Token bar + input */}
            <div
                className={`flex flex-wrap items-center gap-2 bg-white border rounded-xl px-3 py-2.5 shadow-sm transition-all ${isOpen && activeStep ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
                    }`}
            >
                {cameraModel && (
                    <Token
                        label="Camera"
                        value={cameraModel}
                        colorCls="bg-blue-50 text-blue-800 border-blue-200"
                        onRemove={() => removeToken('camera')}
                    />
                )}
                {lensName && selectedCamera?.interchangeableLens !== false && (
                    <Token
                        label="Lens"
                        value={lensName}
                        colorCls="bg-violet-50 text-violet-800 border-violet-200"
                        onRemove={() => removeToken('lens')}
                    />
                )}
                {housingName && (
                    <Token
                        label="Housing"
                        value={housingName}
                        colorCls="bg-teal-50 text-teal-800 border-teal-200"
                        onRemove={() => removeToken('housing')}
                    />
                )}
                {portName && (
                    <Token
                        label="Port"
                        value={portName}
                        colorCls="bg-amber-50 text-amber-800 border-amber-200"
                        onRemove={() => removeToken('port')}
                    />
                )}

                {activeStep ? (
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholders[activeStep]}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
                        onFocus={() => setIsOpen(true)}
                        className="flex-1 min-w-36 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent py-0.5"
                    />
                ) : (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 py-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Rig complete
                    </span>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && activeStep && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {dropdownHeader[activeStep]}
                        </span>
                        {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                        )}
                    </div>

                    {!loading && filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                            {query ? 'No matches' : 'No compatible items found'}
                        </p>
                    ) : (
                        <ul className="max-h-112 overflow-y-auto divide-y divide-gray-50">
                            {filtered.map(item => (
                                <li key={item.id}>
                                    <SuggestionRow
                                        step={activeStep}
                                        item={item}
                                        maxCount={maxCount}
                                        onSelect={() => selectItem(item)}
                                        formatMoney={formatMoney}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
