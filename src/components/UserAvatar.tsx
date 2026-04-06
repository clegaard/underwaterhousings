interface Props {
    /** Fully resolved URL (already passed through withBase). null/undefined → show initials. */
    picture?: string | null
    /** Display name used to derive initials when no picture is available. */
    name: string
    /**
     * Predefined sizes. Add a size here if a new use-case requires it.
     * xs  = 16px  (gallery thumbnail)
     * sm  = 20px  (gallery lightbox)
     * md  = 28px  (review carousel)
     * base = 32px (navigation, review cards)
     * lg  = 80px  (profile page header)
     */
    size?: 'xs' | 'sm' | 'md' | 'base' | 'lg'
    /** Extra Tailwind classes forwarded to the root element (e.g. ring, shadow). */
    className?: string
}

const SIZE: Record<
    NonNullable<Props['size']>,
    { box: string; text: string }
> = {
    xs: { box: 'w-4 h-4', text: 'text-[9px]' },
    sm: { box: 'w-5 h-5', text: 'text-[10px]' },
    md: { box: 'w-7 h-7', text: 'text-xs' },
    base: { box: 'w-8 h-8', text: 'text-sm' },
    lg: { box: 'w-20 h-20', text: 'text-3xl' },
}

export default function UserAvatar({ picture, name, size = 'base', className = '' }: Props) {
    const { box, text } = SIZE[size]
    const base = `${box} rounded-full flex-shrink-0 ${className}`

    if (picture) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={picture}
                alt={name}
                className={`${base} object-cover`}
            />
        )
    }

    const initial = (name || '?').charAt(0).toUpperCase()
    return (
        <span className={`${base} bg-blue-600 flex items-center justify-center text-white font-bold ${text}`}>
            {initial}
        </span>
    )
}
