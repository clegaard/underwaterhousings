'use client'

import { useState } from 'react'
import { useRenderTracker } from '@/lib/useRenderTracker'

interface HousingImageProps {
    src: string
    fallback: string
    alt: string
    className?: string
}

export function HousingImage({ src, fallback, alt, className }: HousingImageProps) {
    useRenderTracker('HousingImage', { src, fallback, alt })
    const [failed, setFailed] = useState(false)
    // Derived-state pattern: reset failed flag synchronously during render when src changes,
    // avoiding an extra useEffect render cycle (critical for grids with many cards).
    const [prevSrc, setPrevSrc] = useState(src)
    if (src !== prevSrc) {
        setPrevSrc(src)
        setFailed(false)
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={failed ? fallback : src}
            alt={alt}
            onError={() => { if (!failed) setFailed(true) }}
            className={`absolute inset-0 w-full h-full ${className ?? ''}`}
        />
    )
}