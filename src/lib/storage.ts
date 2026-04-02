import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,          // e.g. http://localhost:9000
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
    // Required for MinIO / path-style S3-compatible endpoints
    forcePathStyle: true,
})

const bucket = process.env.S3_BUCKET ?? 'underwaterhousings'

/**
 * Upload a buffer to object storage and return the public URL path (relative key).
 * The full URL is constructed by the front-end using NEXT_PUBLIC_STORAGE_BASE_URL.
 */
const UPLOAD_TIMEOUT_MS = 15_000

export async function uploadToStorage(
    key: string,
    body: Buffer,
    contentType: string
): Promise<void> {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), UPLOAD_TIMEOUT_MS)
    try {
        await s3.send(
            new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
            { abortSignal: abort.signal }
        )
    } catch (err) {
        if (abort.signal.aborted) {
            throw new Error(`S3 upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Returns true when S3 storage is configured (i.e., S3_ENDPOINT is set).
 * When false the app falls back to writing files to /public.
 */
export function isStorageConfigured(): boolean {
    return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
}

const CONNECTIVITY_TIMEOUT_MS = 3_000

export async function checkStorageReachable(): Promise<void> {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), CONNECTIVITY_TIMEOUT_MS)
    try {
        await s3.send(
            new HeadBucketCommand({ Bucket: bucket }),
            { abortSignal: abort.signal }
        )
    } catch (err) {
        if (abort.signal.aborted) {
            throw new Error(`S3 storage is unreachable (timed out after ${CONNECTIVITY_TIMEOUT_MS / 1000}s)`)
        }
        throw new Error(`S3 storage is unavailable: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
        clearTimeout(timer)
    }
}
