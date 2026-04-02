'use client'

import { useState, useEffect } from 'react'

interface HousingImageProps {
    src: string
    fallback: string
    alt: string
    className?: string
}

export function HousingImage({ src, fallback, alt, className }: HousingImageProps) {
    const [imageSrc, setImageSrc] = useState(src)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        setImageSrc(src)
        setHasError(false)
    }, [src])

    const handleError = () => {
        if (!hasError) {
            setHasError(true)
            setImageSrc(fallback)
        }
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imageSrc}
            alt={alt}
            onError={handleError}
            className={`absolute inset-0 w-full h-full ${className ?? ''}`}
        />
    )
}