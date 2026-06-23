'use client'

import { useState, useCallback } from 'react'

interface StarRatingProps {
    value: number | null   // 1-5 or null (unrated)
    onChange?: (rating: number | null) => void
    readonly?: boolean
    size?: 'sm' | 'md'
    label?: string         // e.g. "Camera rating"
}

const RATING_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent',
}

export default function StarRating({ value, onChange, readonly = false, size = 'md', label }: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState<number | null>(null)
    const displayValue = hoverValue ?? value ?? 0

    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

    const handleClick = useCallback((star: number) => {
        if (!onChange || readonly) return
        // Toggle: clicking the same star clears the rating
        onChange(value === star ? null : star)
    }, [onChange, readonly, value])

    const handleKeyDown = useCallback((e: React.KeyboardEvent, star: number) => {
        if (!onChange || readonly) return
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(star)
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            const next = Math.min(5, (value ?? 0) + 1)
            onChange(next)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            const prev = Math.max(1, (value ?? 2) - 1)
            onChange(prev)
        }
    }, [onChange, readonly, value, handleClick])

    const interactive = !!onChange && !readonly

    return (
        <div className="inline-flex items-center gap-2" role="radiogroup" aria-label={label ?? 'Rating'}>
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => {
                    const filled = star <= displayValue
                    const active = interactive && star === hoverValue
                    return (
                        <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={value === star}
                            aria-label={`${star} star${star !== 1 ? 's' : ''}${RATING_LABELS[star] ? `: ${RATING_LABELS[star]}` : ''}`}
                            disabled={readonly}
                            tabIndex={star === 1 ? 0 : -1}
                            onClick={() => handleClick(star)}
                            onKeyDown={(e) => handleKeyDown(e, star)}
                            onMouseEnter={() => interactive && setHoverValue(star)}
                            onMouseLeave={() => interactive && setHoverValue(null)}
                            onFocus={() => interactive && setHoverValue(star)}
                            onBlur={() => interactive && setHoverValue(null)}
                            className={`${starSize} transition-all duration-150 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                            } ${active ? 'scale-110' : ''}`}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className={`w-full h-full transition-colors duration-150 ${
                                    filled
                                        ? 'text-amber-400 drop-shadow-sm'
                                        : 'text-gray-300 dark:text-gray-600'
                                }`}
                                fill="currentColor"
                                stroke="none"
                            >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </button>
                    )
                })}
            </div>
            {value != null && (
                <span className={`${textSize} font-medium text-amber-600 dark:text-amber-400 min-w-[4ch]`}>
                    {RATING_LABELS[value] ?? `${value}/5`}
                </span>
            )}
        </div>
    )
}
