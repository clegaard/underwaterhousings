'use client'

import Image from 'next/image'
import { useState } from 'react'

interface HousingImageProps {
    src: string
    fallback: string
    alt: string
    className?: string
    alternates?: string[]
}

export function HousingImage({ src, fallback, alt, className, alternates = [] }: HousingImageProps) {
    const [imageSrc, setImageSrc] = useState(src)
    const [alternateIndex, setAlternateIndex] = useState(0)
    const [hasError, setHasError] = useState(false)

    const handleError = () => {
        if (!hasError && alternateIndex < alternates.length) {
            // Try the next alternate format
            setImageSrc(alternates[alternateIndex])
            setAlternateIndex(alternateIndex + 1)
        } else if (!hasError) {
            // All alternates failed, use fallback
            setHasError(true)
            setImageSrc(fallback)
        }
    }

    return (
        <Image
            src={imageSrc}
            alt={alt}
            fill
            className={className}
            onError={handleError}
        />
    )
}