'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RichReviewEditor, { generateDefaultContent } from '@/components/RichReviewEditor'

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

interface SelectedComponent {
    type: ComponentType
    id: number
    label: string
    description: string
}

export default function NewReviewClient({ userComponents, userId }: { userComponents: SelectableComponent[]; userId: number }) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [selected, setSelected] = useState<SelectedComponent[]>([])
    const [body, setBody] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Group available components by type
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
        // Only return groups that have items
        return Object.entries(groups).filter(([, items]) => items.length > 0) as [ComponentType, SelectableComponent[]][]
    }, [userComponents])

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

    async function handleSave(status: 'draft' | 'published') {
        if (!title.trim()) { setError('Please enter a title.'); return }
        if (selected.length === 0) { setError('Please select at least one component to review.'); return }
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
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
            if (!res.ok) throw new Error(data.error ?? 'Failed to save review')
            router.push(`/reviews/${data.data.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setSaving(false)
        }
    }

    function generateContent() {
        // Group selected components by type
        const cameras = selected.filter(s => s.type === 'camera').map(s => s.label)
        const lenses = selected.filter(s => s.type === 'lens').map(s => s.label)
        const housings = selected.filter(s => s.type === 'housing').map(s => s.label)
        const ports = selected.filter(s => s.type === 'port').map(s => s.label)
        const uniqueCameras = [...new Set(cameras)]
        const uniqueLenses = [...new Set(lenses)]
        const uniqueHousings = [...new Set(housings)]
        const uniquePorts = [...new Set(ports)]

        setBody(generateDefaultContent({
            cameras: uniqueCameras,
            lenses: uniqueLenses,
            housings: uniqueHousings,
            ports: uniquePorts,
        }))
    }

    const hasSelection = selected.length > 0

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to reviews
            </Link>

            <h1 className="text-2xl font-bold text-gray-900">Write a Review</h1>

            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review title</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. My experience with the Sony A7 IV"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Component selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select components to review
                    <span className="text-gray-400 font-normal ml-1">(pick individual gear from your camera systems)</span>
                </label>
                {groupedComponents.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        You don&apos;t have any camera systems yet.{' '}
                        <Link href={`/users/${userId}`} className="text-blue-600 hover:underline font-medium">
                            Create one on your profile
                        </Link>
                        {' '}first.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedComponents.map(([type, items]) => (
                            <div key={type}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                    {COMPONENT_LABEL[type]}s
                                </h3>
                                <div className="space-y-1.5">
                                    {items.map(c => {
                                        const isSel = isSelected(type, c.id)
                                        const selData = selected.find(s => s.type === type && s.id === c.id)
                                        return (
                                            <div key={`${type}-${c.id}`}>
                                                <div className={`border rounded-xl p-2.5 transition-colors ${isSel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                                    <label className="flex items-start gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSel}
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
                                                    {isSel && (
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

            {/* Generate content button */}
            {hasSelection && !body && (
                <button
                    onClick={generateContent}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                    Generate section headings from selected components
                </button>
            )}

            {/* Editor */}
            {hasSelection && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your review</label>
                    <RichReviewEditor
                        content={body}
                        onChange={setBody}
                        placeholder="Write about your experience with each component…"
                        userId={userId}
                    />
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Actions */}
            {hasSelection && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save as draft'}
                    </button>
                    <button
                        onClick={() => handleSave('published')}
                        disabled={saving || !body}
                        className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                        {saving ? 'Publishing…' : 'Publish review'}
                    </button>
                </div>
            )}
        </div>
    )
}
