/**
 * Get housing image path with error fallback (Server-side)
 * This checks file existence on the server to avoid multiple client requests
 * Finds any image file in the housing folder with supported extensions
 */
export function getHousingImagePathWithFallback(
    manufacturerSlug: string,
    housingSlug: string
): { src: string; fallback: string } {
    // Only run on server side
    if (typeof window === 'undefined') {
        try {
            // Use dynamic import to avoid bundling fs in client
            const { existsSync, readdirSync } = require('fs')
            const { join, extname } = require('path')

            const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']
            const basePath = join(process.cwd(), 'public', 'housings', manufacturerSlug, housingSlug)

            // Find any image in the folder
            if (existsSync(basePath)) {
                const files = readdirSync(basePath)
                const imageFiles = files.filter((file: string) => {
                    const ext = extname(file).toLowerCase()
                    return supportedExtensions.includes(ext)
                })

                // Use the first image found (alphabetically)
                if (imageFiles.length > 0) {
                    // Sort alphabetically to ensure consistent results
                    imageFiles.sort()
                    return {
                        src: `/housings/${manufacturerSlug}/${housingSlug}/${imageFiles[0]}`,
                        fallback: '/housings/fallback.png'
                    }
                }
            }

            // No image found - return fallback as src
            return {
                src: '/housings/fallback.png',
                fallback: '/housings/fallback.png'
            }
        } catch (error) {
            // If fs operations fail, fall through to default
            console.warn('Failed to check image existence:', error)
        }
    }

    // Client-side - can't check filesystem, return fallback
    // This ensures we don't try to load non-existent hardcoded paths
    return {
        src: '/housings/fallback.png',
        fallback: '/housings/fallback.png'
    }
}

/**
 * Get all actual images for a specific housing 
 * Returns array of actual image paths found in the housing directory
 * Server-side only - reads the filesystem to find real images
 * Sorts images with 'front' and 'back' prioritized, then alphabetically
 */
export function getAllHousingImages(
    manufacturerSlug: string,
    housingSlug: string
): Array<{ src: string; fallback: string; type: string; alt: string }> {
    const images: Array<{ src: string; fallback: string; type: string; alt: string }> = []

    // Only run on server side
    if (typeof window === 'undefined') {
        try {
            const { existsSync, readdirSync } = require('fs')
            const { join, extname, basename } = require('path')

            const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']
            const basePath = join(process.cwd(), 'public', 'housings', manufacturerSlug, housingSlug)

            if (existsSync(basePath)) {
                const files = readdirSync(basePath)
                const imageFiles = files.filter((file: string) => {
                    const ext = extname(file).toLowerCase()
                    return supportedExtensions.includes(ext)
                })

                // Create entries for each image found
                for (const imageFile of imageFiles) {
                    const fileNameWithoutExt = basename(imageFile, extname(imageFile))
                    images.push({
                        src: `/housings/${manufacturerSlug}/${housingSlug}/${imageFile}`,
                        fallback: '/housings/fallback.png',
                        type: fileNameWithoutExt,
                        alt: `${manufacturerSlug} ${housingSlug} ${fileNameWithoutExt} view`
                    })
                }

                // Sort images to show front first, then back, then others alphabetically
                images.sort((a, b) => {
                    const order = ['front', 'back']
                    const aIndex = order.indexOf(a.type)
                    const bIndex = order.indexOf(b.type)

                    if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex
                    } else if (aIndex !== -1) {
                        return -1
                    } else if (bIndex !== -1) {
                        return 1
                    } else {
                        return a.type.localeCompare(b.type)
                    }
                })
            }
        } catch (error) {
            console.warn('Failed to read housing images:', error)
        }
    }

    return images
}

/**
 * Get camera image path with error fallback (Server-side)
 * Looks in /public/cameras/{brandSlug}/{cameraSlug}/ for images
 */
