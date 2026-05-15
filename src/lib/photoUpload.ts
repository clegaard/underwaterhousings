import { withBase } from '@/lib/images'

export type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

export function getSlotPreviewUrl(slot: PhotoSlot): string {
    return slot.kind === 'existing' ? withBase(slot.path) : slot.previewUrl
}

/**
 * Uploads any 'new' slots to the given endpoint and returns the final array of
 * stored paths (existing slots pass through unchanged).
 *
 * @param slots        The current photo slots from PhotoUploadField
 * @param uploadUrl    The API route that accepts a multipart POST with a 'file' field
 * @param extraFields  Optional additional FormData fields (e.g. { manufacturerSlug: '...' })
 */
export async function uploadPhotoSlots(
    slots: PhotoSlot[],
    uploadUrl: string,
    extraFields?: Record<string, string>
): Promise<string[]> {
    const paths: string[] = []
    for (const slot of slots) {
        if (slot.kind === 'existing') {
            paths.push(slot.path)
        } else {
            const fd = new FormData()
            fd.append('file', slot.file)
            if (extraFields) {
                for (const [key, val] of Object.entries(extraFields)) {
                    fd.append(key, val)
                }
            }
            const res = await fetch(uploadUrl, { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
            paths.push(data.path)
        }
    }
    return paths
}
