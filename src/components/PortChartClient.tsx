'use client'

import { useState, useMemo, useCallback, createContext, useContext, memo, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    ReactFlow,
    Handle,
    Position,
} from '@xyflow/react'
import type { Node, Edge, NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { HousingImage } from '@/components/HousingImage'

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

interface LensData {
    id: number; name: string; slug: string
    manufacturer: { name: string; slug: string }; cameraMount: { name: string }
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
    isRecommended: boolean
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
    lensId: number
    slug: string
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
    for (const [, group] of Array.from(lensMap)) {
        const roots: TrieNode[] = []

        for (const entry of group.entries) {
            const path: { key: string; type: 'ring' | 'adapter' | 'port'; itemId: number; slug: string; label: string; detail: string; imageInfo: { src: string; fallback: string } }[] = []

            for (const s of entry.steps) {
                if (s.extensionRing) {
                    const ring = allRings.find(r => r.id === s.extensionRing!.id)
                    path.push({
                        key: `ring:${s.extensionRing.id}`,
                        type: 'ring',
                        itemId: s.extensionRing.id,
                        slug: s.extensionRing.slug,
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
                        slug: s.portAdapter.slug,
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
                    slug: entry.port.slug,
                    label: entry.port.name,
                    detail: entry.port.isFlatPort ? 'Flat port' : 'Dome port',
                    imageInfo: port?.imageInfo ?? entry.port.imageInfo,
                })
            }

            let nodes = roots
            for (let i = 0; i < path.length; i++) {
                const step = path[i]
                let existing = nodes.find(n => n.key === step.key)
                if (!existing) {
                    existing = {
                        key: step.key, type: step.type, itemId: step.itemId, lensId: group.lens.id, slug: step.slug,
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

        trees.push({ lens: group.lens, roots, entryIds: group.entries.map((e: Entry) => e.id) })
    }

    trees.sort((a, b) => a.lens.name.localeCompare(b.lens.name))
    return trees
}

/* ═══════════════════════════════════════════════
   Draft entry synthesis
   ═══════════════════════════════════════════════ */

const DRAFT_ENTRY_ID = -1

function buildDraftEntry(
    chain: DraftChain,
    allLenses: LensData[],
    allRings: RingData[],
    allAdapters: AdapterData[],
): Entry | null {
    const lens = allLenses.find(l => l.id === chain.lensId)
    if (!lens) return null

    // Reconstruct shared steps (already in trie from existing entries)
    const sharedSteps: EntryStep[] = chain.sharedStepKeys.map((key, i) => {
        const [type, idStr] = key.split(':')
        const id = parseInt(idStr)
        if (type === 'ring') {
            const r = allRings.find(r => r.id === id)
            return { id: -(100 + i), order: i, extensionRing: r ? { id: r.id, name: r.name, slug: r.slug, lengthMm: r.lengthMm } : null, portAdapter: null }
        } else {
            const a = allAdapters.find(a => a.id === id)
            return { id: -(100 + i), order: i, extensionRing: null, portAdapter: a ? { id: a.id, name: a.name, slug: a.slug } : null }
        }
    })

    // New draft steps
    const draftSteps: EntryStep[] = chain.steps.map((s, i) => ({
        id: -(200 + i),
        order: sharedSteps.length + i,
        extensionRing: s.type === 'ring'
            ? (() => { const r = allRings.find(r => r.id === s.itemId); return r ? { id: r.id, name: r.name, slug: r.slug, lengthMm: r.lengthMm } : null })()
            : null,
        portAdapter: s.type === 'adapter'
            ? (() => { const a = allAdapters.find(a => a.id === s.itemId); return a ? { id: a.id, name: a.name, slug: a.slug } : null })()
            : null,
    }))

    return {
        id: DRAFT_ENTRY_ID,
        lens,
        port: null,
        steps: [...sharedSteps, ...draftSteps],
        notes: null,
        isRecommended: false,
    }
}

/* ═══════════════════════════════════════════════
   Layout constants
   ═══════════════════════════════════════════════ */

const LENS_W = 260
const NODE_W = 180
const NODE_H = 46
const LENS_H = 62
const COL_GAP = 60
const ROW_H = NODE_H + 16
const GROUP_GAP = 36

function stepX(depth: number): number {
    return LENS_W + COL_GAP + (depth - 1) * (NODE_W + COL_GAP)
}

/* ═══════════════════════════════════════════════
   Layout computation — positions all nodes/edges
   ═══════════════════════════════════════════════ */

function countLeaves(nodes: TrieNode[], isSuperuser: boolean): number {
    let count = 0
    for (const node of nodes) {
        if (node.children.length === 0) count += 1
        else count += countLeaves(node.children, isSuperuser)
    }
    if (isSuperuser && nodes.length > 0) count += 1 // branch add button row
    return count || 1
}

function computeFlowLayout(
    trees: LensTree[],
    maxSteps: number,
    isSuperuser: boolean,
    manufacturerSlug: string,
    draftEntryId: number | null,
): { nodes: Node[]; edges: Edge[]; height: number; width: number } {
    const portColX = LENS_W + COL_GAP + Math.max(maxSteps, 1) * (NODE_W + COL_GAP)

    const nodes: Node[] = []
    const edges: Edge[] = []
    let currentY = 0

    for (const tree of trees) {
        const lensId = `lens-${tree.lens.id}`
        const lensNumId = tree.lens.id

        if (tree.roots.length === 0) {
            nodes.push({
                id: lensId,
                type: 'chartLens',
                position: { x: 0, y: currentY },
                data: { lens: tree.lens, href: `/lenses/${tree.lens.manufacturer.slug}/${tree.lens.slug}` },
            })

            if (isSuperuser) {
                const addId = `add-empty-${lensNumId}`
                const isDraftLens = draftEntryId != null && tree.entryIds.includes(draftEntryId)
                nodes.push({
                    id: addId,
                    type: 'chartAdd',
                    position: { x: LENS_W + COL_GAP, y: currentY + (LENS_H - 28) / 2 },
                    data: { pickerKey: isDraftLens ? 'draft:next' : `lens:${lensNumId}` },
                })
                edges.push({
                    id: `e-${lensId}-${addId}`,
                    source: lensId,
                    target: addId,
                    type: 'smoothstep',
                    style: { stroke: '#d1d5db', strokeDasharray: '4 4' },
                })
            }

            currentY += LENS_H + GROUP_GAP
            continue
        }

        const startY = currentY

        const layoutBranch = (
            trieNodes: TrieNode[],
            parentId: string,
            depth: number,
            y: number,
            pathPrefix: string[],
        ): { nextY: number; contentBottom: number } => {
            let cy = y
            let contentBottom = y

            for (const node of trieNodes) {
                const nodePath = [...pathPrefix, node.key]
                const nodeId = `${lensId}/${nodePath.join('/')}`
                const isPort = node.type === 'port'
                const isLeaf = node.children.length === 0

                if (isLeaf) {
                    const x = isPort ? portColX : stepX(depth)
                    const isDraftNode = draftEntryId != null && node.entryIds.length === 1 && node.entryIds[0] === draftEntryId
                    nodes.push({
                        id: nodeId,
                        type: isPort ? 'chartPort' : 'chartStep',
                        position: { x, y: cy },
                        data: { trieNode: node, href: `/gear/${manufacturerSlug}/${node.slug}`, isDraft: isDraftNode },
                    })
                    edges.push({
                        id: `e-${parentId}-${nodeId}`,
                        source: parentId,
                        target: nodeId,
                        type: 'smoothstep',
                        style: { stroke: isDraftNode ? '#a78bfa' : '#9ca3af', strokeWidth: 1.5, ...(isDraftNode ? { strokeDasharray: '6 3' } : {}) },
                    })

                    if (!isPort && isSuperuser) {
                        const addId = `add-ext-${nodeId}`
                        const addX = x + NODE_W + 20
                        const addPickerKey = isDraftNode ? 'draft:next' : `L${lensNumId}/${nodePath.join('/')}`
                        nodes.push({
                            id: addId,
                            type: 'chartAdd',
                            position: { x: addX, y: cy + (NODE_H - 28) / 2 },
                            data: { pickerKey: addPickerKey },
                        })
                        edges.push({
                            id: `e-${nodeId}-${addId}`,
                            source: nodeId,
                            target: addId,
                            type: 'smoothstep',
                            style: { stroke: '#d1d5db', strokeDasharray: '4 4' },
                        })
                    }

                    contentBottom = cy + NODE_H
                    cy += ROW_H
                } else {
                    const childStart = cy
                    const result = layoutBranch(node.children, nodeId, depth + 1, cy, nodePath)
                    cy = result.nextY
                    contentBottom = result.contentBottom

                    const centerY = (childStart + result.contentBottom) / 2 - NODE_H / 2
                    const x = isPort ? portColX : stepX(depth)
                    const isDraftBranch = draftEntryId != null && node.entryIds.length === 1 && node.entryIds[0] === draftEntryId
                    nodes.push({
                        id: nodeId,
                        type: isPort ? 'chartPort' : 'chartStep',
                        position: { x, y: centerY },
                        data: { trieNode: node, href: `/gear/${manufacturerSlug}/${node.slug}`, isDraft: isDraftBranch },
                    })
                    edges.push({
                        id: `e-${parentId}-${nodeId}`,
                        source: parentId,
                        target: nodeId,
                        type: 'smoothstep',
                        style: { stroke: '#9ca3af', strokeWidth: 1.5 },
                    })
                }
            }

            if (isSuperuser && trieNodes.length > 0) {
                const branchPath = pathPrefix.join('/')
                const addId = `add-branch-${lensId}/${branchPath || 'root'}`
                nodes.push({
                    id: addId,
                    type: 'chartAdd',
                    position: { x: stepX(depth), y: cy },
                    data: { pickerKey: `branch:L${lensNumId}/${branchPath}` },
                })
                edges.push({
                    id: `e-${parentId}-${addId}`,
                    source: parentId,
                    target: addId,
                    type: 'smoothstep',
                    style: { stroke: '#d1d5db', strokeDasharray: '4 4' },
                })
                cy += ROW_H * 0.6
            }

            return { nextY: cy, contentBottom }
        }

        const result = layoutBranch(tree.roots, lensId, 1, startY, [])

        const lensCenterY = (startY + result.contentBottom) / 2 - LENS_H / 2
        nodes.push({
            id: lensId,
            type: 'chartLens',
            position: { x: 0, y: lensCenterY },
            data: { lens: tree.lens, href: `/lenses/${tree.lens.manufacturer.slug}/${tree.lens.slug}` },
        })

        currentY = result.nextY + GROUP_GAP
    }

    if (isSuperuser) {
        nodes.push({
            id: 'add-root',
            type: 'chartAddRoot',
            position: { x: 0, y: currentY },
            data: { pickerKey: 'root' },
        })
        currentY += LENS_H + GROUP_GAP
    }

    return {
        nodes,
        edges,
        height: currentY + 40,
        width: portColX + NODE_W + 100,
    }
}

/* ═══════════════════════════════════════════════
   Node style classes
   ═══════════════════════════════════════════════ */

const nodeStyleClasses: Record<string, string> = {
    lens: 'bg-blue-50 border-blue-200 text-blue-900',
    ring: 'bg-purple-50 border-purple-200 text-purple-900',
    adapter: 'bg-amber-50 border-amber-200 text-amber-900',
    port: 'bg-emerald-50 border-emerald-200 text-emerald-900',
}

/* ═══════════════════════════════════════════════
   Chart context — provides handlers to custom nodes
   ═══════════════════════════════════════════════ */

type PickerMode = 'lens' | 'step-type' | 'ring' | 'adapter' | 'port'

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

interface SharedPickerProps {
    allLenses: LensData[]
    allPorts: PortData[]
    allExtensionRings: RingData[]
    allPortAdapters: AdapterData[]
    cameraMountFilter: string | null
    onSelectLens: (id: number) => void
    onSelectStepType: (type: 'ring' | 'adapter' | 'port') => void
    onSelectRing: (id: number) => void
    onSelectAdapter: (id: number) => void
    onSelectPort: (id: number) => void
    onClose: () => void
}

interface ChartContextValue {
    isSuperuser: boolean
    manufacturerSlug: string
    recommendedEntries: Set<number>
    toggleRecommended: (entryId: number) => void
    onDeleteEntry: (id: number) => void
    onCancelDraft: () => void
    onOpenPicker: (key: string) => void
    pickerKey: string | null
    pickerMode: PickerMode | null
    pickerProps: SharedPickerProps
}

const ChartContext = createContext<ChartContextValue | null>(null)

/* ═══════════════════════════════════════════════
   Inline Picker Popover (portal-based)
   ═══════════════════════════════════════════════ */

function InlinePicker({ mode, recomputeKey = 0, allLenses, allPorts, allExtensionRings, allPortAdapters, cameraMountFilter, onSelectLens, onSelectStepType, onSelectRing, onSelectAdapter, onSelectPort, onClose }: {
    mode: PickerMode
    recomputeKey?: number
    allLenses: LensData[]
    allPorts: PortData[]
    allExtensionRings: RingData[]
    allPortAdapters: AdapterData[]
    cameraMountFilter: string | null
    onSelectLens: (id: number) => void
    onSelectStepType: (type: 'ring' | 'adapter' | 'port') => void
    onSelectRing: (id: number) => void
    onSelectAdapter: (id: number) => void
    onSelectPort: (id: number) => void
    onClose: () => void
}) {
    const [search, setSearch] = useState('')
    const placeholderRef = useRef<HTMLSpanElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    useLayoutEffect(() => {
        if (!placeholderRef.current) return
        const rect = placeholderRef.current.getBoundingClientRect()
        const estimatedHeight = mode === 'step-type' ? 130 : 330
        const spaceBelow = window.innerHeight - rect.bottom - 8
        if (spaceBelow < estimatedHeight) {
            setPos({ top: Math.max(8, rect.top - estimatedHeight - 4), left: rect.left })
        } else {
            setPos({ top: rect.bottom + 4, left: rect.left })
        }
    }, [recomputeKey, mode])

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const t = e.target as globalThis.Node
            if (!pickerRef.current?.contains(t)) onClose()
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    const q = search.toLowerCase().trim()

    const pickerStyle: React.CSSProperties = pos
        ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }
        : { position: 'fixed', visibility: 'hidden' as const }

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
            items = allLenses
                .filter(l => !cameraMountFilter || l.cameraMount.name === cameraMountFilter)
                .filter(l => !q || `${l.manufacturer.name} ${l.name}`.toLowerCase().includes(q))
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

    return (
        <>
            <span ref={placeholderRef} />
            {createPortal(pickerEl, document.body)}
        </>
    )
}

/* ═══════════════════════════════════════════════
   Custom React Flow nodes
   ═══════════════════════════════════════════════ */

/* eslint-disable @typescript-eslint/no-explicit-any */

const LensNodeComponent = memo(function LensNodeComponent({ data }: NodeProps) {
    const lens = (data as any).lens as LensData
    return (
        <div className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${nodeStyleClasses.lens}`}
            style={{ width: LENS_W, height: LENS_H }}>
            <Handle type="source" position={Position.Right} className="!bg-blue-400 !w-2 !h-2 !border-0" />
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/60">
                <HousingImage src={lens.imageInfo.src} fallback={lens.imageInfo.fallback} alt={lens.name}
                    className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight text-sm truncate">{lens.name}</p>
                <p className="text-[10px] opacity-60">{focalLabel(lens)}</p>
                <p className="text-[10px] opacity-60">{lens.manufacturer.name}</p>
            </div>
        </div>
    )
})

const StepNodeComponent = memo(function StepNodeComponent({ data }: NodeProps) {
    const trieNode = (data as any).trieNode as TrieNode
    const isDraft = (data as any).isDraft as boolean
    const ctx = useContext(ChartContext)
    const style = nodeStyleClasses[trieNode.type] || nodeStyleClasses.ring

    return (
        <div className="group/node relative" style={{ width: NODE_W, height: NODE_H }}>
            <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2 !border-0" />
            <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2 !border-0" />
            <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs w-full h-full cursor-pointer hover:shadow-md transition-shadow ${style} ${isDraft ? 'border-dashed border-2 opacity-70' : ''}`}>
                <div className="relative w-7 h-7 rounded overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <HousingImage src={trieNode.imageInfo.src} fallback={trieNode.imageInfo.fallback} alt={trieNode.label}
                        className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0 max-w-[120px]">
                    <p className="font-semibold leading-tight truncate">{trieNode.label}</p>
                    <p className="text-[10px] opacity-60 truncate">{trieNode.detail}</p>
                </div>
                {trieNode.notes && (
                    <span className="text-[10px] opacity-50 italic ml-1 max-w-[60px] truncate" title={trieNode.notes}>
                        {trieNode.notes}
                    </span>
                )}
            </div>
            {ctx?.isSuperuser && trieNode.terminalEntryId && !isDraft && (
                <button
                    onClick={(e) => { e.stopPropagation(); ctx.onDeleteEntry(trieNode.terminalEntryId!) }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/node:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Delete this combination"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
            {isDraft && trieNode.children.length === 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); ctx?.onCancelDraft() }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Cancel building"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    )
})

const PortNodeComponent = memo(function PortNodeComponent({ data }: NodeProps) {
    const trieNode = (data as any).trieNode as TrieNode
    const ctx = useContext(ChartContext)
    const isRec = !!(trieNode.terminalEntryId && ctx?.recommendedEntries.has(trieNode.terminalEntryId))

    return (
        <div className="group/node relative" style={{ width: NODE_W, height: NODE_H }}>
            <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2 !h-2 !border-0" />
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs w-full h-full cursor-pointer hover:shadow-md transition-shadow ${nodeStyleClasses.port}`}>
                <div className="relative w-7 h-7 rounded overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <HousingImage src={trieNode.imageInfo.src} fallback={trieNode.imageInfo.fallback} alt={trieNode.label}
                        className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight truncate">{trieNode.label}</p>
                    <p className="text-[10px] opacity-60 truncate">{trieNode.detail}</p>
                </div>
                {trieNode.notes && (
                    <span className="text-[10px] opacity-50 italic max-w-[40px] truncate" title={trieNode.notes}>
                        {trieNode.notes}
                    </span>
                )}
            </div>
            {/* Recommended star — outside the node to the right */}
            {trieNode.terminalEntryId && (isRec || ctx?.isSuperuser) && (
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left: NODE_W + 6 }}>
                    {ctx?.isSuperuser ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); ctx.toggleRecommended(trieNode.terminalEntryId!) }}
                            className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${isRec
                                ? 'text-amber-400 hover:text-amber-500'
                                : 'text-gray-300 hover:text-amber-400'
                                }`}
                            title="Mark as recommended port system"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isRec ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    ) : (
                        <span className="w-5 h-5 flex items-center justify-center text-amber-400" title="Recommended port system">
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </span>
                    )}
                </div>
            )}
            {ctx?.isSuperuser && trieNode.terminalEntryId && (
                <button
                    onClick={(e) => { e.stopPropagation(); ctx.onDeleteEntry(trieNode.terminalEntryId!) }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/node:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Delete this combination"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    )
})

const AddLensNodeComponent = memo(function AddLensNodeComponent({ data }: NodeProps) {
    const ctx = useContext(ChartContext)
    const pk = (data as any).pickerKey as string
    const isOpen = ctx?.pickerKey === pk

    return (
        <div className="nopan nodrag nowheel relative" style={{ width: LENS_W, height: LENS_H }}>
            <Handle type="target" position={Position.Left} className="!bg-transparent !w-0 !h-0 !border-0 !min-w-0 !min-h-0" />
            <button
                onClick={(e) => { e.stopPropagation(); ctx?.onOpenPicker(pk) }}
                className="nopan nodrag nowheel w-full h-full rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center gap-2 text-blue-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                style={{ pointerEvents: 'all' }}
                title="Add new lens entry"
            >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">New Entry</span>
            </button>
            {isOpen && ctx?.pickerMode && (
                <InlinePicker mode={ctx.pickerMode} {...ctx.pickerProps} />
            )}
        </div>
    )
})

const AddNodeComponent = memo(function AddNodeComponent({ data }: NodeProps) {
    const ctx = useContext(ChartContext)
    const pk = (data as any).pickerKey as string
    const isOpen = ctx?.pickerKey === pk

    return (
        <div className="nopan nodrag nowheel relative">
            <Handle type="target" position={Position.Left} className="!bg-transparent !w-0 !h-0 !border-0 !min-w-0 !min-h-0" />
            <button
                onClick={(e) => { e.stopPropagation(); ctx?.onOpenPicker(pk) }}
                className="nopan nodrag nowheel w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                style={{ pointerEvents: 'all' }}
                title="Add"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>
            {isOpen && ctx?.pickerMode && (
                <InlinePicker mode={ctx.pickerMode} {...ctx.pickerProps} />
            )}
        </div>
    )
})

/* eslint-enable @typescript-eslint/no-explicit-any */

/* ═══════════════════════════════════════════════
   Node types (module-level for React Flow)
   ═══════════════════════════════════════════════ */

const nodeTypes = {
    chartLens: LensNodeComponent,
    chartStep: StepNodeComponent,
    chartPort: PortNodeComponent,
    chartAdd: AddNodeComponent,
    chartAddRoot: AddLensNodeComponent,
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export default function PortChartClient({
    manufacturerId,
    manufacturerSlug,
    allLenses,
    allPorts,
    allExtensionRings,
    allPortAdapters,
    entries: initial,
    isSuperuser,
}: Props) {
    const router = useRouter()
    const [entries, setEntries] = useState(initial)
    const [loading, setLoading] = useState(false)

    // ── Recommended entries (persisted in DB) ─────────────────────
    const [recommendedEntries, setRecommendedEntries] = useState<Set<number>>(() => {
        const set = new Set<number>()
        for (const e of initial) {
            if (e.isRecommended) set.add(e.id)
        }
        return set
    })

    async function toggleRecommended(entryId: number) {
        const wasRecommended = recommendedEntries.has(entryId)
        const newValue = !wasRecommended
        // Optimistic update
        setRecommendedEntries(prev => {
            const next = new Set(prev)
            if (newValue) {
                const entry = entries.find(e => e.id === entryId)
                if (entry) {
                    for (const e of entries) {
                        if (e.lens.id === entry.lens.id) next.delete(e.id)
                    }
                }
                next.add(entryId)
            } else {
                next.delete(entryId)
            }
            return next
        })
        try {
            await fetch(`/api/admin/port-chart-entries?id=${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRecommended: newValue }),
            })
        } catch {
            // Revert on error
            setRecommendedEntries(prev => {
                const next = new Set(prev)
                if (wasRecommended) next.add(entryId)
                else next.delete(entryId)
                return next
            })
        }
    }

    // ── Camera-mount tabs ──────────────────────────────────────────
    const mounts: string[] = useMemo(
        () => Array.from(new Set(entries.map(e => e.lens.cameraMount.name).filter(Boolean))).sort(),
        [entries],
    )

    const [selectedMount, setSelectedMount] = useState<string | null>(() => mounts[0] ?? null)

    const visibleEntries = useMemo(
        () => selectedMount ? entries.filter(e => e.lens.cameraMount.name === selectedMount) : entries,
        [entries, selectedMount],
    )

    function handleMountTab(mount: string) {
        setSelectedMount(mount)
        setDraftChain(null)
        closePicker()
    }

    // ── Picker state ──────────────────────────────────────────────
    const [pickerKey, setPickerKey] = useState<string | null>(null)
    const [pickerMode, setPickerMode] = useState<PickerMode | null>(null)
    const [pickerContext, setPickerContext] = useState<{
        lensId?: number
        branchPath: string
        sharedStepKeys: string[]
        isDraftContinuation?: boolean
    } | null>(null)

    // ── Draft chain (in-progress build) ───────────────────────────
    const [draftChain, setDraftChain] = useState<DraftChain | null>(null)

    const closePicker = useCallback(() => {
        setPickerKey(null)
        setPickerMode(null)
        setPickerContext(null)
    }, [])

    function cancelDraft() {
        setDraftChain(null)
        closePicker()
    }

    // ── Computed trees and layout ─────────────────────────────────
    const trees = useMemo(() => {
        if (!draftChain) {
            return buildLensTrees(visibleEntries, allPorts, allExtensionRings, allPortAdapters)
        }

        const draftEntry = buildDraftEntry(draftChain, allLenses, allExtensionRings, allPortAdapters)
        const isNewLens = !visibleEntries.some(e => e.lens.id === draftChain.lensId)

        if (isNewLens) {
            // Keep the draft lens at the end to avoid disorienting re-sorts during building
            const realTrees = buildLensTrees(visibleEntries, allPorts, allExtensionRings, allPortAdapters)
            if (draftEntry) {
                const draftTrees = buildLensTrees([draftEntry], allPorts, allExtensionRings, allPortAdapters)
                return [...realTrees, ...draftTrees]
            }
            return realTrees
        } else {
            // Merge draft into existing tree for this lens
            const entriesToUse = draftEntry ? [...visibleEntries, draftEntry] : visibleEntries
            return buildLensTrees(entriesToUse, allPorts, allExtensionRings, allPortAdapters)
        }
    }, [visibleEntries, allPorts, allExtensionRings, allPortAdapters, draftChain, allLenses])

    const maxSteps = useMemo(
        () => Math.max(
            0,
            ...visibleEntries.map(e => e.steps.length),
            draftChain ? draftChain.sharedStepKeys.length + draftChain.steps.length : 0,
        ),
        [visibleEntries, draftChain],
    )

    const { nodes: flowNodes, edges: flowEdges, height: flowHeight, width: flowWidth } = useMemo(
        () => computeFlowLayout(trees, maxSteps, isSuperuser, manufacturerSlug, draftChain ? DRAFT_ENTRY_ID : null),
        [trees, maxSteps, isSuperuser, manufacturerSlug, draftChain],
    )

    // ── Picker key parsing ────────────────────────────────────────
    function parseLensPrefixedKey(raw: string): { lensId: number; innerPath: string } | null {
        const m = raw.match(/^L(\d+)\/(.*)$/)
        if (!m) return null
        return { lensId: parseInt(m[1], 10), innerPath: m[2] }
    }

    function handleOpenPicker(key: string) {
        if (key === 'root') {
            setPickerKey(key); setPickerMode('lens')
            setPickerContext({ branchPath: '', sharedStepKeys: [], isDraftContinuation: false })
            return
        }
        if (key.startsWith('lens:')) {
            const lensId = parseInt(key.replace('lens:', ''))
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId, branchPath: '', sharedStepKeys: [], isDraftContinuation: false })
            return
        }
        if (key.startsWith('branch:L')) {
            const parsed = parseLensPrefixedKey(key.replace('branch:', ''))
            if (parsed) {
                const parts = parsed.innerPath.split('/').filter(Boolean)
                setPickerKey(key); setPickerMode('step-type')
                setPickerContext({ lensId: parsed.lensId, branchPath: parsed.innerPath, sharedStepKeys: parts, isDraftContinuation: false })
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
                    isDraftContinuation: true,
                })
            }
            return
        }
        const parsed = parseLensPrefixedKey(key)
        if (parsed) {
            const parts = parsed.innerPath.split('/').filter(Boolean)
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId: parsed.lensId, branchPath: parsed.innerPath, sharedStepKeys: parts, isDraftContinuation: false })
        }
    }

    // ── Selection handlers ────────────────────────────────────────

    function handleSelectLens(lensId: number) {
        setPickerMode('step-type')
        setPickerContext({ lensId, branchPath: '', sharedStepKeys: [], isDraftContinuation: true })
        setDraftChain({ lensId, branchPath: '', sharedStepKeys: [], steps: [] })
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
        const chain: DraftChain = (draftChain && pickerContext?.isDraftContinuation)
            ? { ...draftChain, steps: [...draftChain.steps, step] }
            : { lensId: pickerContext.lensId, branchPath: pickerContext.branchPath, sharedStepKeys: pickerContext.sharedStepKeys, steps: [step] }
        setDraftChain(chain)
        setPickerKey('draft:next')
        setPickerMode('step-type')
        setPickerContext({ lensId: chain.lensId, branchPath: chain.branchPath, sharedStepKeys: chain.sharedStepKeys, isDraftContinuation: true })
    }

    function handleSelectAdapter(adapterId: number) {
        const adapter = allPortAdapters.find(a => a.id === adapterId)
        if (!adapter || !pickerContext?.lensId) return

        const step: DraftStep = {
            type: 'adapter', itemId: adapterId,
            label: adapter.name,
            detail: `${adapter.inputHousingMount?.slug.toUpperCase() ?? '?'} → ${adapter.outputHousingMount?.slug.toUpperCase() ?? '?'}`,
        }
        const chain: DraftChain = (draftChain && pickerContext?.isDraftContinuation)
            ? { ...draftChain, steps: [...draftChain.steps, step] }
            : { lensId: pickerContext.lensId, branchPath: pickerContext.branchPath, sharedStepKeys: pickerContext.sharedStepKeys, steps: [step] }
        setDraftChain(chain)
        setPickerKey('draft:next')
        setPickerMode('step-type')
        setPickerContext({ lensId: chain.lensId, branchPath: chain.branchPath, sharedStepKeys: chain.sharedStepKeys, isDraftContinuation: true })
    }

    async function handleSelectPort(portId: number) {
        const lensId = draftChain?.lensId ?? pickerContext?.lensId
        if (!lensId) return
        setLoading(true)

        const allSteps: { extensionRingId?: number; portAdapterId?: number }[] = []
        const sharedKeys = draftChain?.sharedStepKeys ?? pickerContext?.sharedStepKeys ?? []
        for (const key of sharedKeys) {
            const [type, idStr] = key.split(':')
            const id = parseInt(idStr)
            if (type === 'ring') allSteps.push({ extensionRingId: id })
            else if (type === 'adapter') allSteps.push({ portAdapterId: id })
        }
        if (draftChain) {
            for (const step of draftChain.steps) {
                if (step.type === 'ring') allSteps.push({ extensionRingId: step.itemId })
                else if (step.type === 'adapter') allSteps.push({ portAdapterId: step.itemId })
            }
        }

        try {
            const res = await fetch('/api/admin/port-chart-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manufacturerId, lensId, portId, steps: allSteps }),
            })
            if (res.ok) {
                const data = await res.json()
                const lens = allLenses.find(l => l.id === lensId)!
                const port = allPorts.find(p => p.id === portId)!
                const newEntry: Entry = {
                    id: data.id,
                    lens,
                    port: port ? { id: port.id, name: port.name, slug: port.slug, isFlatPort: port.isFlatPort, productPhotos: port.productPhotos, imageInfo: port.imageInfo } : null,
                    steps: (data.steps ?? []).map((s: { id: number; order: number; extensionRing: EntryStep['extensionRing']; portAdapter: EntryStep['portAdapter'] }) => ({
                        id: s.id, order: s.order, extensionRing: s.extensionRing, portAdapter: s.portAdapter,
                    })),
                    notes: data.notes ?? null,
                    isRecommended: false,
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

    const sharedPickerProps: SharedPickerProps = useMemo(() => ({
        allLenses, allPorts, allExtensionRings, allPortAdapters,
        cameraMountFilter: selectedMount,
        onSelectLens: handleSelectLens, onSelectStepType: handleSelectStepType,
        onSelectRing: handleSelectRing, onSelectAdapter: handleSelectAdapter,
        onSelectPort: handleSelectPort, onClose: closePicker,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [allLenses, allPorts, allExtensionRings, allPortAdapters, closePicker, draftChain, pickerContext, selectedMount])

    const chartCtx: ChartContextValue = useMemo(() => ({
        isSuperuser,
        manufacturerSlug,
        recommendedEntries,
        toggleRecommended,
        onDeleteEntry: handleDeleteEntry,
        onCancelDraft: cancelDraft,
        onOpenPicker: handleOpenPicker,
        pickerKey,
        pickerMode,
        pickerProps: sharedPickerProps,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [isSuperuser, manufacturerSlug, recommendedEntries, pickerKey, pickerMode, sharedPickerProps, draftChain])

    const canvasWidth = flowWidth + 40
    const canvasHeight = flowHeight + 40

    /* ═══════════════════════════════════════════════
       Render
       ═══════════════════════════════════════════════ */
    return (
        <div className="relative">
            {/* Lens-mount tabs */}
            {mounts.length > 1 && (
                <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
                    {mounts.map(mount => (
                        <button
                            key={mount}
                            onClick={() => handleMountTab(mount)}
                            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${selectedMount === mount
                                ? 'border-blue-500 text-blue-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {mount}
                        </button>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 mb-4 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300" /> Lens</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300" /> Extension ring</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" /> Adapter</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" /> Port</div>
                <div className="flex items-center gap-1.5 ml-2 text-gray-400">
                    <span>Scroll to navigate</span>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 z-30 flex items-center justify-center rounded-xl">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* React Flow canvas */}
            {trees.length > 0 || isSuperuser ? (
                <ChartContext.Provider value={chartCtx}>
                    <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
                        <div style={{ width: canvasWidth, height: canvasHeight }}>
                            <ReactFlow
                                key={selectedMount ?? 'all'}
                                nodes={flowNodes}
                                edges={flowEdges}
                                nodeTypes={nodeTypes}
                                fitView={false}
                                defaultViewport={{ x: 20, y: 20, zoom: 1 }}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                panOnDrag={false}
                                panOnScroll={false}
                                zoomOnScroll={false}
                                zoomOnPinch={false}
                                zoomOnDoubleClick={false}
                                preventScrolling={false}
                                proOptions={{ hideAttribution: true }}
                                onNodeClick={(event, node) => {
                                    // Don't navigate if a button inside the node was clicked
                                    if ((event.target as HTMLElement).closest('button')) return
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const href = (node.data as any).href as string | undefined
                                    if (href) router.push(href)
                                }}
                            />
                        </div>
                    </div>
                </ChartContext.Provider>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="text-center py-12">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 text-sm">No port chart entries yet.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
