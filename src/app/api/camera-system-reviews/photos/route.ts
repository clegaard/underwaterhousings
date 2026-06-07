import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadToStorage, isStorageConfigured, checkStorageReachable } from '@/lib/storage'

export async function POST(request: NextRequest) {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 20MB' }, { status: 400 })

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif']
    if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
    }

    try {
        await checkStorageReachable()
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Storage unavailable' }, { status: 503 })
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const key = `reviews/${filename}`
    await uploadToStorage(key, Buffer.from(bytes), file.type)

    return NextResponse.json({ path: `/${key}` }, { status: 201 })
}
