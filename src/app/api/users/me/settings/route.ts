import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            publicEmail: true,
            bio: true,
            website: true,
            twitterHandle: true,
            instagramHandle: true,
            linkedinUrl: true,
            allowFullResDownload: true,
        },
    })

    if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(user)
}

export async function PATCH(request: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { profile?: Record<string, string>; gallery?: { allowFullResDownload?: boolean } }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.profile) {
        const { name, publicEmail, bio, website, twitterHandle, instagramHandle, linkedinUrl } = body.profile

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
            }
            updateData.name = name.trim()
        }
        if (publicEmail !== undefined) updateData.publicEmail = publicEmail?.trim() || null
        if (bio !== undefined) updateData.bio = bio?.trim() || null
        if (website !== undefined) updateData.website = website?.trim() || null
        if (twitterHandle !== undefined) updateData.twitterHandle = twitterHandle?.trim() || null
        if (instagramHandle !== undefined) updateData.instagramHandle = instagramHandle?.trim() || null
        if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl?.trim() || null
    }

    if (body.gallery) {
        const { allowFullResDownload } = body.gallery
        if (allowFullResDownload !== undefined) {
            if (typeof allowFullResDownload !== 'boolean') {
                return NextResponse.json({ error: 'allowFullResDownload must be a boolean.' }, { status: 400 })
            }
            updateData.allowFullResDownload = allowFullResDownload
        }
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            name: true,
            publicEmail: true,
            bio: true,
            website: true,
            twitterHandle: true,
            instagramHandle: true,
            linkedinUrl: true,
            allowFullResDownload: true,
        },
    })

    return NextResponse.json(user)
}
