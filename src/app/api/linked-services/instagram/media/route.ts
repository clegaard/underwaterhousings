import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const GRAPH = 'https://graph.instagram.com/v22.0'

export interface InstagramImage {
    /** Instagram media ID (or child ID for carousels) */
    id: string
    mediaUrl: string
    timestamp: string
}

export interface InstagramLocation {
    /** Facebook Place ID — used to build the Instagram location page URL */
    id?: string
    name: string
    /** May be absent when the Graph API returns only a named place without coordinates */
    lat?: number
    lng?: number
}

export interface InstagramMediaItem {
    id: string
    mediaType: 'IMAGE' | 'CAROUSEL_ALBUM'
    /** Cover image URL (also used for single images) */
    mediaUrl: string
    caption?: string
    timestamp: string
    permalink: string
    /** Geotag attached to the post, if any */
    location?: InstagramLocation
    /** Child images for CAROUSEL_ALBUM */
    children?: InstagramImage[]
}

// GET /api/linked-services/instagram/media[?after=<cursor>]
// Returns the user's Instagram media and a set of already-imported media IDs.
// Pass ?after= to page through older posts.
export async function GET(req: NextRequest) {
    const after = req.nextUrl.searchParams.get('after')
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)

    const linked = await prisma.linkedService.findUnique({
        where: { userId_service: { userId, service: 'instagram' } },
    })

    if (!linked) {
        return NextResponse.json({ error: 'Instagram not connected' }, { status: 404 })
    }

    const token = linked.accessToken

    try {
        const mediaUrl = new URL(`${GRAPH}/me/media`)
        mediaUrl.searchParams.set('fields', 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink,location')
        mediaUrl.searchParams.set('access_token', token)
        mediaUrl.searchParams.set('limit', '24')
        if (after) mediaUrl.searchParams.set('after', after)

        const res = await fetch(mediaUrl.toString())

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return NextResponse.json({ error: 'Instagram API error', detail: err }, { status: 502 })
        }

        const raw = await res.json() as {
            paging?: { cursors?: { after?: string }; next?: string }
            data: Array<{
                id: string
                media_type: string
                media_url?: string
                thumbnail_url?: string
                caption?: string
                timestamp: string
                permalink: string
                location?: { id?: string; name?: string; latitude?: number; longitude?: number }
            }>
        }

        // Only IMAGE and CAROUSEL_ALBUM — skip standalone videos
        const filtered = (raw.data ?? []).filter(
            m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM'
        )

        // Enrich carousel albums with their children
        const media: InstagramMediaItem[] = await Promise.all(
            filtered.map(async (item): Promise<InstagramMediaItem> => {
                const location: InstagramLocation | undefined =
                    item.location?.name
                        ? {
                            id: item.location.id,
                            name: item.location.name,
                            lat: item.location.latitude,
                            lng: item.location.longitude,
                        }
                        : undefined

                if (item.media_type === 'IMAGE') {
                    return {
                        id: item.id,
                        mediaType: 'IMAGE',
                        mediaUrl: item.media_url ?? '',
                        caption: item.caption,
                        timestamp: item.timestamp,
                        permalink: item.permalink,
                        location,
                    }
                }

                // Fetch carousel children
                let children: InstagramImage[] = []
                try {
                    const childRes = await fetch(
                        `${GRAPH}/${item.id}/children?fields=id,media_type,media_url,timestamp&access_token=${token}`
                    )
                    if (childRes.ok) {
                        const childData = await childRes.json() as { data: Array<{ id: string; media_type?: string; media_url?: string; timestamp: string }> }
                        children = (childData.data ?? [])
                            // exclude videos inside carousels
                            .filter(c => c.media_url && c.media_type !== 'VIDEO')
                            .map(c => ({ id: c.id, mediaUrl: c.media_url!, timestamp: c.timestamp }))
                    }
                } catch { /* non-critical */ }

                return {
                    id: item.id,
                    mediaType: 'CAROUSEL_ALBUM',
                    mediaUrl: item.media_url ?? children[0]?.mediaUrl ?? '',
                    caption: item.caption,
                    timestamp: item.timestamp,
                    permalink: item.permalink,
                    location,
                    children,
                }
            })
        )

        // Find which individual image IDs are already imported
        const allImageIds = media.flatMap(m =>
            m.mediaType === 'CAROUSEL_ALBUM' && m.children?.length
                ? m.children.map(c => c.id)
                : [m.id]
        )

        const imported = await prisma.galleryPhoto.findMany({
            where: { userId, sourceService: 'instagram', sourceMediaId: { in: allImageIds } },
            select: { sourceMediaId: true },
        })
        const importedIds = imported.map(p => p.sourceMediaId).filter(Boolean) as string[]

        // Cursor for the next page (null when we've reached the oldest post)
        const nextCursor = raw.paging?.cursors?.after ?? null

        return NextResponse.json({ media, importedIds, nextCursor })
    } catch (err) {
        console.error('[Instagram media]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
