'use client'

import { useState, useCallback } from 'react'
import { HousingImage } from '@/components/HousingImage'

/* ─────────────── Types ─────────────── */

interface LensData {
    id: number
    name: string
    slug: string
    manufacturer: { name: string }
    cameraMount: { name: string }
    focalLengthTele: number
    focalLengthWide: number | null
    isZoomLens: boolean
    productPhotos: string[]
    imageInfo: { src: string; fallback: string }
}

interface PortData {
    id: number
    name: string
    slug: string
    isFlatPort: boolean
    productPhotos: string[]
    housingMount: { id: number; name: string; slug: string } | null
    imageInfo: { src: string; fallback: string }
}

interface RingData {
    id: number
    name: string
    slug: string
    lengthMm: number | null
    housingMount: { id: number; name: string; slug: string } | null
}

interface EntryRing {
    id: number
    order: number
    extensionRing: { id: number; name: string; slug: string; lengthMm: number | null }
}

interface Entry {
    id: number
    lens: LensData
    port: (Omit<PortData, 'housingMount'>) | null
    rings: EntryRing[]
    notes: string | null
}

interface Props {
    manufacturerId: number
    manufacturerSlug: string
    manufacturerName: string
    entries: Entry[]
    allLenses: LensData[]
    allPorts: PortData[]
    allExtensionRings: RingData[]
    isSuperuser: boolean
}

/* ─────────────── Focal length helper ─────────────── */
function focalLabel(lens: { focalLengthTele: number; focalLengthWide: number | null; isZoomLens: boolean }) {
    if (lens.focalLengthWide) return `${lens.focalLengthWide}–${lens.focalLengthTele}mm`
    return `${lens.focalLengthTele}mm`
}

