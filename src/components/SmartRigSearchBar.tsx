'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/components/CurrencyContext'
import { withBase } from '@/lib/images'

// ─── API response types ───────────────────────────────────────────────────────

interface CameraItem {
    id: number; name: string; brandName: string; brandSlug: string
    interchangeableLens: boolean; canBeUsedWithoutAHousing: boolean
    productPhoto: string | null; photoCount: number
}
interface LensItem {
    id: number; name: string; focalLengthTele: number; focalLengthWide: number | null
    manufacturerName: string | null; productPhoto: string | null; photoCount: number
}
interface HousingItem {
    id: number; name: string; manufacturerName: string; manufacturerSlug: string
    interchangeablePort: boolean; housingMountId: number | null
    productPhoto: string | null; priceAmount: number | null; priceCurrency: string | null; photoCount: number
}
interface PortItem {
    id: number; name: string; manufacturerName: string; isFlatPort: boolean
    productPhoto: string | null; priceAmount: number | null; priceCurrency: string | null; photoCount: number
}

type Step = 'camera' | 'lens' | 'housing' | 'port'
type AnyItem = CameraItem | LensItem | HousingItem | PortItem

// ─── Design tokens per step ───────────────────────────────────────────────────

const STEP_THEME = {
    camera: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
    lens: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', dot: 'bg-violet-500' },
    housing: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-500' },
    port: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
}

// ─── Step icons ─────────────────────────────────────────────────────────────

function StepIcon({ step, className }: { step: Step; className?: string }) {
    if (step === 'camera') return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
    if (step === 'lens') return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
            <circle cx="12" cy="12" r="3.5" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeWidth={1.5} d="M12 4v2M12 18v2M4 12h2M18 12h2" />
        </svg>
    )
    if (step === 'housing') return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            <circle cx="12" cy="13.5" r="2.5" strokeWidth={1.5} />
        </svg>
    )
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
            <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeWidth={1.5} d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        </svg>
    )
}

// ─── Selected item card ───────────────────────────────────────────────────────

