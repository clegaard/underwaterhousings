import { useRef, useEffect } from 'react'

/**
 * Development-only hook that logs component render counts to the console.
 *
 * Usage:
 *   useRenderTracker('MyComponent', { someProp, otherProp })
 *
 * Output:
 *   [Mount] MyComponent
 *   [Re-render #2] MyComponent – prop changes: { someProp: { from: 1, to: 2 } }
 *   [Re-render #3] MyComponent – state/context change (no tracked prop changes)
 *
 * Add to suspected components, then watch the browser console. A component
 * that re-renders more than expected is a candidate for React.memo or a
 * context split.
 */
export function useRenderTracker(
    componentName: string,
    trackedProps?: Record<string, unknown>,
) {
    const renderCount = useRef(0)
    const prevPropsRef = useRef<Record<string, unknown> | undefined>(undefined)

    renderCount.current += 1
    const currentCount = renderCount.current

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return

        if (currentCount === 1) {
            console.log(`%c[Mount] ${componentName}`, 'color: #22c55e; font-weight: bold')
            return
        }

        const changed: Record<string, { from: unknown; to: unknown }> = {}
        if (trackedProps && prevPropsRef.current) {
            for (const key of Object.keys(trackedProps)) {
                if (!Object.is(trackedProps[key], prevPropsRef.current[key])) {
                    changed[key] = { from: prevPropsRef.current[key], to: trackedProps[key] }
                }
            }
        }

        if (Object.keys(changed).length > 0) {
            console.log(
                `%c[Re-render #${currentCount}] ${componentName}%c – prop changes:`,
                'color: #f59e0b; font-weight: bold',
                'color: inherit',
                changed,
            )
        } else {
            console.log(
                `%c[Re-render #${currentCount}] ${componentName}%c – state/context change`,
                'color: #f97316; font-weight: bold',
                'color: #9ca3af',
            )
        }

        prevPropsRef.current = trackedProps
    })
}
