/**
 * Utility function to get the housing image path with fallback
 * @param manufacturerSlug - The manufacturer slug (e.g., 'nauticam', 'seafrogs')
 * @param housingSlug - The housing slug (e.g., 'na-om5ii')
 * @param imageType - The image type ('front' or 'back'), defaults to 'front'
 * @returns The image path to use, with fallback to /housings/fallback.png
 */
export function getHousingImagePath(
    manufacturerSlug: string,
    housingSlug: string,
    imageType: 'front' | 'back' = 'front'
): string {
    // Try the specific housing image first
    const primaryPath = `/housings/${manufacturerSlug}/${housingSlug}/${imageType}.webp`

    // For now, we'll assume the image exists if we have the slugs
    // In a production app, you might want to check if the file exists
    // or handle this through a dynamic API that verifies file existence
    if (manufacturerSlug && housingSlug) {
        return primaryPath
    }

    // Fallback to the default image
    return '/housings/fallback.png'
}

/**
 * Get housing image path with error fallback
 * This version can be used with Next.js Image component's onError prop
 * Returns multiple possible paths to try different image formats
 */
export function getHousingImagePathWithFallback(
    manufacturerSlug: string,
    housingSlug: string,
    imageType: 'front' | 'back' = 'front'
): { src: string; fallback: string; alternates: string[] } {
    const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png']
    const alternates = supportedExtensions.map(ext =>
        `/housings/${manufacturerSlug}/${housingSlug}/${imageType}${ext}`
    )

    return {
        src: alternates[0], // Try webp first
        fallback: '/housings/fallback.png',
        alternates: alternates.slice(1) // Other formats to try
    }
}

/**
 * Get all potential images for a specific housing 
 * Returns array of common image paths with their types and fallbacks
 * This is a client-safe version that doesn't require filesystem access
 */
export function getAllHousingImages(
    manufacturerSlug: string,
    housingSlug: string
): Array<{ src: string; fallback: string; type: string; alt: string }> {
    const commonImageTypes = ['front', 'back', 'side', 'top', 'bottom', 'detail', 'controls', 'ports']
    const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png']
    const images: Array<{ src: string; fallback: string; type: string; alt: string }> = []

    // Generate potential image paths for common image types
    for (const imageType of commonImageTypes) {
        for (const ext of supportedExtensions) {
            const imagePath = `/housings/${manufacturerSlug}/${housingSlug}/${imageType}${ext}`
            images.push({
                src: imagePath,
                fallback: '/housings/fallback.png',
                type: imageType,
                alt: `${manufacturerSlug} ${housingSlug} ${imageType} view`
            })
        }
    }

    return images
}