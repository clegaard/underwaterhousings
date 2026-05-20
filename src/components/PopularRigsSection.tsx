'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCurrency } from '@/components/CurrencyContext'

interface PopularRig {
    camera: { name: string; brandName: string }
    lens: { name: string } | null
    housing: { name: string; manufacturerName: string } | null
    port: { name: string } | null
    photoCount: number
    mainImageSrc: string
    mainImageFallback: string
    totalPriceUSD: number | null
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function RigCard({
    rig,
    onUse,
    formatMoney,
}: {
    rig: PopularRig
    onUse: () => void
    formatMoney: (amount: number, currency: string) => string
}) {
    const errored = useRef(false)
    const [imgSrc, setImgSrc] = useState(rig.mainImageSrc)

    return (
        <div className="flex-none w-64 md:w-auto bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-200 group flex flex-col">
            {/* Main image */}
            <div className="relative h-40 bg-linear-to-br from-blue-50 to-slate-100 overflow-hidden shrink-0">
                <Image
                    src={imgSrc}
                    alt={rig.housing?.name ?? rig.camera.name}
                    fill
                    className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    onError={() => {
                        if (!errored.current) {
                            errored.current = true
                            setImgSrc(rig.mainImageFallback)
                        }
                    }}
                    sizes="(max-width: 768px) 256px, 33vw"
                />
                {/* Photo count badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {rig.photoCount} {rig.photoCount === 1 ? 'photo' : 'photos'}
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                {/* Camera */}
                <div className="mb-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium leading-none mb-0.5">
                        {rig.camera.brandName}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{rig.camera.name}</p>
                </div>

                {/* Parts */}
                <div className="flex flex-col gap-1 mb-3 flex-1">
                    {rig.lens && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide w-14 shrink-0">Lens</span>
                            <span className="text-xs text-gray-700 truncate">{rig.lens.name}</span>
                        </div>
                    )}
                    {rig.housing && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide w-14 shrink-0">Housing</span>
                            <span className="text-xs text-gray-700 truncate">{rig.housing.name}</span>
                        </div>
                    )}
                    {rig.port && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide w-14 shrink-0">Port</span>
                            <span className="text-xs text-gray-700 truncate">{rig.port.name}</span>
                        </div>
                    )}
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
                    {rig.totalPriceUSD !== null ? (
                        <span className="text-sm font-semibold text-gray-700 tabular-nums">
                            {formatMoney(rig.totalPriceUSD, 'USD')}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-300">&mdash;</span>
                    )}
                    <button
                        type="button"
                        onClick={onUse}
                        className="shrink-0 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-2.5 py-1.5 rounded-lg transition-all duration-150"
                    >
                        Use setup →
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex-none w-64 md:w-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-40 bg-gray-100 animate-pulse" />
            <div className="p-4 space-y-2.5">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
                <div className="flex justify-between pt-1">
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse" />
                </div>
            </div>
        </div>
    )
}

// ─── Section ───────────────────────────────────────────────────────────────────

export default function PopularRigsSection() {
    const [rigs, setRigs] = useState<PopularRig[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const { formatMoney } = useCurrency()

    useEffect(() => {
        fetch('/api/popular-rigs')
            .then(r => r.json())
            .then(data => {
                if (data.success) setRigs(data.data)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    function applyTemplate(rig: PopularRig) {
        const params = new URLSearchParams()
        params.set('cameraBrand', rig.camera.brandName)
        params.set('cameraModel', rig.camera.name)
        if (rig.lens) params.set('lens', rig.lens.name)
        if (rig.housing) params.set('housing', rig.housing.name)
        if (rig.port) params.set('port', rig.port.name)
        router.replace(`/builder?${params.toString()}`, { scroll: false })
        document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' })
    }

    if (loading) {
        return (
            <div className="mt-8">
                <div className="h-5 w-52 bg-gray-200 rounded animate-pulse mb-1.5" />
                <div className="h-3 w-80 bg-gray-100 rounded animate-pulse mb-4" />
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-x-visible">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        )
    }

    if (rigs.length === 0) return null

    return (
        <div className="mt-0">
            <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Popular Camera Rigs</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                    Setups used most in the wild — click &ldquo;Use setup&rdquo; to load it into the builder
                </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-x-visible">
                {rigs.map((rig, i) => (
                    <RigCard
                        key={i}
                        rig={rig}
                        onUse={() => applyTemplate(rig)}
                        formatMoney={formatMoney}
                    />
                ))}
            </div>
        </div>
    )
}
