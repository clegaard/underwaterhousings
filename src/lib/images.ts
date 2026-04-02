const storageBase = process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? ''

export function withBase(path: string): string {
    return `${storageBase}${path}`
}

export function getHousingImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = withBase('/housings/fallback.png')
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getCameraImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = withBase('/cameras/fallback.png')
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getAllHousingImages(
    productPhotos: string[],
    housingName: string
): Array<{ src: string; fallback: string; type: string; alt: string }> {
    const fallback = withBase('/housings/fallback.png')
    return productPhotos.map(photo => {
        const baseName = (photo.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
        const type = baseName.split('-').pop() ?? baseName
        return { src: withBase(photo), fallback, type, alt: `${housingName} ${type} view` }
    })
}

export function getLensImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = withBase('/lenses/fallback.png')
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}

export function getPortImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = withBase('/ports/fallback.png')
    return { src: productPhotos[0] ? withBase(productPhotos[0]) : fallback, fallback }
}
