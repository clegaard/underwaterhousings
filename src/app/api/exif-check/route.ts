import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/exif-check?camera=<exifId>&lens=<exifId>
 *
 * Lightweight check to see whether a camera and/or lens with the given
 * EXIF identifier exists in the database.  Used by the gallery upload
 * form to give the user a more helpful "no rig matched" message.
 *
 * Response: { cameraExists: boolean | null, lensExists: boolean | null }
 *   - null means the parameter was not provided (not checked)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const cameraExifId = searchParams.get('camera')
        const lensExifId = searchParams.get('lens')

        const [cameraExists, lensExists] = await Promise.all([
            cameraExifId
                ? prisma.camera.count({ where: { exifId: cameraExifId } }).then(n => n > 0)
                : Promise.resolve(null),
            lensExifId
                ? prisma.lens.count({ where: { exifId: lensExifId } }).then(n => n > 0)
                : Promise.resolve(null),
        ])

        return NextResponse.json({ cameraExists, lensExists })
    } catch (error) {
        console.error('Error checking EXIF identifiers:', error)
        return NextResponse.json({ cameraExists: null, lensExists: null }, { status: 500 })
    }
}
