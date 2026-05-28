'use client'

/**
 * Generic mobile bottom sheet with drag-to-dismiss.
 *
 * Positioning strategy: a `fixed inset-0` flex column with `justify-end`
 * pins the sheet to the bottom of the screen. The sheet height is driven by
 * a CSS `height` property (not `transform: translateY`), so as the height
 * shrinks the TOP edge moves down — exactly matching the user's drag direction.
 * This also avoids the iOS keyboard gap that `fixed bottom-0` elements suffer
 * from, because the flex container lets the browser's own scroll-to-focus
 * behaviour bring the input above the keyboard naturally.
 *
 * Only rendered on mobile (`sm:hidden`). Desktop callers should provide their
 * own inline UI.
 */

import { ReactNode, useRef, useState, useEffect } from 'react'

interface Props {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    /** CSS height of the sheet when fully open, e.g. '72dvh'. Default: '72dvh' */
    height?: string
}

export default function BottomSheet({ isOpen, onClose, children, height = '72dvh' }: Props) {
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const touchStartY = useRef(0)
    const touchCurrentY = useRef(0)

    // Reset drag state whenever the sheet (re-)opens.
    useEffect(() => {
        if (isOpen) setDragOffset(0)
    }, [isOpen])

    /**
     * Animate the sheet closed by making its height collapse to 0, then notify
     * the parent. The transition takes 300 ms — same cubic-bezier as the
     * comment sheet in GalleryGrid.
     */
    function dismiss() {
        setDragOffset(window.innerHeight)
        setTimeout(() => {
            onClose()
            setDragOffset(0)
        }, 300)
    }

    function handleTouchStart(e: React.TouchEvent) {
        touchStartY.current = e.touches[0].clientY
        touchCurrentY.current = e.touches[0].clientY
        setIsDragging(true)
    }

    function handleTouchMove(e: React.TouchEvent) {
        const delta = e.touches[0].clientY - touchStartY.current
        touchCurrentY.current = e.touches[0].clientY
        // Only track downward movement (positive delta = dragging down = shrinking)
        if (delta > 0) setDragOffset(delta)
    }

    function handleTouchEnd() {
        setIsDragging(false)
        const delta = touchCurrentY.current - touchStartY.current
        if (delta > 80) {
            dismiss()
        } else {
            setDragOffset(0) // snap back
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
                onClick={onClose}
            />

            {/*
             * Full-screen flex container. `pointer-events-none` lets taps on
             * the empty upper area fall through to the backdrop above.
             * `justify-end` pins the sheet to the bottom of the screen.
             */}
            <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end pointer-events-none">
                <div
                    className="pointer-events-auto bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                    style={{
                        // Clamp height to ≥ 0: as dragOffset grows past `height`, the sheet
                        // collapses rather than going negative.
                        height: `max(0px, calc(${height} - ${dragOffset}px))`,
                        transition: isDragging
                            ? 'none'
                            : 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                >
                    {/* Drag handle — only this area initiates drag-to-dismiss */}
                    <div
                        className="flex justify-center pt-3 pb-1 shrink-0 select-none touch-none cursor-grab active:cursor-grabbing"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>

                    {/* Injected content fills remaining height */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}
