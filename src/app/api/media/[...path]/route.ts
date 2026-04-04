import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand, type GetObjectCommandOutput } from '@aws-sdk/client-s3'

const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
    forcePathStyle: true,
})

const bucket = process.env.S3_BUCKET ?? 'underwaterhousings'

// Map file extensions to content types
const CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    svg: 'image/svg+xml',
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    if (!process.env.S3_ENDPOINT) {
        return new NextResponse('Storage not configured', { status: 503 })
    }

    const { path } = await params
    const key = path.join('/')

    // Basic path traversal guard
    if (key.includes('..')) {
        return new NextResponse('Bad request', { status: 400 })
    }

    let result: GetObjectCommandOutput
    try {
        result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    } catch {
        return new NextResponse('Not found', { status: 404 })
    }

    if (!result.Body) {
        return new NextResponse('Not found', { status: 404 })
    }

    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    const contentType = result.ContentType ?? CONTENT_TYPES[ext] ?? 'application/octet-stream'

    const bytes = await result.Body.transformToByteArray()

    return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
