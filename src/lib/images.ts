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
 */
export function getHousingImagePathWithFallback(
    manufacturerSlug: string,
    housingSlug: string,
    imageType: 'front' | 'back' = 'front'
): { src: string; fallback: string } {
    return {
        src: `/housings/${manufacturerSlug}/${housingSlug}/${imageType}.webp`,
        fallback: '/housings/fallback.png'
    }
}