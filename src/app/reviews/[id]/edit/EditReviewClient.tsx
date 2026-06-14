'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RichReviewEditor from '@/components/RichReviewEditor'

type ComponentType = 'camera' | 'lens' | 'housing' | 'port' | 'portAdapter' | 'extensionRing'

const COMPONENT_LABEL: Record<ComponentType, string> = {
    camera: 'Camera',
    lens: 'Lens',
    housing: 'Housing',
    port: 'Port',
    portAdapter: 'Port Adapter',
    extensionRing: 'Extension Ring',
}

interface SelectableComponent {
    type: ComponentType
    id: number
    label: string
    manufacturerName?: string
    productId?: string | null
}

interface ReviewComponent {
    componentType: ComponentType
    componentId: number
    description: string | null
    label: string
    manufacturerName?: string
}

interface ReviewData {
    id: number
    title: string
    body: string
    status: string
    components: ReviewComponent[]
}

interface SelectedComponent {
    type: ComponentType
    id: number
    label: string
    description: string
}

export default function EditReviewClient({ review, userComponents, userId }: { review: ReviewData; userComponents: SelectableComponent[]; userId: number }) {
    const router = useRouter()
    const [title, setTitle] = useState(review.title)
    const [body, setBody] = useState(review.body)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Initialize selected from review's existing components
    const [selected, setSelected] = useState<SelectedComponent[]>(() =>
        review.components.map(rc => ({
            type: rc.componentType,
            id: rc.componentId,
            label: rc.label,
            description: rc.description ?? '',
        }))
    )

    const groupedComponents = useMemo(() => {
        const groups: Record<ComponentType, SelectableComponent[]> = {
            camera: [],
            lens: [],
            housing: [],
            port: [],
            portAdapter: [],
            extensionRing: [],
        }
        for (const c of userComponents) {
            groups[c.type].push(c)
        }
        return Object.entries(groups).filter(([, items]) => items.length > 0) as [ComponentType, SelectableComponent[]][]
    }, [userComponents])

    // Compute component filters for the gallery photo picker (from review's components)
    const componentFilters = useMemo(() => {
        const filters: { cameraId?: number; lensId?: number; housingId?: number; portId?: number } = {}
        const firstCamera = review.components.find(c => c.componentType === 'camera')
        const firstLens = review.components.find(c => c.componentType === 'lens')
        const firstHousing = review.components.find(c => c.componentType === 'housing')
        const firstPort = review.components.find(c => c.componentType === 'port')
        if (firstCamera) filters.cameraId = firstCamera.componentId
        if (firstLens) filters.lensId = firstLens.componentId
        if (firstHousing) filters.housingId = firstHousing.componentId
        if (firstPort) filters.portId = firstPort.componentId
        return filters
    }, [review.components])

    function isSelected(type: ComponentType, id: number): boolean {
        return selected.some(s => s.type === type && s.id === id)
    }

    function toggleComponent(type: ComponentType, id: number, label: string) {
        setSelected(prev => {
            const exists = prev.find(s => s.type === type && s.id === id)
            if (exists) {
                return prev.filter(s => !(s.type === type && s.id === id))
            }
            return [...prev, { type, id, label, description: '' }]
        })
    }

    function setDescription(type: ComponentType, id: number, description: string) {
        setSelected(prev =>
            prev.map(s => s.type === type && s.id === id ? { ...s, description } : s)
        )
    }

    async function handleSave(status: string) {
        if (!title.trim()) { setError('Please enter a title.'); return }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`/api/reviews?id=${review.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    body,
                    status,
                    components: selected.map(s => ({
                        componentType: s.type,
                        componentId: s.id,
                        description: s.description || null,
                    })),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to save')
            router.push(`/reviews/${review.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6">
            <Link href={`/reviews/${review.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to review
            </Link>

            <h1 className="text-2xl font-bold text-gray-900">Edit Review</h1>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Component selector (same as new review but with pre-selected) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Components reviewed
                    <span className="text-gray-400 font-normal ml-1">(pick individual gear from your camera systems)</span>
                </label>
                {groupedComponents.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No camera systems found.</p>
                ) : (
                    <div className="space-y-4">
                        {groupedComponents.map(([type, items]) => (
                            <div key={type}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                    {COMPONENT_LABEL[type]}s
                                </h3>
                                <div className="space-y-1.5">
                                    {items.map(c => {
                                        const sel = isSelected(type, c.id)
                                        const selData = selected.find(s => s.type === type && s.id === c.id)
                                        return (
                                            <div key={`${type}-${c.id}`}>
                                                <div className={`border rounded-xl p-2.5 transition-colors ${sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                                    <label className="flex items-start gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={sel}
                                                            onChange={() => toggleComponent(type, c.id, c.label)}
                                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800">{c.label}</p>
                                                            {c.productId && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5">{c.productId}</p>
                                                            )}
                                                        </div>
                                                    </label>
                                                    {sel && (
                                                        <input
                                                            type="text"
                                                            value={selData?.description ?? ''}
                                                            onChange={e => setDescription(type, c.id, e.target.value)}
                                                            placeholder="Optional context (e.g. Used for wide angle)"
                                                            className="mt-2 w-full border border-blue-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <RichReviewEditor
                    content={body}
                    onChange={setBody}
                    placeholder="Continue writing your review…"
                    userId={userId}
                    componentFilters={componentFilters}
                />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    onClick={() => handleSave('draft')}
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                    onClick={() => handleSave('published')}
                    disabled={saving}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                    {saving ? 'Publishing…' : 'Publish changes'}
                </button>
            </div>
        </div>
    )
}
