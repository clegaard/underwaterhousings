import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadToStorage, isStorageConfigured, checkStorageReachable } from '@/lib/storage'

async function requireSuperuser() {
    const session = await auth()
    if (!(session?.user as { isSuperuser?: boolean } | undefined)?.isSuperuser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
}

export async function POST(request: NextRequest) {
    const denied = await requireSuperuser()
    if (denied) return denied

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const manufacturerSlug = (formData.get('manufacturerSlug') as string | null)?.trim()

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!manufacturerSlug) return NextResponse.json({ error: 'manufacturerSlug is required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })

    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg']
    if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    // Resolve content type from extension for reliability (browsers report inconsistent
    // types for SVG: 'image/svg+xml', 'text/xml', 'application/xml', or even empty string)
    const CONTENT_TYPES: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        avif: 'image/avif',
        svg: 'image/svg+xml',
    }
    const contentType = CONTENT_TYPES[ext] ?? file.type
    if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
    }

    try {
        await checkStorageReachable()
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Storage unavailable' }, { status: 503 })
    }

    const filename = `${manufacturerSlug}-logo-${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    const key = `manufacturers/${filename}`
    await uploadToStorage(key, Buffer.from(bytes), contentType)

    return NextResponse.json({ path: `/${key}` }, { status: 201 })
}
