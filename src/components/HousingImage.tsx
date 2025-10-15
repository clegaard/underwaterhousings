'use client'

import Image from 'next/image'
import { useState } from 'react'

interface HousingImageProps {
    src: string
    fallback: string
    alt: string
    className?: string
}

export function HousingImage({ src, fallback, alt, className }: HousingImageProps) {
    const [imageSrc, setImageSrc] = useState(src)
    const [hasError, setHasError] = useState(false)

    const handleError = () => {
        if (!hasError) {
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