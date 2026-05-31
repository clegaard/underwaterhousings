export interface ExtractedMeta {
    focalLength?: number
    aperture?: number
    iso?: number
    shutterSpeed?: string
    /** Location name parsed from a 📍 tag in the caption */
    location?: string
}

/**
 * Attempts to extract camera technical metadata from a social-media caption.
 * Many underwater photographers embed settings like "f/8, 1/250, ISO 200, 15mm" in captions
 * because platforms strip EXIF data.
 */
export function extractMetaFromCaption(caption: string): ExtractedMeta {
    const result: ExtractedMeta = {}

    // Aperture: f/2.8, F2.8, f2.8, F/11, f/1.4
    const apertureMatch = caption.match(/\bF\/?(\d+(?:\.\d+)?)\b/i)
    if (apertureMatch) result.aperture = parseFloat(apertureMatch[1])

    // Shutter speed: 1/250s, 1/250, 1/2000, 0.5s, 2sec, 30s
    const shutterMatch = caption.match(/\b(1\/\d{1,5}|(?:\d+(?:\.\d+)?)(?:s|sec))\b/i)
    if (shutterMatch) result.shutterSpeed = shutterMatch[1].replace(/sec$/i, 's')

    // ISO: ISO 400, iso400, ISO: 400, ISO-400
    const isoMatch = caption.match(/\bISO[-:\s]*(\d{2,6})\b/i)
    if (isoMatch) result.iso = parseInt(isoMatch[1])

    // Focal length: 15mm, 100 mm, 14mm (take first match)
    const focalMatch = caption.match(/\b(\d{1,4}(?:\.\d+)?)\s*mm\b/i)
    if (focalMatch) result.focalLength = parseFloat(focalMatch[1])

    // Location: 📍 Location Name, Country [optional flag emoji]
    const locationMatch = caption.match(/📍\s*([^\n]+)/)
    if (locationMatch) {
        result.location = locationMatch[1]
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // strip regional indicator chars (flag emoji)
            .replace(/\s+/g, ' ')
            .trim()
    }

    return result
}
