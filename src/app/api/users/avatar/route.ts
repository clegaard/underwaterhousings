import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadToStorage, isStorageConfigured, checkStorageReachable } from '@/lib/storage'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
    }

    if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
    }

    try {
        await checkStorageReachable()
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Storage unavailable' },
            { status: 503 }
        )
    }

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const key = `users/${userId}-${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await uploadToStorage(key, buffer, file.type)

    const imagePath = `/${key}`
    await prisma.user.update({ where: { id: userId }, data: { profilePicture: imagePath } })

    return NextResponse.json({ path: imagePath })
}
