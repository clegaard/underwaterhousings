'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { HousingImage } from '@/components/HousingImage'

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

interface LensData {
    id: number; name: string; slug: string
    manufacturer: { name: string }; cameraMount: { name: string }
    focalLengthTele: number; focalLengthWide: number | null; isZoomLens: boolean
    productPhotos: string[]; imageInfo: { src: string; fallback: string }
}

interface PortData {
    id: number; name: string; slug: string; isFlatPort: boolean
    productPhotos: string[]
    housingMount: { id: number; name: string; slug: string } | null
    imageInfo: { src: string; fallback: string }
}

interface RingData {
    id: number; name: string; slug: string; lengthMm: number | null
    housingMount: { id: number; name: string; slug: string } | null
    imageInfo: { src: string; fallback: string }
}

interface AdapterData {
    id: number; name: string; slug: string
    inputHousingMount: { id: number; name: string; slug: string } | null
    outputHousingMount: { id: number; name: string; slug: string } | null
    imageInfo: { src: string; fallback: string }
}

interface EntryStep {
    id: number; order: number
    extensionRing: { id: number; name: string; slug: string; lengthMm: number | null } | null
    portAdapter: { id: number; name: string; slug: string } | null
}

interface Entry {
    id: number
    lens: LensData
    port: Omit<PortData, 'housingMount'> | null
    steps: EntryStep[]
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
    allPortAdapters: AdapterData[]
    isSuperuser: boolean
}

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function focalLabel(l: { focalLengthTele: number; focalLengthWide: number | null }) {
    return l.focalLengthWide ? `${l.focalLengthWide}–${l.focalLengthTele}mm` : `${l.focalLengthTele}mm`
}

/* ═══════════════════════════════════════════════
   Trie builder — converts flat entries into a tree
   ═══════════════════════════════════════════════ */

interface TrieNode {
    key: string
    type: 'ring' | 'adapter' | 'port'
    itemId: number
    label: string
    detail: string
    imageInfo: { src: string; fallback: string }
    entryIds: number[]
    terminalEntryId?: number
    notes?: string
    children: TrieNode[]
}

interface LensTree {
    lens: LensData
    roots: TrieNode[]
    entryIds: number[]
}

function buildLensTrees(entries: Entry[], allPorts: PortData[], allRings: RingData[], allAdapters: AdapterData[]): LensTree[] {
    const lensMap = new Map<number, { lens: LensData; entries: Entry[] }>()
    for (const e of entries) {
        if (!lensMap.has(e.lens.id)) lensMap.set(e.lens.id, { lens: e.lens, entries: [] })
        lensMap.get(e.lens.id)!.entries.push(e)
    }

    const trees: LensTree[] = []
    for (const [, group] of lensMap) {
        const roots: TrieNode[] = []

        for (const entry of group.entries) {
            const path: { key: string; type: 'ring' | 'adapter' | 'port'; itemId: number; label: string; detail: string; imageInfo: { src: string; fallback: string } }[] = []

            for (const s of entry.steps) {
                if (s.extensionRing) {
                    const ring = allRings.find(r => r.id === s.extensionRing!.id)
                    path.push({
                        key: `ring:${s.extensionRing.id}`,
                        type: 'ring',
                        itemId: s.extensionRing.id,
                        label: s.extensionRing.lengthMm != null ? `${s.extensionRing.lengthMm}mm` : s.extensionRing.name,
                        detail: s.extensionRing.name,
                        imageInfo: ring?.imageInfo ?? { src: '', fallback: '/housings/fallback.png' },
                    })
                } else if (s.portAdapter) {
                    const ada = allAdapters.find(a => a.id === s.portAdapter!.id)
                    path.push({
                        key: `adapter:${s.portAdapter.id}`,
                        type: 'adapter',
                        itemId: s.portAdapter.id,
                        label: s.portAdapter.name,
                        detail: ada ? `${ada.inputHousingMount?.slug.toUpperCase() ?? '?'} → ${ada.outputHousingMount?.slug.toUpperCase() ?? '?'}` : '',
                        imageInfo: ada?.imageInfo ?? { src: '', fallback: '/housings/fallback.png' },
                    })
                }
            }

            if (entry.port) {
                const port = allPorts.find(p => p.id === entry.port!.id)
                path.push({
                    key: `port:${entry.port.id}`,
                    type: 'port',
                    itemId: entry.port.id,
                    label: entry.port.name,
                    detail: entry.port.isFlatPort ? 'Flat port' : 'Dome port',
                    imageInfo: port?.imageInfo ?? entry.port.imageInfo,
                })
            }

            // Insert path into trie
            let nodes = roots
            for (let i = 0; i < path.length; i++) {
                const step = path[i]
                let existing = nodes.find(n => n.key === step.key)
                if (!existing) {
                    existing = {
                        key: step.key, type: step.type, itemId: step.itemId,
                        label: step.label, detail: step.detail, imageInfo: step.imageInfo,
                        entryIds: [], children: [],
                    }
                    nodes.push(existing)
                }
                existing.entryIds.push(entry.id)
                if (i === path.length - 1) {
                    existing.terminalEntryId = entry.id
                    existing.notes = entry.notes ?? undefined
                }
                nodes = existing.children
            }
        }

        trees.push({ lens: group.lens, roots, entryIds: group.entries.map(e => e.id) })
    }

    trees.sort((a, b) => a.lens.name.localeCompare(b.lens.name))
    return trees
}