/* ─────────────── Chain node component ─────────────── */
function ChainArrow() {
    return (
        <svg className="shrink-0 w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    )
}

/* ─────────────── Main Component ─────────────── */
export default function PortChartClient({
    manufacturerId,
    allLenses,
    allPorts,
    allExtensionRings,
    entries: initial,
    isSuperuser,
}: Props) {
    const [entries, setEntries] = useState(initial)
    const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
    const [target, setTarget] = useState<Entry | null>(null)

    // Form state
    const [lensSearch, setLensSearch] = useState('')
    const [lensId, setLensId] = useState<number | ''>('')
    const [portId, setPortId] = useState<number | ''>('')
    const [ringIds, setRingIds] = useState<number[]>([])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Lens search filter
    const filteredLenses = allLenses.filter(l =>
        lensSearch.trim() === '' ||
        `${l.manufacturer.name} ${l.name}`.toLowerCase().includes(lensSearch.toLowerCase())
    )
    const selectedLens = allLenses.find(l => l.id === lensId) ?? null

    function resetForm() {
        setLensSearch('')
        setLensId('')
        setPortId('')
        setRingIds([])
        setNotes('')
        setError(null)
    }

    function openAdd() { resetForm(); setTarget(null); setModal('add') }

    function openEdit(entry: Entry) {
        setTarget(entry)
        setLensId(entry.lens.id)
        setLensSearch('')
        setPortId(entry.port?.id ?? '')
        setRingIds(entry.rings.map(r => r.extensionRing.id))
        setNotes(entry.notes ?? '')
        setError(null)
        setModal('edit')
    }

    function openDelete(entry: Entry) { setTarget(entry); setError(null); setModal('delete') }

    function close() { resetForm(); setModal(null); setTarget(null); setError(null) }

    function addRing(id: number) {
        setRingIds(prev => [...prev, id])
    }

    function removeRing(idx: number) {
        setRingIds(prev => prev.filter((_, i) => i !== idx))
    }

    function moveRing(from: number, to: number) {
        setRingIds(prev => {
            const arr = [...prev]
            const [item] = arr.splice(from, 1)
            arr.splice(to, 0, item)
            return arr
        })
    }

    // Build a new entry object from API response
    function buildEntry(data: {
        id: number
        lens: LensData & { manufacturer: { name: string }; cameraMount: { name: string }; productPhotos: string[] }
        port: PortData | null
        rings: { id: number; order: number; extensionRing: { id: number; name: string; slug: string; lengthMm: number | null } }[]
        notes: string | null
    }): Entry {
        return {
            id: data.id,
            lens: {
                ...data.lens,
                imageInfo: allLenses.find(l => l.id === data.lens.id)?.imageInfo ?? { src: '', fallback: '/housings/fallback.png' },
            },
            port: data.port ? {
                ...data.port,
                imageInfo: allPorts.find(p => p.id === data.port!.id)?.imageInfo ?? { src: '', fallback: '/housings/fallback.png' },
            } : null,
            rings: data.rings,
            notes: data.notes,
        }
    }

    async function handleAdd() {
        if (!lensId) return
        setLoading(true); setError(null)
        try {
            const res = await fetch('/api/admin/port-chart-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manufacturerId, lensId, portId: portId || null, ringIds, notes: notes || null }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
            setEntries(prev => [...prev, buildEntry(data)].sort((a, b) => a.lens.name.localeCompare(b.lens.name) || a.id - b.id))
            close()
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    async function handleEdit() {
        if (!target || !lensId) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/port-chart-entries?id=${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lensId, portId: portId || null, ringIds, notes: notes || null }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
            setEntries(prev => prev.map(e => e.id === target.id ? buildEntry(data) : e))
            close()
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    async function handleDelete() {
        if (!target) return
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/port-chart-entries?id=${target.id}`, { method: 'DELETE' })
            if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
            setEntries(prev => prev.filter(e => e.id !== target.id))
            close()
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    /* ─── Group entries by lens ─── */
    const lensGroups: Map<number, { lens: Entry['lens']; entries: Entry[] }> = new Map()
    for (const entry of entries) {
        if (!lensGroups.has(entry.lens.id)) {
            lensGroups.set(entry.lens.id, { lens: entry.lens, entries: [] })
        }
        lensGroups.get(entry.lens.id)!.entries.push(entry)
    }
    const groups = Array.from(lensGroups.values())

    return (
        <>
            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300" />
                    Lens
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300" />
                    Extension ring
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" />
                    Port
                </div>
                {isSuperuser && (
                    <button
                        onClick={openAdd}
                        className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add combination
                    </button>
                )}
            </div>

            {/* Empty state */}
            {groups.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-sm">No port chart entries yet.</p>
                    {isSuperuser && (
                        <button onClick={openAdd} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                            Add the first combination →
                        </button>
                    )}
                </div>
            )}

            {/* Port chart table */}
            {groups.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[auto_1fr_auto] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="w-48 pr-4">Lens</div>
                        <div>Combination (Rings → Port)</div>
                        <div className="w-32 text-right">Notes</div>
                    </div>

                    {/* Groups */}
                    {groups.map((group, groupIdx) => (
                        <div key={group.lens.id} className={groupIdx > 0 ? 'border-t-2 border-gray-100' : ''}>
                            {group.entries.map((entry, entryIdx) => (
                                <div
                                    key={entry.id}
                                    className="group grid grid-cols-[auto_1fr_auto] gap-0 hover:bg-blue-50/40 transition-colors"
                                >
                                    {/* Lens cell — only shown on first row of each group */}
                                    <div className={`w-48 flex items-center gap-3 px-4 py-3 ${entryIdx > 0 ? 'border-t border-dashed border-gray-100' : ''}`}>
                                        {entryIdx === 0 ? (
                                            <>
                                                <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-blue-50 border border-blue-100">
                                                    <HousingImage
                                                        src={entry.lens.imageInfo.src}
                                                        fallback={entry.lens.imageInfo.fallback}
                                                        alt={entry.lens.name}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 leading-snug truncate">{entry.lens.name}</p>
                                                    <p className="text-[10px] text-gray-400">{focalLabel(entry.lens)}</p>
                                                    <p className="text-[10px] text-gray-400">{entry.lens.manufacturer.name}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="ml-13 flex-1" />
                                        )}
                                    </div>

                                    {/* Combination chain */}
                                    <div className={`flex items-center gap-1 px-4 py-3 ${entryIdx > 0 ? 'border-t border-dashed border-gray-100' : ''}`}>
                                        {entry.rings.length === 0 && !entry.port && (
                                            <span className="text-xs text-gray-400 italic">No rings or port specified</span>
                                        )}

                                        {/* Extension rings */}
                                        {entry.rings.map((r, rIdx) => (
                                            <div key={r.id} className="flex items-center gap-1">
                                                {rIdx === 0 && <ChainArrow />}
                                                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
                                                    <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                                        <circle cx="12" cy="12" r="4" strokeWidth={2} />
                                                    </svg>
                                                    {r.extensionRing.lengthMm != null ? `${r.extensionRing.lengthMm}mm` : r.extensionRing.name}
                                                </div>
                                                <ChainArrow />
                                            </div>
                                        ))}

                                        {/* Port */}
                                        {entry.port ? (
                                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                                <div className="relative w-7 h-7 rounded overflow-hidden bg-emerald-50 shrink-0">
                                                    <HousingImage
                                                        src={entry.port.imageInfo.src}
                                                        fallback={entry.port.imageInfo.fallback}
                                                        alt={entry.port.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-emerald-900 leading-none whitespace-nowrap">{entry.port.name}</p>
                                                    <p className="text-[10px] text-emerald-600">{entry.port.isFlatPort ? 'Flat' : 'Dome'}</p>
                                                </div>
                                            </div>
                                        ) : entry.rings.length > 0 ? (
                                            <span className="text-[10px] text-gray-400 italic">No port</span>
                                        ) : null}

                                        {/* Superuser actions */}
                                        {isSuperuser && (
                                            <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(entry)} title="Edit" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => openDelete(entry)} title="Delete" className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 shadow-sm">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1H8a1 1 0 00-1 1h10z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div className={`w-32 px-4 py-3 ${entryIdx > 0 ? 'border-t border-dashed border-gray-100' : ''}`}>
                                        {entry.notes && (
                                            <p className="text-[10px] text-gray-500 leading-relaxed">{entry.notes}</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add another combination for this lens (superuser) */}
                            {isSuperuser && (
                                <button
                                    onClick={() => {
                                        resetForm__internal(group.lens.id)
                                        setModal('add')
                                    }}
                                    className="w-full flex items-center gap-1.5 px-4 py-2 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors border-t border-dashed border-gray-100"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add another combination for {group.lens.name}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add / Edit modal ── */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-5">{modal === 'edit' ? 'Edit combination' : 'Add port chart combination'}</h3>

                        {/* Lens selector */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lens</label>
                        <input
                            type="text"
                            value={selectedLens ? `${selectedLens.manufacturer.name} ${selectedLens.name}` : lensSearch}
                            onChange={e => { setLensSearch(e.target.value); setLensId('') }}
                            onFocus={e => { if (selectedLens) { setLensSearch(''); setLensId('') } }}
                            placeholder="Search lenses…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-1"
                        />
                        {(lensSearch.trim() !== '' || !selectedLens) && (
                            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto mb-4 divide-y divide-gray-100">
                                {filteredLenses.slice(0, 30).map(l => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => { setLensId(l.id); setLensSearch('') }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                                    >
                                        <span className="font-medium text-gray-900">{l.name}</span>
                                        <span className="text-gray-400 ml-2 text-xs">{l.manufacturer.name} · {focalLabel(l)}</span>
                                    </button>
                                ))}
                                {filteredLenses.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No lenses found</p>}
                            </div>
                        )}
                        {selectedLens && <div className="mb-4" />}

                        {/* Extension rings — ordered list */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Extension rings (in order)</label>
                        <div className="space-y-1.5 mb-2">
                            {ringIds.map((rid, idx) => {
                                const ring = allExtensionRings.find(r => r.id === rid)
                                return (
                                    <div key={`${rid}-${idx}`} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                                        <span className="text-xs text-purple-700 font-medium flex-1 truncate">
                                            {ring?.lengthMm != null ? `${ring.lengthMm}mm` : ring?.name ?? `Ring #${rid}`}
                                            {ring?.housingMount && <span className="ml-1 opacity-60">({ring.housingMount.slug.toUpperCase()})</span>}
                                        </span>
                                        <div className="flex gap-1">
                                            {idx > 0 && (
                                                <button type="button" onClick={() => moveRing(idx, idx - 1)} className="w-5 h-5 flex items-center justify-center text-purple-400 hover:text-purple-700">↑</button>
                                            )}
                                            {idx < ringIds.length - 1 && (
                                                <button type="button" onClick={() => moveRing(idx, idx + 1)} className="w-5 h-5 flex items-center justify-center text-purple-400 hover:text-purple-700">↓</button>
                                            )}
                                            <button type="button" onClick={() => removeRing(idx)} className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-600">×</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <select
                            value=""
                            onChange={e => { if (e.target.value) addRing(parseInt(e.target.value)) }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">+ Add extension ring…</option>
                            {allExtensionRings.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.lengthMm != null ? `${r.lengthMm}mm — ` : ''}{r.name}{r.housingMount ? ` (${r.housingMount.slug.toUpperCase()})` : ''}
                                </option>
                            ))}
                        </select>

                        {/* Port selector */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                        <select
                            value={portId}
                            onChange={e => setPortId(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
                        >
                            <option value="">— No port —</option>
                            {allPorts.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.isFlatPort ? 'Flat' : 'Dome'}{p.housingMount ? ` · ${p.housingMount.slug.toUpperCase()}` : ''})
                                </option>
                            ))}
                        </select>

                        {/* Notes */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="e.g. Required for full-frame coverage"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none mb-4"
                        />

                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button
                                onClick={modal === 'edit' ? handleEdit : handleAdd}
                                disabled={loading || !lensId}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add combination'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirm modal ── */}
            {modal === 'delete' && target && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => { if (e.target === e.currentTarget) close() }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete combination</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Remove the combination for <strong>{target.lens.name}</strong>
                            {target.port && <> → <strong>{target.port.name}</strong></>}?
                            This cannot be undone.
                        </p>
                        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={close} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                                {loading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )

    // Helper used inline in the JSX above
    function resetForm__internal(prefillLensId?: number) {
        setLensSearch('')
        setLensId(prefillLensId ?? '')
        setPortId('')
        setRingIds([])
        setNotes('')
        setError(null)
        setTarget(null)
    }
}
