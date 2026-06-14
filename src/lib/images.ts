const storageBase = process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? ''

/**
 * Returns a URL for a storage asset.
 * When NEXT_PUBLIC_STORAGE_BASE_URL is set (S3/MinIO), routes through the
 * /api/media proxy so that all assets are served same-origin.
 * This avoids OpaqueResponseBlocking (ORB) for SVG files loaded in <img> tags.
 */
export function withBase(path: string): string {
    if (storageBase) {
        // Proxy through Next.js to avoid cross-origin ORB blocking for SVGs
        const cleanPath = path.startsWith('/') ? path : `/${path}`
        return `/api/media${cleanPath}`
    }
    // No external storage — path is relative to /public, use as-is
    return path
}

export function getHousingImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/housings/fallback.png'
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getCameraImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/cameras/fallback.png'
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getAllHousingImages(
    productPhotos: string[],
    housingName: string
): Array<{ src: string; fallback: string; type: string; alt: string }> {
    const fallback = '/housings/fallback.png'
    return productPhotos.map(photo => {
        const baseName = (photo.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
        const type = baseName.split('-').pop() ?? baseName
        return { src: withBase(photo), fallback, type, alt: `${housingName} ${type} view` }
    })
}

export function getLensImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/lenses/fallback.png'
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getPortImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/ports/fallback.png'
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

/**
 * Returns the best available image for a camera system.
 * Priority: system's own imagePath > housing photo > camera photo > lens photo > generic fallback.
 */
export function getCameraSystemImageWithFallback(system: {
    imagePath?: string | null
    housing?: { productPhotos: string[] } | null
    camera?: { productPhotos: string[] } | null
    lens?: { productPhotos: string[] } | null
}): { src: string; fallback: string } {
    const fallback = '/camera-systems/fallback-camera-system-smartphone.avif'

    if (system.imagePath) {
        return { src: withBase(system.imagePath), fallback }
    }
    if (system.housing?.productPhotos?.[0]) {
        return { src: withBase(system.housing.productPhotos[0]), fallback }
    }
    if (system.camera?.productPhotos?.[0]) {
        return { src: withBase(system.camera.productPhotos[0]), fallback }
    }
    if (system.lens?.productPhotos?.[0]) {
        return { src: withBase(system.lens.productPhotos[0]), fallback }
    }
    return { src: fallback, fallback }
}