function SelectedCard({
    step, label, value, photo, isEditing, onEdit, onRemove,
}: {
    step: Step; label: string; value: string; photo: string | null
    isEditing: boolean; onEdit: () => void; onRemove: () => void
}) {
    const [imgErr, setImgErr] = useState(false)
    const errRef = useRef(false)
    const t = STEP_THEME[step]
    const ringColor = t.border.replace('border-', 'ring-')

    const showPhoto = !!photo && !imgErr

    return (
        <div className={`group inline-flex items-center rounded-xl border transition-all duration-150 hover:shadow-sm
            ${isEditing ? `${t.bg} ${t.border} ring-2 ring-offset-1 ${ringColor}` : `${t.bg} ${t.border}`}
        `}>
            {/* Main clickable area */}
            <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-2 pl-3 pr-1 py-2 text-left"
            >
                {showPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photo!} alt=""
                        className="w-8 h-8 rounded-lg object-contain bg-white border border-white/60 shrink-0"
                        onError={() => { if (!errRef.current) { errRef.current = true; setImgErr(true) } }}
                    />
                ) : (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 border border-white/60 shrink-0 ${t.text} opacity-50`}>
                        <StepIcon step={step} className="w-4 h-4" />
                    </div>
                )}
                <div className="min-w-0">
                    <p className={`text-[10px] font-semibold uppercase tracking-wide opacity-50 ${t.text}`}>{label}</p>
                    <p className={`text-sm font-semibold truncate max-w-36 ${t.text}`}>{value}</p>
                </div>
            </button>
            {/* Remove button — separate element to avoid nested <button> */}
            <button
                type="button"
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onRemove() }}
                className={`mr-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-40 hover:opacity-80! transition-opacity text-sm leading-none shrink-0 ${t.text}`}
                aria-label={`Remove ${label}`}
            >×</button>
        </div>
    )
}

// ─── Popularity bar ───────────────────────────────────────────────────────────

function PopBar({ count, max }: { count: number; max: number }) {
    if (!max || count === 0) return null
    const pct = Math.max(4, Math.round((count / max) * 100))
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-300 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right">{count}</span>
        </div>
    )
}

// ─── Suggestion row ───────────────────────────────────────────────────────────

function SuggestionRow({
    step, item, maxCount, onSelect, formatMoney,
}: {
    step: Step; item: AnyItem; maxCount: number; onSelect: () => void
    formatMoney: (amount: number | null | undefined, currency?: string | null) => string | null
}) {
    const [imgErr, setImgErr] = useState(false)
    const errRef = useRef(false)
    const photo: string | null = (item as any).productPhoto ?? null
    const showImg = !!photo && !imgErr

    let secondary = ''
    if (step === 'camera') {
        secondary = (item as CameraItem).brandName
    } else if (step === 'lens') {
        const l = item as LensItem
        const fl = l.focalLengthWide ? `${l.focalLengthWide}–${l.focalLengthTele} mm` : `${l.focalLengthTele} mm`
        secondary = l.manufacturerName ? `${l.manufacturerName} · ${fl}` : fl
    } else if (step === 'housing') {
        secondary = (item as HousingItem).manufacturerName
    } else if (step === 'port') {
        const p = item as PortItem
        secondary = `${p.isFlatPort ? 'Flat port' : 'Dome port'} · ${p.manufacturerName}`
    }

    const priceItem = item as HousingItem | PortItem
    const price = (step === 'housing' || step === 'port') && priceItem.priceAmount != null
        ? formatMoney(priceItem.priceAmount, priceItem.priceCurrency ?? 'USD')
        : null

    return (
        <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onSelect() }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
            <div className="w-11 h-11 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                {showImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photo!} alt=""
                        className="w-full h-full object-contain p-1.5"
                        onError={() => { if (!errRef.current) { errRef.current = true; setImgErr(true) } }}
                    />
                ) : (
                    <StepIcon step={step} className="w-5 h-5 text-gray-300" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                {secondary && <p className="text-xs text-gray-400 truncate mt-0.5">{secondary}</p>}
            </div>
            {price && <span className="text-xs font-semibold text-gray-500 tabular-nums shrink-0">{price}</span>}
            <PopBar count={item.photoCount} max={maxCount} />
        </button>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SmartRigSearchBar({ cameras, housings }: { cameras: any[]; housings: any[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { formatMoney } = useCurrency()

    const cameraModel = searchParams.get('cameraModel') ?? ''
    const lensName = searchParams.get('lens') ?? ''
    const housingName = searchParams.get('housing') ?? ''
    const portName = searchParams.get('port') ?? ''

    const selectedCamera = useMemo(
        () => (cameraModel ? cameras.find((c: any) => c.name === cameraModel) ?? null : null),
        [cameras, cameraModel],
    )
    const selectedHousing = useMemo(
        () => (housingName ? housings.find((h: any) => h.name === housingName) ?? null : null),
        [housings, housingName],
    )

    const isFixedLens = selectedCamera?.interchangeableLens === false
    const isFixedPort = selectedHousing?.interchangeablePort === false

    const [suggestions, setSuggestions] = useState<AnyItem[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState('')
    const [editingStep, setEditingStep] = useState<Step | null>(null)
    const [selectedPhotos, setSelectedPhotos] = useState<Partial<Record<Step, string | null>>>({})

    const inputRef = useRef<HTMLInputElement>(null)

    // Derive photos from server-side props (survive page reload)
    const cameraPhotoFromProp: string | null = selectedCamera?.productPhotos?.[0]
        ? withBase(selectedCamera.productPhotos[0]) : null
    const housingPhotoFromProp: string | null = selectedHousing?.productPhotos?.[0]
        ? withBase(selectedHousing.productPhotos[0]) : null

    const chipPhotos: Partial<Record<Step, string | null>> = {
        camera: cameraPhotoFromProp ?? selectedPhotos.camera ?? null,
        lens: selectedPhotos.lens ?? null,
        housing: housingPhotoFromProp ?? selectedPhotos.housing ?? null,
        port: selectedPhotos.port ?? null,
    }

    const naturalStep = useMemo((): Step | null => {
        if (!cameraModel) return 'camera'
        if (!isFixedLens && !lensName) return 'lens'
        if (!selectedCamera?.canBeUsedWithoutAHousing && !housingName) return 'housing'
        if (housingName && !isFixedPort && !portName) return 'port'
        return null
    }, [cameraModel, lensName, housingName, portName, isFixedLens, isFixedPort, selectedCamera])

    const activeStep: Step | null = editingStep ?? naturalStep

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
        selectedCamera?.id, selectedCamera?.cameraMount?.id,
        selectedHousing?.id, selectedHousing?.housingMount?.id,
    ])

    useEffect(() => {
        setQuery('')
        if (activeStep) setTimeout(() => inputRef.current?.focus(), 40)
    }, [activeStep])

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
            return tokens.every(t => text.toLowerCase().includes(t))
        })
    }, [suggestions, query, activeStep])

    const maxCount = filtered[0]?.photoCount ?? 1

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
        const photo: string | null = (item as any).productPhoto ?? null
        if (activeStep === 'camera') {
            setSelectedPhotos({ camera: photo })
        } else {
            setSelectedPhotos(prev => ({ ...prev, [activeStep]: photo }))
        }
        setEditingStep(null)
        setQuery('')
        if (activeStep === 'camera') {
            const c = item as CameraItem
            updateParams({ cameraBrand: c.brandName, cameraModel: c.name })
        } else {
            updateParams({ [activeStep]: item.name })
        }
    }

    function removeToken(which: Step) {
        setEditingStep(null)
        const cascade: Step[] = ['camera', 'lens', 'housing', 'port']
        const idx = cascade.indexOf(which)
        setSelectedPhotos(prev => {
            const next = { ...prev }
            cascade.slice(idx).forEach(s => delete next[s])
            return next
        })
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

    function toggleEdit(step: Step) {
        setEditingStep(prev => (prev === step ? null : step))
    }

    const stepTitles: Record<Step, string> = {
        camera: 'Choose a camera',
        lens: selectedCamera?.cameraMount?.name
            ? `Lenses for ${selectedCamera.brand?.name ?? ''} ${selectedCamera.cameraMount.name}`
            : 'Choose a lens',
        housing: cameraModel ? `Housings for ${cameraModel}` : 'Choose a housing',
        port: selectedHousing?.housingMount?.name
            ? `Ports for ${selectedHousing.housingMount.name}`
            : 'Choose a port',
    }

    const stepPlaceholders: Record<Step, string> = {
        camera: 'e.g. Sony A7 IV, iPhone 15 Pro…',
        lens: 'e.g. 16-35mm, 90mm macro…',
        housing: 'e.g. Nauticam, Sea Frogs…',
        port: 'e.g. flat port, dome…',
    }

    const anySelected = !!(cameraModel || lensName || housingName || portName)
    const isComplete = !activeStep

    return (
        <div className="space-y-5">

            {/* ── Selected item chips ── */}
            {anySelected && (
                <div className="flex flex-wrap gap-2">
                    {cameraModel && (
                        <SelectedCard
                            step="camera" label="Camera" value={cameraModel}
                            photo={chipPhotos.camera ?? null}
                            isEditing={editingStep === 'camera'}
                            onEdit={() => toggleEdit('camera')}
                            onRemove={() => removeToken('camera')}
                        />
                    )}
                    {lensName && !isFixedLens && (
                        <SelectedCard
                            step="lens" label="Lens" value={lensName}
                            photo={chipPhotos.lens ?? null}
                            isEditing={editingStep === 'lens'}
                            onEdit={() => toggleEdit('lens')}
                            onRemove={() => removeToken('lens')}
                        />
                    )}
                    {housingName && (
                        <SelectedCard
                            step="housing" label="Housing" value={housingName}
                            photo={chipPhotos.housing ?? null}
                            isEditing={editingStep === 'housing'}
                            onEdit={() => toggleEdit('housing')}
                            onRemove={() => removeToken('housing')}
                        />
                    )}
                    {portName && !isFixedPort && (
                        <SelectedCard
                            step="port" label="Port" value={portName}
                            photo={chipPhotos.port ?? null}
                            isEditing={editingStep === 'port'}
                            onEdit={() => toggleEdit('port')}
                            onRemove={() => removeToken('port')}
                        />
                    )}
                </div>
            )}

            {/* ── Active step search panel ── */}
            {activeStep && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-800">{stepTitles[activeStep]}</p>
                            {editingStep && (
                                <button
                                    type="button"
                                    onClick={() => setEditingStep(null)}
                                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={stepPlaceholders[activeStep]}
                                className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl
                                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                    text-gray-900 placeholder-gray-400 outline-none transition-all"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); setQuery('') }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto overscroll-contain">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-sm font-medium text-gray-400">
                                    {query ? `No results for "${query}"` : 'No compatible items found'}
                                </p>
                                {query && (
                                    <button type="button" onClick={() => setQuery('')}
                                        className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            filtered.map(item => (
                                <SuggestionRow
                                    key={item.id}
                                    step={activeStep}
                                    item={item}
                                    maxCount={maxCount}
                                    onSelect={() => selectItem(item)}
                                    formatMoney={formatMoney}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Rig complete banner ── */}
            {isComplete && (
                <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">Rig complete — scroll down for details</span>
                </div>
            )}
        </div>
    )
}
