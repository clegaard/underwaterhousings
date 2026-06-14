'use client'

import { useState } from 'react'

interface Props {
    src: string
    fallback: string
    alt: string
    className?: string
}

export default function SystemImage({ src, fallback, alt, className }: Props) {
    const [currentSrc, setCurrentSrc] = useState(src)

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            onError={() => {
                if (currentSrc !== fallback) {
                    setCurrentSrc(fallback)
                }
            }}
        />
    )
}