/* ═══════════════════════════════════════════════
   Inline Picker Popover
   ═══════════════════════════════════════════════ */

type PickerMode = 'lens' | 'step-type' | 'ring' | 'adapter' | 'port'

/* ─── PickerPortal: renders picker via portal so no overflow ancestor can clip it ─── */
function InlinePicker({ mode, recomputeKey = 0, allLenses, allPorts, allExtensionRings, allPortAdapters, onSelectLens, onSelectStepType, onSelectRing, onSelectAdapter, onSelectPort, onClose }: {
    mode: PickerMode
    recomputeKey?: number
    allLenses: LensData[]
    allPorts: PortData[]
    allExtensionRings: RingData[]
    allPortAdapters: AdapterData[]
    onSelectLens: (id: number) => void
    onSelectStepType: (type: 'ring' | 'adapter' | 'port') => void
    onSelectRing: (id: number) => void
    onSelectAdapter: (id: number) => void
    onSelectPort: (id: number) => void
    onClose: () => void
}) {
    const [search, setSearch] = useState('')
    // Placeholder span stays in original DOM position so we can read its coords
    const placeholderRef = useRef<HTMLSpanElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    useLayoutEffect(() => {
        if (!placeholderRef.current) return
        const rect = placeholderRef.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 4, left: rect.left })
    }, [recomputeKey, mode])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const t = e.target as Node
            if (!pickerRef.current?.contains(t)) onClose()
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    const q = search.toLowerCase().trim()

    const pickerStyle: React.CSSProperties = pos
        ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }
        : { position: 'fixed', visibility: 'hidden' }

    let pickerEl: React.ReactNode = null
    if (mode === 'step-type') {
        pickerEl = (
            <div ref={pickerRef} style={pickerStyle} className="bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 w-44">
                <button onClick={() => onSelectStepType('ring')} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-purple-50 text-gray-800 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-200 border border-purple-400" />
                    Extension ring
                </button>
                <button onClick={() => onSelectStepType('adapter')} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-amber-50 text-gray-800 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-400" />
                    Adapter
                </button>
                <button onClick={() => onSelectStepType('port')} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-emerald-50 text-gray-800 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-200 border border-emerald-400" />
                    Port
                </button>
            </div>
        )
    } else {
        let items: { id: number; primary: string; secondary: string }[] = []
        if (mode === 'lens') {
            items = allLenses.filter(l => !q || `${l.manufacturer.name} ${l.name}`.toLowerCase().includes(q))
                .map(l => ({ id: l.id, primary: l.name, secondary: `${l.manufacturer.name} · ${focalLabel(l)}` }))
        } else if (mode === 'ring') {
            items = allExtensionRings.filter(r => !q || r.name.toLowerCase().includes(q))
                .map(r => ({ id: r.id, primary: r.lengthMm != null ? `${r.lengthMm}mm — ${r.name}` : r.name, secondary: r.housingMount?.name ?? '' }))
        } else if (mode === 'adapter') {
            items = allPortAdapters.filter(a => !q || a.name.toLowerCase().includes(q))
                .map(a => ({ id: a.id, primary: a.name, secondary: `${a.inputHousingMount?.slug.toUpperCase() ?? '?'} → ${a.outputHousingMount?.slug.toUpperCase() ?? '?'}` }))
        } else if (mode === 'port') {
            items = allPorts.filter(p => !q || p.name.toLowerCase().includes(q))
                .map(p => ({ id: p.id, primary: p.name, secondary: `${p.isFlatPort ? 'Flat' : 'Dome'}${p.housingMount ? ` · ${p.housingMount.slug.toUpperCase()}` : ''}` }))
        }
        const handleSelect = (id: number) => {
            if (mode === 'lens') onSelectLens(id)
            else if (mode === 'ring') onSelectRing(id)
            else if (mode === 'adapter') onSelectAdapter(id)
            else if (mode === 'port') onSelectPort(id)
        }

        pickerEl = (
            <div ref={pickerRef} style={pickerStyle} className="bg-white rounded-xl shadow-xl border border-gray-200 w-72">
                <div className="p-2 border-b border-gray-100">
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${mode === 'lens' ? 'lenses' : mode === 'ring' ? 'extension rings' : mode === 'adapter' ? 'adapters' : 'ports'}…`}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {items.slice(0, 40).map(item => (
                        <button key={item.id} onClick={() => handleSelect(item.id)} className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors">
                            <p className="text-xs font-medium text-gray-900 leading-tight">{item.primary}</p>
                            {item.secondary && <p className="text-[10px] text-gray-400">{item.secondary}</p>}
                        </button>
                    ))}
                    {items.length === 0 && <p className="px-3 py-3 text-xs text-gray-400 text-center">No results</p>}
                </div>
            </div>
        )
    }

    // Render: invisible placeholder in original DOM position + picker in a body portal
    return (
        <>
            <span ref={placeholderRef} />
            {createPortal(pickerEl, document.body)}
        </>
    )
}

/* ═══════════════════════════════════════════════
   Add Button (the + circle)
   ═══════════════════════════════════════════════ */

function AddButton({ onClick, size = 'md', className = '' }: { onClick: () => void; size?: 'sm' | 'md'; className?: string }) {
    const sz = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
    const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
    return (
        <button
            onClick={onClick}
            className={`${sz} rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all shrink-0 ${className}`}
            title="Add"
        >
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
        </button>
    )
}

/* ═══════════════════════════════════════════════
   Node styles per type (color coding)
   ═══════════════════════════════════════════════ */

const nodeStyles: Record<string, string> = {
    lens: 'bg-blue-50 border-blue-200 text-blue-900',
    ring: 'bg-purple-50 border-purple-200 text-purple-900',
    adapter: 'bg-amber-50 border-amber-200 text-amber-900',
    port: 'bg-emerald-50 border-emerald-200 text-emerald-900',
}

/* NODE_CENTER: vertical center of a node card for connector positioning */
const NC = 22

/* ═══════════════════════════════════════════════
   DraftStep — step being built (not yet saved)
   ═══════════════════════════════════════════════ */

interface DraftStep {
    type: 'ring' | 'adapter' | 'port'
    itemId: number
    label: string
    detail: string
}

interface DraftChain {
    lensId: number
    branchPath: string
    sharedStepKeys: string[]
    steps: DraftStep[]
}

/* ═══════════════════════════════════════════════
   Tree Branch — recursive horizontal tree renderer
   ═══════════════════════════════════════════════ */

function TreeBranch({ nodes, isSuperuser, onDeleteEntry, pickerKey, onOpenPicker, pickerMode, pickerProps, pathPrefix, lensId, draftChain }: {
    nodes: TrieNode[]
    isSuperuser: boolean
    onDeleteEntry: (entryId: number) => void
    pickerKey: string | null
    onOpenPicker: (key: string) => void
    pickerMode: PickerMode | null
    pickerProps: {
        allLenses: LensData[]; allPorts: PortData[]; allExtensionRings: RingData[]; allPortAdapters: AdapterData[]
        onSelectLens: (id: number) => void; onSelectStepType: (type: 'ring' | 'adapter' | 'port') => void
        onSelectRing: (id: number) => void; onSelectAdapter: (id: number) => void; onSelectPort: (id: number) => void
        onClose: () => void
    }
    pathPrefix: string[]
    lensId: number
    draftChain: DraftChain | null
}) {
    const draftPath = pathPrefix.join('/')
    const branchPickerKey = `branch:L${lensId}/${draftPath}`
    const isDraftBranch = draftChain && draftChain.lensId === lensId && draftChain.branchPath === draftPath
    const draftSteps = isDraftBranch ? draftChain.steps : []
    const totalRows = nodes.length + draftSteps.length + (isSuperuser ? 1 : 0)

    return (
        <div className="flex flex-col relative">
            {/* Vertical connector — spans from center of first child to center of last */}
            {totalRows > 1 && (
                <div className="absolute w-0.5 bg-gray-500 left-0" style={{ top: NC, bottom: NC }} />
            )}

            {nodes.map((node, i) => {
                const nodePath = [...pathPrefix, node.key].join('/')
                const nodePickerKey = `L${lensId}/${nodePath}`
                const hasMore = i < nodes.length - 1 || draftSteps.length > 0 || isSuperuser
                const nodeDraftSteps = draftChain?.branchPath === nodePath ? draftChain.steps : []

                return (
                    <div key={node.key} className="flex items-stretch">
                        {/* Connector cell */}
                        <div className="relative w-8 shrink-0 self-stretch">
                            {/* Horizontal line */}
                            <div className="absolute left-0 right-0 h-0.5 bg-gray-500" style={{ top: NC }} />
                            {/* Vertical: top half */}
                            {i > 0 && <div className="absolute left-0 w-0.5 bg-gray-500 top-0" style={{ height: NC }} />}
                            {/* Vertical: bottom half */}
                            {hasMore && <div className="absolute left-0 w-0.5 bg-gray-500 bottom-0" style={{ top: NC }} />}
                            {/* Junction dot at fork */}
                            {totalRows > 1 && (
                                <div className="absolute w-[5px] h-[5px] rounded-full bg-gray-500" style={{ left: -1, top: NC - 2 }} />
                            )}
                        </div>

                        {/* Node + children */}
                        <div className="py-1 flex items-start relative">
                            {/* Node card */}
                            <div className={`group/node relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs shrink-0 ${nodeStyles[node.type]}`}>
                                <div className="relative w-7 h-7 rounded overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                    <HousingImage src={node.imageInfo.src} fallback={node.imageInfo.fallback} alt={node.label} className="w-full h-full object-contain" />
                                </div>
                                <div className="min-w-0 max-w-[120px]">
                                    <p className="font-semibold leading-tight truncate">{node.label}</p>
                                    <p className="text-[10px] opacity-60 truncate">{node.detail}</p>
                                </div>
                                {node.notes && (
                                    <span className="text-[10px] opacity-50 italic ml-1 max-w-[60px] truncate" title={node.notes}>{node.notes}</span>
                                )}
                                {isSuperuser && node.terminalEntryId && (
                                    <button
                                        onClick={() => onDeleteEntry(node.terminalEntryId!)}
                                        className="opacity-0 group-hover/node:opacity-100 transition-opacity ml-1 w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600"
                                        title="Delete this combination"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Children */}
                            {node.children.length > 0 ? (
                                <TreeBranch
                                    nodes={node.children}
                                    isSuperuser={isSuperuser}
                                    onDeleteEntry={onDeleteEntry}
                                    pickerKey={pickerKey}
                                    onOpenPicker={onOpenPicker}
                                    pickerMode={pickerMode}
                                    pickerProps={pickerProps}
                                    pathPrefix={[...pathPrefix, node.key]}
                                    lensId={lensId}
                                    draftChain={draftChain}
                                />
                            ) : node.type !== 'port' && isSuperuser ? (
                                /* + button to extend this chain, with accumulated draft steps */
                                <div className="flex items-center ml-1 self-center">
                                    <div className="w-6 h-0.5 bg-gray-500" />
                                    {nodeDraftSteps.map((s, idx) => (
                                        <div key={idx} className="flex items-center">
                                            {idx > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                                            <div className={`flex items-center gap-1 rounded-lg border-2 border-dashed px-2 py-1 text-xs shrink-0 opacity-80 ${nodeStyles[s.type]}`}>
                                                <p className="font-semibold leading-tight">{s.label}</p>
                                                {s.detail && <p className="text-[9px] opacity-60">{s.detail}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {nodeDraftSteps.length > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                                    <div className="relative">
                                        <AddButton onClick={() => onOpenPicker(nodePickerKey)} size="sm" />
                                        {pickerKey === nodePickerKey && pickerMode && (
                                            <InlinePicker
                                                mode={pickerMode}
                                                recomputeKey={nodeDraftSteps.length}
                                                {...pickerProps}
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )
            })}

            {/* Branch + button (add alternative sibling) — with inline draft steps */}
            {isSuperuser && nodes.length > 0 && (
                <div className="flex items-stretch">
                    <div className="relative w-8 shrink-0" style={{ height: NC * 2 + 8 }}>
                        <div className="absolute left-0 right-0 h-0.5 bg-gray-500 opacity-30" style={{ top: NC }} />
                        <div className="absolute left-0 w-0.5 bg-gray-500 opacity-30 top-0" style={{ height: NC }} />
                    </div>
                    <div className="py-1 flex items-center">
                        {draftSteps.map((s, idx) => (
                            <div key={idx} className="flex items-center">
                                {idx > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                                <div className={`flex items-center gap-1 rounded-lg border-2 border-dashed px-2 py-1 text-xs shrink-0 opacity-80 ${nodeStyles[s.type]}`}>
                                    <p className="font-semibold leading-tight">{s.label}</p>
                                    {s.detail && <p className="text-[9px] opacity-60">{s.detail}</p>}
                                </div>
                            </div>
                        ))}
                        {draftSteps.length > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                        <div className="relative">
                            <AddButton onClick={() => onOpenPicker(branchPickerKey)} size="sm" />
                            {pickerKey === branchPickerKey && pickerMode && (
                                <InlinePicker mode={pickerMode} recomputeKey={draftSteps.length} {...pickerProps} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export default function PortChartClient({
    manufacturerId,
    allLenses,
    allPorts,
    allExtensionRings,
    allPortAdapters,
    entries: initial,
    isSuperuser,
}: Props) {
    const [entries, setEntries] = useState(initial)
    const [loading, setLoading] = useState(false)

    // Picker state
    const [pickerKey, setPickerKey] = useState<string | null>(null)
    const [pickerMode, setPickerMode] = useState<PickerMode | null>(null)
    const [pickerContext, setPickerContext] = useState<{
        lensId?: number
        branchPath: string
        sharedStepKeys: string[]
    } | null>(null)

    // Draft chain (building in progress)
    const [draftChain, setDraftChain] = useState<DraftChain | null>(null)

    function closePicker() {
        setPickerKey(null)
        setPickerMode(null)
        setPickerContext(null)
    }

    function cancelDraft() {
        setDraftChain(null)
        closePicker()
    }

    const trees = buildLensTrees(entries, allPorts, allExtensionRings, allPortAdapters)

    /* ─── Open picker from + buttons ─── */

    /**
     * Parse a lens-prefixed key like "L42/adapter:3/ring:5" or "branch:L42/adapter:3".
     * Returns { lensId, innerPath } or null if the key doesn't match.
     */
    function parseLensPrefixedKey(raw: string): { lensId: number; innerPath: string } | null {
        const m = raw.match(/^L(\d+)\/(.*)$/)
        if (!m) return null
        return { lensId: parseInt(m[1], 10), innerPath: m[2] }
    }

    function handleOpenPicker(key: string) {
        if (key === 'root') {
            setPickerKey(key); setPickerMode('lens')
            setPickerContext({ branchPath: '', sharedStepKeys: [] })
            return
        }
        if (key.startsWith('lens:')) {
            const lensId = parseInt(key.replace('lens:', ''))
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId, branchPath: '', sharedStepKeys: [] })
            return
        }
        // Branch + button inside a lens tree: "branch:L{id}/{path}"
        if (key.startsWith('branch:L')) {
            const parsed = parseLensPrefixedKey(key.replace('branch:', ''))
            if (parsed) {
                const parts = parsed.innerPath.split('/').filter(Boolean)
                setPickerKey(key); setPickerMode('step-type')
                setPickerContext({ lensId: parsed.lensId, branchPath: parsed.innerPath, sharedStepKeys: parts })
                return
            }
        }
        if (key.startsWith('draft:')) {
            setPickerKey(key); setPickerMode('step-type')
            if (draftChain) {
                setPickerContext({
                    lensId: draftChain.lensId,
                    branchPath: draftChain.branchPath,
                    sharedStepKeys: draftChain.sharedStepKeys,
                })
            }
            return
        }
        // Node-extend key inside a lens tree: "L{id}/{step-path}"
        const parsed = parseLensPrefixedKey(key)
        if (parsed) {
            const parts = parsed.innerPath.split('/').filter(Boolean)
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId: parsed.lensId, branchPath: parsed.innerPath, sharedStepKeys: parts })
            return
        }
    }

    /* ─── Selection handlers ─── */

    function handleSelectLens(lensId: number) {
        // Keep pickerKey at 'root' so the picker stays visible at the same button
        setPickerMode('step-type')
        setPickerContext({ lensId, branchPath: '', sharedStepKeys: [] })
    }

    function handleSelectStepType(type: 'ring' | 'adapter' | 'port') {
        setPickerMode(type)
    }

    function handleSelectRing(ringId: number) {
        const ring = allExtensionRings.find(r => r.id === ringId)
        if (!ring || !pickerContext?.lensId) return

        const step: DraftStep = {
            type: 'ring', itemId: ringId,
            label: ring.lengthMm != null ? `${ring.lengthMm}mm` : ring.name,
            detail: ring.name,
        }
        const chain: DraftChain = draftChain && draftChain.lensId === pickerContext.lensId
            ? { ...draftChain, steps: [...draftChain.steps, step] }
            : { lensId: pickerContext.lensId, branchPath: pickerContext.branchPath, sharedStepKeys: pickerContext.sharedStepKeys, steps: [step] }
        setDraftChain(chain)
        // Stay at same picker position — just switch back to step-type for the next step
        setPickerMode('step-type')
    }

    function handleSelectAdapter(adapterId: number) {
        const adapter = allPortAdapters.find(a => a.id === adapterId)
        if (!adapter || !pickerContext?.lensId) return

        const step: DraftStep = {
            type: 'adapter', itemId: adapterId,
            label: adapter.name,
            detail: `${adapter.inputHousingMount?.slug.toUpperCase() ?? '?'} → ${adapter.outputHousingMount?.slug.toUpperCase() ?? '?'}`,
        }
        const chain: DraftChain = draftChain && draftChain.lensId === pickerContext.lensId
            ? { ...draftChain, steps: [...draftChain.steps, step] }
            : { lensId: pickerContext.lensId, branchPath: pickerContext.branchPath, sharedStepKeys: pickerContext.sharedStepKeys, steps: [step] }
        setDraftChain(chain)
        // Stay at same picker position — just switch back to step-type for the next step
        setPickerMode('step-type')
    }

    async function handleSelectPort(portId: number) {
        if (!pickerContext?.lensId) return
        setLoading(true)

        const allSteps: { extensionRingId?: number; portAdapterId?: number }[] = []
        for (const key of pickerContext.sharedStepKeys) {
            const [type, idStr] = key.split(':')
            const id = parseInt(idStr)
            if (type === 'ring') allSteps.push({ extensionRingId: id })
            else if (type === 'adapter') allSteps.push({ portAdapterId: id })
        }
        if (draftChain && draftChain.lensId === pickerContext.lensId) {
            for (const step of draftChain.steps) {
                if (step.type === 'ring') allSteps.push({ extensionRingId: step.itemId })
                else if (step.type === 'adapter') allSteps.push({ portAdapterId: step.itemId })
            }
        }

        try {
            const res = await fetch('/api/admin/port-chart-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manufacturerId, lensId: pickerContext.lensId, portId, steps: allSteps }),
            })
            if (res.ok) {
                const data = await res.json()
                const lens = allLenses.find(l => l.id === pickerContext.lensId)!
                const port = allPorts.find(p => p.id === portId)!
                const newEntry: Entry = {
                    id: data.id,
                    lens,
                    port: port ? { id: port.id, name: port.name, slug: port.slug, isFlatPort: port.isFlatPort, productPhotos: port.productPhotos, imageInfo: port.imageInfo } : null,
                    steps: (data.steps ?? []).map((s: { id: number; order: number; extensionRing: EntryStep['extensionRing']; portAdapter: EntryStep['portAdapter'] }) => ({
                        id: s.id, order: s.order, extensionRing: s.extensionRing, portAdapter: s.portAdapter,
                    })),
                    notes: data.notes ?? null,
                }
                setEntries(prev => [...prev, newEntry].sort((a, b) => a.lens.name.localeCompare(b.lens.name)))
            }
        } catch { /* ignore */ }
        finally { setLoading(false); setDraftChain(null); closePicker() }
    }

    async function handleDeleteEntry(entryId: number) {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/port-chart-entries?id=${entryId}`, { method: 'DELETE' })
            if (res.ok) setEntries(prev => prev.filter(e => e.id !== entryId))
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }

    const sharedPickerProps = {
        allLenses, allPorts, allExtensionRings, allPortAdapters,
        onSelectLens: handleSelectLens, onSelectStepType: handleSelectStepType,
        onSelectRing: handleSelectRing, onSelectAdapter: handleSelectAdapter,
        onSelectPort: handleSelectPort, onClose: closePicker,
    }

    /* ─── Pending new lens (selected from root but no entries yet) ─── */
    const pendingLensId =
        pickerKey === 'root' && pickerMode && pickerMode !== 'lens'
            ? pickerContext?.lensId
            : undefined
    const pendingLens = pendingLensId ? allLenses.find(l => l.id === pendingLensId) : undefined
    const isNewPendingLens = !!(pendingLens && !trees.find(t => t.lens.id === pendingLensId))

    /* ═══════════════════════════════════════════════
       Render
       ═══════════════════════════════════════════════ */
    return (
        <div className="relative">
            {/* Legend */}
            <div className="flex items-center gap-5 mb-6 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300" /> Lens</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300" /> Extension ring</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" /> Adapter</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" /> Port</div>
                {draftChain && (
                    <button onClick={cancelDraft} className="ml-auto text-red-500 hover:text-red-700 text-xs font-medium">
                        Cancel building
                    </button>
                )}
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 z-30 flex items-center justify-center rounded-xl">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Tree — pickers use portals so overflow-x-auto is safe here */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto min-h-64">
                <div className="flex flex-col gap-6 min-w-fit min-h-full">
                    {trees.map(tree => {
                        const lensPK = `lens:${tree.lens.id}`
                        const isLensPickerOpen = pickerKey === lensPK
                        // Show draft row when pickerContext targets this lens (moves picker out of the tree)
                        // Only activate draft row for root-level or lens-level entry points (building a new chain from scratch).
                        // Branch/node + buttons inside the tree should keep their picker in-place.
                        const isActiveLensDraft = !!(
                            (pickerKey === 'root' || pickerKey === lensPK) &&
                            pickerContext?.lensId === tree.lens.id &&
                            pickerMode && pickerMode !== 'lens'
                        )
                        const showDraftRow = isActiveLensDraft && !isNewPendingLens
                        const draftStepsForRow = showDraftRow && draftChain?.lensId === tree.lens.id ? draftChain.steps : []

                        return (
                            <div key={tree.lens.id} className="flex flex-col gap-1">
                                <div className="flex items-start">
                                    {/* Lens node */}
                                    <div className="relative py-1 shrink-0">
                                        <div className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-xs shrink-0 ${nodeStyles.lens}`}>
                                            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/60">
                                                <HousingImage src={tree.lens.imageInfo.src} fallback={tree.lens.imageInfo.fallback} alt={tree.lens.name} className="w-full h-full object-contain p-0.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold leading-tight text-sm">{tree.lens.name}</p>
                                                <p className="text-[10px] opacity-60">{focalLabel(tree.lens)}</p>
                                                <p className="text-[10px] opacity-60">{tree.lens.manufacturer.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Children tree */}
                                    {tree.roots.length > 0 ? (
                                        <TreeBranch
                                            nodes={tree.roots}
                                            isSuperuser={isSuperuser}
                                            onDeleteEntry={handleDeleteEntry}
                                            pickerKey={pickerKey}
                                            onOpenPicker={handleOpenPicker}
                                            pickerMode={pickerMode}
                                            pickerProps={sharedPickerProps}
                                            pathPrefix={[]}
                                            lensId={tree.lens.id}
                                            draftChain={draftChain}
                                        />
                                    ) : isSuperuser ? (
                                        <div className="flex items-center relative ml-2" style={{ height: NC * 2 + 8 }}>
                                            <div className="w-8 h-0.5 bg-gray-500" />
                                            <div className="relative">
                                                <AddButton onClick={() => handleOpenPicker(lensPK)} />
                                                {isLensPickerOpen && pickerMode && !isActiveLensDraft && <InlinePicker key={pickerMode} mode={pickerMode} {...sharedPickerProps} />}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Horizontal draft row — shown while building a chain for this lens */}
                                {showDraftRow && (
                                    <div className="flex items-center ml-2 pb-1">
                                        <span className="text-[10px] text-gray-400 mr-1.5 font-mono">└─</span>
                                        {draftStepsForRow.map((s, i) => (
                                            <div key={i} className="flex items-center">
                                                {i > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                                                <div className={`flex items-center gap-1 rounded-lg border-2 border-dashed px-2 py-1 text-xs shrink-0 opacity-80 ${nodeStyles[s.type]}`}>
                                                    <p className="font-semibold leading-tight">{s.label}</p>
                                                    {s.detail && <p className="text-[9px] opacity-60">{s.detail}</p>}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex items-center">
                                            {draftStepsForRow.length > 0 && <div className="w-4 h-0.5 bg-gray-400" />}
                                            <div className="relative">
                                                <div className="w-5 h-5 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center">
                                                    <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                {pickerMode && (
                                                    <InlinePicker
                                                        recomputeKey={draftStepsForRow.length}
                                                        mode={pickerMode}
                                                        {...sharedPickerProps}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Pending new lens being built — shown once a lens is selected from root + */}
                    {isSuperuser && isNewPendingLens && pendingLens && (
                        <div className="flex items-center gap-0 py-1">
                            {/* Lens card (dashed = unsaved) */}
                            <div className={`flex items-center gap-2.5 rounded-xl border-2 border-dashed px-3 py-2 text-xs shrink-0 opacity-75 ${nodeStyles.lens}`}>
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/60">
                                    <HousingImage src={pendingLens.imageInfo.src} fallback={pendingLens.imageInfo.fallback} alt={pendingLens.name} className="w-full h-full object-contain p-0.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold leading-tight text-sm">{pendingLens.name}</p>
                                    <p className="text-[10px] opacity-60">{focalLabel(pendingLens)}</p>
                                    <p className="text-[10px] opacity-60">{pendingLens.manufacturer.name}</p>
                                </div>
                            </div>
                            {/* Draft steps accumulated so far */}
                            {(draftChain?.steps ?? []).map((s, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="w-6 h-0.5 bg-gray-500" />
                                    <div className={`flex items-center gap-1.5 rounded-lg border-2 border-dashed px-2.5 py-1.5 text-xs shrink-0 opacity-75 ${nodeStyles[s.type]}`}>
                                        <p className="font-semibold leading-tight">{s.label}</p>
                                        <p className="text-[10px] opacity-60">{s.detail}</p>
                                    </div>
                                </div>
                            ))}
                            {/* Connector to current picker */}
                            <div className="flex items-center">
                                <div className="w-6 h-0.5 bg-gray-500" />
                                <div className="relative">
                                    {/* Visual indicator dot where picker is attached */}
                                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    {/* Picker anchored here */}
                                    <InlinePicker key={pickerMode ?? ''} recomputeKey={draftChain?.steps.length ?? 0} mode={pickerMode!} {...sharedPickerProps} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Root + : add a new lens */}
                    {isSuperuser && (
                        <div className="relative">
                            <AddButton onClick={() => handleOpenPicker('root')} className="ml-1" />
                            {/* Only show lens picker at root — step continuation moves to pendingLens area */}
                            {pickerKey === 'root' && pickerMode === 'lens' && (
                                <InlinePicker key="lens" mode="lens" {...sharedPickerProps} />
                            )}
                        </div>
                    )}
                </div>

                {/* Empty state */}
                {trees.length === 0 && !isSuperuser && (
                    <div className="text-center py-12">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 text-sm">No port chart entries yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
