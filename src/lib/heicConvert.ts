/**
 * Client-side HEIC/HEIF → AVIF conversion using the heic-to library.
 *
 * Pipeline: HEIC → ImageBitmap (raw, uncompressed pixels) → AVIF.
 *
 * The ImageBitmap produced by heicTo({ type: 'bitmap' }) is the in-memory
 * equivalent of a BMP file — fully lossless, raw RGBA pixel data — so no
 * quality is lost before the final AVIF encoding step.
 *
 * Falls back to WebP if the current browser does not support AVIF encoding.
 */

export type ConversionStage = {
    /** Human-readable status message, e.g. "Decoding HEIC…" */
    label: string
    /** Progress within the overall conversion, 0..1 */
    progress: number
}

export type MultiFileProgress = {
    /** 0-based index of the HEIC file currently being converted */
    current: number
    /** Total number of HEIC files to convert in this batch */
    total: number
    /** Stage progress for the current file */
    stage: ConversionStage
}

/** Returns true if the file is HEIC/HEIF (by MIME type or extension). */
export function isHeicFile(file: File): boolean {
    return (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        /\.(heic|heif)$/i.test(file.name)
    )
}

/**
 * Converts a HEIC/HEIF file to AVIF (or WebP as fallback).
 * Calls `onProgress` at each stage so the caller can drive a progress bar.
 */
export async function convertHeicToAvif(
    file: File,
    onProgress?: (stage: ConversionStage) => void,
): Promise<File> {
    onProgress?.({ label: 'Decoding HEIC…', progress: 0.05 })

    // Lazy-import: the WASM module is only downloaded the first time it is needed
    const { heicTo } = await import('heic-to')

    onProgress?.({ label: 'Converting to raw bitmap…', progress: 0.3 })

    // heicTo({ type: 'bitmap' }) returns an ImageBitmap —
    // raw, uncompressed pixel data (the in-memory equivalent of BMP).
    const bitmap = await heicTo({ blob: file, type: 'bitmap' })

    onProgress?.({ label: 'Encoding to AVIF…', progress: 0.65 })

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    bitmap.close() // release GPU memory

    const outBlob = await encodeCanvas(canvas)

    onProgress?.({ label: 'Done', progress: 1 })

    // Use the correct extension for whichever format was actually encoded
    const ext = outBlob.type === 'image/webp' ? 'webp' : 'avif'
    const baseName = file.name.replace(/\.(heic|heif)$/i, '')
    return new File([outBlob], `${baseName}.${ext}`, {
        type: outBlob.type,
        lastModified: file.lastModified,
    })
}

/** Try AVIF encoding; fall back to WebP if the browser doesn't support AVIF. */
async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    for (const [type, quality] of [
        ['image/avif', 0.85],
        ['image/webp', 0.92],
    ] as Array<[string, number]>) {
        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, type, quality),
        )
        // Some browsers (e.g. Safari) silently fall back to PNG when the
        // requested format is unsupported — verify the actual MIME type
        // before accepting the blob.
        if (blob && blob.type === type) return blob
    }
    throw new Error('No supported image encoding format (AVIF or WebP) available in this browser')
}
