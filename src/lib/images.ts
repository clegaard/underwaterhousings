export function getHousingImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/housings/fallback.png'
    return { src: productPhotos[0] ?? fallback, fallback }
}

export function getCameraImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/cameras/fallback.png'
    return { src: productPhotos[0] ?? fallback, fallback }
}

export function getAllHousingImages(
    productPhotos: string[],
    housingName: string
): Array<{ src: string; fallback: string; type: string; alt: string }> {
    const fallback = '/housings/fallback.png'
    return productPhotos.map(photo => {
        const baseName = (photo.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
        const type = baseName.split('-').pop() ?? baseName
        return { src: photo, fallback, type, alt: `${housingName} ${type} view` }
    })
}

export function getLensImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/lenses/fallback.png'
    return { src: productPhotos[0] ?? fallback, fallback }
}

export function getPortImagePathWithFallback(productPhotos: string[]): { src: string; fallback: string } {
    const fallback = '/ports/fallback.png'
    return { src: productPhotos[0] ?? fallback, fallback }
}
