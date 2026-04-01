import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 20MB' }, { status: 400 })

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif']
    if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'housings', manufacturerSlug)
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))

    return NextResponse.json({ path: `/housings/${manufacturerSlug}/${filename}` }, { status: 201 })
}