export function getCameraImagePathWithFallback(
    brandSlug: string,
    cameraSlug: string
): { src: string; fallback: string } {
    // Only run on server side
    if (typeof window === 'undefined') {
        try {
            const { existsSync, readdirSync } = require('fs')
            const { join, extname } = require('path')

            const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']
            const basePath = join(process.cwd(), 'public', 'cameras', brandSlug, cameraSlug)

            if (existsSync(basePath)) {
                const files = readdirSync(basePath)
                const imageFiles = files.filter((file: string) => {
                    const ext = extname(file).toLowerCase()
                    return supportedExtensions.includes(ext)
                })

                if (imageFiles.length > 0) {
                    imageFiles.sort()
                    return {
                        src: `/cameras/${brandSlug}/${cameraSlug}/${imageFiles[0]}`,
                        fallback: '/cameras/fallback.png'
                    }
                }
            }

            return {
                src: '/cameras/fallback.png',
                fallback: '/cameras/fallback.png'
            }
        } catch (error) {
            console.warn('Failed to check camera image existence:', error)
        }
    }

    return {
        src: '/cameras/fallback.png',
        fallback: '/cameras/fallback.png'
    }
}

/**
 * Get lens image path with error fallback (Server-side)
 * Looks in /public/lenses/ for lens images
 * Lens images are typically named by lens slug or model
 */
export function getLensImagePathWithFallback(
    lensSlug: string,
    cameraMountName?: string
): { src: string; fallback: string } {
    // Only run on server side
    if (typeof window === 'undefined') {
        try {
            const { existsSync, readdirSync } = require('fs')
            const { join, extname, basename } = require('path')

            const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.avif']

            // Try to find lens image in lenses directory (root level)
            const basePath = join(process.cwd(), 'public', 'lenses')

            if (existsSync(basePath)) {
                const files = readdirSync(basePath)

                // Look for files matching the lens slug
                const matchingFiles = files.filter((file: string) => {
                    const ext = extname(file).toLowerCase()
                    const fileName = basename(file, ext)
                    return supportedExtensions.includes(ext) && fileName.includes(lensSlug)
                })

                if (matchingFiles.length > 0) {
                    return {
                        src: `/lenses/${matchingFiles[0]}`,
                        fallback: '/lenses/fallback.png'
                    }
                }
            }

            return {
                src: '/lenses/fallback.png',
                fallback: '/lenses/fallback.png'
            }
        } catch (error) {
            console.warn('Failed to check lens image existence:', error)
        }
    }

    return {
        src: '/lenses/fallback.png',
        fallback: '/lenses/fallback.png'
    }
}

/**
 * Get port image path with error fallback (Server-side)
 * Looks in /public/ports/{manufacturerSlug}/ for port images
 * Port images are typically named by port name or model
 */
export function getPortImagePathWithFallback(
    portName: string,
    manufacturerSlug?: string
): { src: string; fallback: string } {
    // Only run on server side
    if (typeof window === 'undefined') {
        try {
            const { existsSync, readdirSync } = require('fs')
            const { join, extname, basename } = require('path')

            const supportedExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.avif']

            // Normalize port name for file matching
            const normalizedPortName = portName.toLowerCase().replace(/\s+/g, '-')

            // Try to find port image in ports directory
            const possiblePaths = manufacturerSlug
                ? [join(process.cwd(), 'public', 'ports', manufacturerSlug)]
                : [
                    join(process.cwd(), 'public', 'ports', 'seafrogs'),
                    join(process.cwd(), 'public', 'ports', 'nauticam'),
                    join(process.cwd(), 'public', 'ports'),
                ]

            for (const basePath of possiblePaths) {
                if (existsSync(basePath)) {
                    const files = readdirSync(basePath)

                    // Look for files matching the port name
                    const matchingFiles = files.filter((file: string) => {
                        const ext = extname(file).toLowerCase()
                        const fileName = basename(file, ext).toLowerCase()
                        return supportedExtensions.includes(ext) &&
                            (fileName.includes(normalizedPortName) || fileName === normalizedPortName)
                    })

                    if (matchingFiles.length > 0) {
                        const relativePath = basePath.replace(join(process.cwd(), 'public'), '')
                        return {
                            src: `${relativePath}/${matchingFiles[0]}`,
                            fallback: '/ports/fallback.png'
                        }
                    }
                }
            }

            return {
                src: '/ports/fallback.png',
                fallback: '/ports/fallback.png'
            }
        } catch (error) {
            console.warn('Failed to check port image existence:', error)
        }
    }

    return {
        src: '/ports/fallback.png',
        fallback: '/ports/fallback.png'
    }
}