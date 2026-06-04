import { withBase } from '@/lib/images'

export type PhotoSlot =
    | { kind: 'existing'; path: string }
    | { kind: 'new'; id: string; file: File; previewUrl: string }

export function getSlotPreviewUrl(slot: PhotoSlot): string {
    return slot.kind === 'existing' ? withBase(slot.path) : slot.previewUrl
}

/**
 * Uploads all photo slots.
 * For 'existing' slots, the path is used as-is.
 */
export async function uploadPhotoSlots(
    slots: PhotoSlot[],
    uploadUrl: string,
    extraFields?: Record<string, string>
): Promise<string[]> {
    const paths: string[] = []

    async function uploadOne(file: File): Promise<string> {
        const fd = new FormData()
        fd.append('file', file)
        if (extraFields) {
            for (const [key, val] of Object.entries(extraFields)) {
                fd.append(key, val)
            }
        }
        const res = await fetch(uploadUrl, { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to upload image')
        return data.path
    }

    for (const slot of slots) {
        if (slot.kind === 'existing') {
            paths.push(slot.path)
        } else {
            const processedPath = await uploadOne(slot.file)
            paths.push(processedPath)
        }
    }

    return paths
}
