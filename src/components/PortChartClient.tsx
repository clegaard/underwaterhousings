'use client'

import { useState, useMemo, useCallback, createContext, useContext, memo, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    ReactFlow,
    Handle,
    Position,
} from '@xyflow/react'
import type { Node, Edge, NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Link from 'next/link'
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
                        key: step.key, type: step.type, itemId: step.itemId, slug: step.slug,
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
                data: { lens: tree.lens },
            })

            if (isSuperuser) {
                const addId = `add-empty-${lensNumId}`
                nodes.push({
                    id: addId,
                    type: 'chartAdd',
                    position: { x: LENS_W + COL_GAP, y: currentY + (LENS_H - 28) / 2 },
                    data: { pickerKey: `lens:${lensNumId}` },
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
                    nodes.push({
                        id: nodeId,
                        type: isPort ? 'chartPort' : 'chartStep',
                        position: { x, y: cy },
                        data: { trieNode: node },
                    })
                    edges.push({
                        id: `e-${parentId}-${nodeId}`,
                        source: parentId,
                        target: nodeId,
                        type: 'smoothstep',
                        style: { stroke: '#9ca3af', strokeWidth: 1.5 },
                    })

                    if (!isPort && isSuperuser) {
                        const addId = `add-ext-${nodeId}`
                        const addX = x + NODE_W + 20
                        nodes.push({
                            id: addId,
                            type: 'chartAdd',
                            position: { x: addX, y: cy + (NODE_H - 28) / 2 },
                            data: { pickerKey: `L${lensNumId}/${nodePath.join('/')}` },
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
                    nodes.push({
                        id: nodeId,
                        type: isPort ? 'chartPort' : 'chartStep',
                        position: { x, y: centerY },
                        data: { trieNode: node },
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
            data: { lens: tree.lens },
        })

        currentY = result.nextY + GROUP_GAP
    }

    if (isSuperuser) {
        nodes.push({
            id: 'add-root',
            type: 'chartAdd',
            position: { x: 0, y: currentY },
            data: { pickerKey: 'root' },
        })
        currentY += ROW_H
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
    onDeleteEntry: (id: number) => void
    onOpenPicker: (key: string) => void
    pickerKey: string | null
    pickerMode: PickerMode | null
    pickerProps: SharedPickerProps
}

const ChartContext = createContext<ChartContextValue | null>(null)

/* ═══════════════════════════════════════════════
   Inline Picker Popover (portal-based)
   ═══════════════════════════════════════════════ */

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
        <Link
            href={`/lenses/${lens.manufacturer.slug}/${lens.slug}`}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-xs hover:shadow-md transition-shadow cursor-pointer ${nodeStyleClasses.lens}`}
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
        </Link>
    )
})

const StepNodeComponent = memo(function StepNodeComponent({ data }: NodeProps) {
    const trieNode = (data as any).trieNode as TrieNode
    const ctx = useContext(ChartContext)
    const style = nodeStyleClasses[trieNode.type] || nodeStyleClasses.ring

    return (
        <div className="group/node relative" style={{ width: NODE_W, height: NODE_H }}>
            <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2 !border-0" />
            <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2 !border-0" />
            <Link
                href={`/gear/${ctx?.manufacturerSlug}/${trieNode.slug}`}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs w-full h-full hover:shadow-md transition-shadow cursor-pointer ${style}`}>
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
            </Link>
            {ctx?.isSuperuser && trieNode.terminalEntryId && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.onDeleteEntry(trieNode.terminalEntryId!) }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/node:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Delete this combination"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
})

const PortNodeComponent = memo(function PortNodeComponent({ data }: NodeProps) {
    const trieNode = (data as any).trieNode as TrieNode
    const ctx = useContext(ChartContext)

    return (
        <div className="group/node relative" style={{ width: NODE_W, height: NODE_H }}>
            <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2 !h-2 !border-0" />
            <Link
                href={`/gear/${ctx?.manufacturerSlug}/${trieNode.slug}`}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs w-full h-full hover:shadow-md transition-shadow cursor-pointer ${nodeStyleClasses.port}`}>
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
            </Link>
            {ctx?.isSuperuser && trieNode.terminalEntryId && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.onDeleteEntry(trieNode.terminalEntryId!) }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/node:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Delete this combination"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
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
    const [entries, setEntries] = useState(initial)
    const [loading, setLoading] = useState(false)

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
    const trees = useMemo(
        () => buildLensTrees(visibleEntries, allPorts, allExtensionRings, allPortAdapters),
        [visibleEntries, allPorts, allExtensionRings, allPortAdapters],
    )

    const maxSteps = useMemo(
        () => Math.max(0, ...visibleEntries.map(e => e.steps.length)),
        [visibleEntries],
    )

    const { nodes: flowNodes, edges: flowEdges, height: flowHeight, width: flowWidth } = useMemo(
        () => computeFlowLayout(trees, maxSteps, isSuperuser),
        [trees, maxSteps, isSuperuser],
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
            setPickerContext({ branchPath: '', sharedStepKeys: [] })
            return
        }
        if (key.startsWith('lens:')) {
            const lensId = parseInt(key.replace('lens:', ''))
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId, branchPath: '', sharedStepKeys: [] })
            return
        }
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
        const parsed = parseLensPrefixedKey(key)
        if (parsed) {
            const parts = parsed.innerPath.split('/').filter(Boolean)
            setPickerKey(key); setPickerMode('step-type')
            setPickerContext({ lensId: parsed.lensId, branchPath: parsed.innerPath, sharedStepKeys: parts })
        }
    }

    // ── Selection handlers ────────────────────────────────────────

    function handleSelectLens(lensId: number) {
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

    const sharedPickerProps: SharedPickerProps = useMemo(() => ({
        allLenses, allPorts, allExtensionRings, allPortAdapters,
        onSelectLens: handleSelectLens, onSelectStepType: handleSelectStepType,
        onSelectRing: handleSelectRing, onSelectAdapter: handleSelectAdapter,
        onSelectPort: handleSelectPort, onClose: closePicker,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [allLenses, allPorts, allExtensionRings, allPortAdapters, closePicker])

    const chartCtx: ChartContextValue = useMemo(() => ({
        isSuperuser,
        manufacturerSlug,
        onDeleteEntry: handleDeleteEntry,
        onOpenPicker: handleOpenPicker,
        pickerKey,
        pickerMode,
        pickerProps: sharedPickerProps,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [isSuperuser, manufacturerSlug, pickerKey, pickerMode, sharedPickerProps])

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
                {draftChain && (
                    <button onClick={cancelDraft} className="ml-auto text-red-500 hover:text-red-700 text-xs font-medium">
                        Cancel building
                    </button>
                )}
            </div>

            {/* Draft preview bar */}
            {draftChain && draftChain.steps.length > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <span className="text-[10px] text-gray-500 font-medium shrink-0">Building:</span>
                    {draftChain.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                            <div className={`rounded-lg border-2 border-dashed px-2 py-0.5 text-[11px] font-medium ${nodeStyleClasses[step.type]}`}>
                                {step.label}
                            </div>
                        </div>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1">→ select next step</span>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/50 z-30 flex items-center justify-center rounded-xl">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* React Flow canvas */}
            {trees.length > 0 || isSuperuser ? (
                <ChartContext.Provider value={chartCtx}>
                    <div className="overflow-auto rounded-xl border border-gray-200 bg-white port-chart-container">
                        <style>{`.port-chart-container .react-flow__pane { pointer-events: none !important; }`}</style>
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
