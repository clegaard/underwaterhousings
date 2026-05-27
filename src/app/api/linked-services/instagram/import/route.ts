import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadToStorage, isStorageConfigured, checkStorageReachable } from '@/lib/storage'

interface ImportSelection {
    /** Individual Instagram image ID (child ID for carousels) */
    mediaId: string
    mediaUrl: string
    /** Original Instagram caption (used as fallback for the gallery caption) */
    caption?: string
    timestamp?: string
    rigId: number
    width: number
    height: number
    // Optional metadata extracted from caption or manually set
    focalLength?: number
    aperture?: number
    iso?: number
    shutterSpeed?: string
    location?: string
}

// POST /api/linked-services/instagram/import
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)

    if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
    }
    try {
        await checkStorageReachable()
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Storage unavailable' }, { status: 503 })
    }

    let body: { selections: ImportSelection[] }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { selections } = body
    if (!Array.isArray(selections) || selections.length === 0) {
        return NextResponse.json({ error: 'No selections provided' }, { status: 400 })
    }

    // Validate rigId — must belong to this user
    const rigIds = [...new Set(selections.map(s => s.rigId))]
    const rigs = await prisma.cameraRig.findMany({ where: { id: { in: rigIds }, userId }, select: { id: true } })
    const validRigIds = new Set(rigs.map(r => r.id))

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const sel of selections) {
        if (!validRigIds.has(sel.rigId)) {
            errors.push(`Rig ${sel.rigId} not found or not owned by user`)
            continue
        }

        try {
            // Check for duplicate
            const existing = await prisma.galleryPhoto.findFirst({
                where: { userId, sourceService: 'instagram', sourceMediaId: sel.mediaId },
            })
            if (existing) { skipped++; continue }

            // Download the image from Instagram
            const imgRes = await fetch(sel.mediaUrl)
            if (!imgRes.ok) { errors.push(`Download failed for ${sel.mediaId} (${imgRes.status})`); continue }

            const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
            const ext = contentType.split('/')[1]?.split(';')[0]?.toLowerCase() ?? 'jpg'
            const buffer = Buffer.from(await imgRes.arrayBuffer())

            const key = `gallery/ig-${sel.mediaId}-${Date.now()}.${ext}`
            await uploadToStorage(key, buffer, contentType)

            // Convert "1/250" or "0.5s" shutter string → decimal seconds
            let shutterDecimal: number | null = null
            if (sel.shutterSpeed) {
                if (sel.shutterSpeed.includes('/')) {
                    const [num, den] = sel.shutterSpeed.split('/').map(Number)
                    shutterDecimal = den ? num / den : null
                } else {
                    shutterDecimal = parseFloat(sel.shutterSpeed.replace(/s$/i, '')) || null
                }
            }

            await prisma.galleryPhoto.create({
                data: {
                    imagePath: `/${key}`,
                    width: sel.width || 1080,
                    height: sel.height || 1080,
                    caption: sel.caption ?? null,
                    takenAt: sel.timestamp ? new Date(sel.timestamp) : null,
                    focalLength: sel.focalLength ?? null,
                    aperture: sel.aperture ?? null,
                    iso: sel.iso ?? null,
                    shutterSpeed: shutterDecimal,
                    location: sel.location ?? null,
                    rigId: sel.rigId,
                    userId,
                    sourceService: 'instagram',
                    sourceMediaId: sel.mediaId,
                },
            })
            imported++
        } catch (err) {
            errors.push(`Import error for ${sel.mediaId}: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    return NextResponse.json({ imported, skipped, errors })
}
