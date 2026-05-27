'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export type UploadStatus = 'uploading' | 'done' | 'error'

export interface UploadJob {
    id: string
    filename: string
    progress: number  // 0-100
    status: UploadStatus
    errorMessage?: string
}

interface UploadQueueCtx {
    jobs: UploadJob[]
    enqueue: (formData: FormData, filename: string) => void
    dismiss: (id: string) => void
    dismissCompleted: () => void
}

const Ctx = createContext<UploadQueueCtx | null>(null)

export function useUploadQueue() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useUploadQueue must be inside UploadQueueProvider')
    return ctx
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
    const [jobs, setJobs] = useState<UploadJob[]>([])
    const router = useRouter()
    const counter = useRef(0)

    const enqueue = useCallback((formData: FormData, filename: string) => {
        const id = `upload-${++counter.current}`
        setJobs(prev => [...prev, { id, filename, progress: 0, status: 'uploading' }])

        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100)
                setJobs(prev => prev.map(j => j.id === id ? { ...j, progress: pct } : j))
            }
        })

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setJobs(prev => prev.map(j => j.id === id ? { ...j, progress: 100, status: 'done' } : j))
                router.refresh()
            } else {
                let errMsg = `Upload failed (${xhr.status})`
                try {
                    const data = JSON.parse(xhr.responseText)
                    if (data?.error) errMsg = data.error
                } catch { /* ignore */ }
                setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'error', errorMessage: errMsg } : j))
            }
        })

        xhr.addEventListener('error', () => {
            setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'error', errorMessage: 'Network error' } : j))
        })

        xhr.open('POST', '/api/gallery/upload')
        xhr.send(formData)
    }, [router])

    const dismiss = useCallback((id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id))
    }, [])

    const dismissCompleted = useCallback(() => {
        setJobs(prev => prev.filter(j => j.status === 'uploading'))
    }, [])

    return (
        <Ctx.Provider value={{ jobs, enqueue, dismiss, dismissCompleted }}>
            {children}
        </Ctx.Provider>
    )
}
