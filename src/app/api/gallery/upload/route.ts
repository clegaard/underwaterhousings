import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadToStorage, isStorageConfigured, checkStorageReachable } from '@/lib/storage'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!dbUser) {
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
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
    }

    try {
        await checkStorageReachable()
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Storage unavailable' }, { status: 503 })
    }

    const key = `gallery/${filename}`
    await uploadToStorage(key, buffer, file.type)
    const imagePath = `/${key}`
    const width = parseInt(formData.get('width') as string) || 1280
    const height = parseInt(formData.get('height') as string) || 854

    const title = (formData.get('title') as string)?.trim() || null
    const description = (formData.get('description') as string)?.trim() || null
    const location = (formData.get('location') as string)?.trim() || null
    const takenAtStr = (formData.get('takenAt') as string)?.trim()
    const focalLengthStr = (formData.get('focalLength') as string)?.trim()
    const apertureStr = (formData.get('aperture') as string)?.trim()
    const shutterSpeed = (formData.get('shutterSpeed') as string)?.trim() || null
    const cameraIdStr = (formData.get('cameraId') as string)?.trim()
    const lensIdStr = (formData.get('lensId') as string)?.trim()
    const housingIdStr = (formData.get('housingId') as string)?.trim()
    const portIdStr = (formData.get('portId') as string)?.trim()

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
            cameraId: cameraIdStr ? parseInt(cameraIdStr) : null,
            lensId: lensIdStr ? parseInt(lensIdStr) : null,
            housingId: housingIdStr ? parseInt(housingIdStr) : null,
            portId: portIdStr ? parseInt(portIdStr) : null,
            userId: dbUser.id,
        },
    })

    return NextResponse.json({ success: true, photo })
}
