import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
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

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'File must be under 20MB' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif']
    if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'gallery', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))

    const imagePath = `/gallery/uploads/${filename}`
    const width = parseInt(formData.get('width') as string) || 1280
    const height = parseInt(formData.get('height') as string) || 854

    const title = (formData.get('title') as string)?.trim() || null
    const description = (formData.get('description') as string)?.trim() || null
    const location = (formData.get('location') as string)?.trim() || null
    const takenAtStr = (formData.get('takenAt') as string)?.trim()
    const focalLengthStr = (formData.get('focalLength') as string)?.trim()
    const apertureStr = (formData.get('aperture') as string)?.trim()
    const shutterSpeed = (formData.get('shutterSpeed') as string)?.trim() || null
    const cameraRigIdStr = (formData.get('cameraRigId') as string)?.trim()

    const photo = await prisma.galleryPhoto.create({
        data: {
            imagePath,
            width,
            height,
            title,
            description,
            location,
            takenAt: takenAtStr ? new Date(takenAtStr) : null,
            focalLength: focalLengthStr ? parseFloat(focalLengthStr) : null,
            aperture: apertureStr ? parseFloat(apertureStr) : null,
            shutterSpeed,
            cameraRigId: cameraRigIdStr ? parseInt(cameraRigIdStr) : null,
            userId: parseInt(session.user.id),
        },
    })

    return NextResponse.json({ success: true, photo })
}
