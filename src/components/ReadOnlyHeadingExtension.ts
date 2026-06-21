import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * TipTap extension that makes headings with the .review-section-heading class
 * visually distinct and prevents editing via keyboard/delete/backspace.
 *
 * Headings are wrapped with a non-editable decoration but remain in the document
 * so they appear in the outline and are preserved on HTML export.
 */
export const ReadOnlyHeading = Extension.create({
    name: 'readOnlyHeading',

    addProseMirrorPlugins() {
        const pluginKey = new PluginKey('readOnlyHeading')

        return [
            new Plugin({
                key: pluginKey,
                props: {
                    handleKeyDown(view, event) {
                        const { state } = view
                        const { selection } = state

                        // Check if selection touches a read-only heading
                        if (isSelectionInReadOnlyHeading(state)) {
                            const key = event.key
                            // Block deletion keys
                            if (key === 'Backspace' || key === 'Delete') {
                                return true
                            }
                            // Allow arrow keys and navigation
                            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
                                return false
                            }
                            // Allow copy (Ctrl+C / Cmd+C)
                            if ((event.metaKey || event.ctrlKey) && key === 'c') {
                                return false
                            }
                            // Block all other typing/editing within headings
                            if (key.length === 1 || key === 'Enter' || key === 'Tab') {
                                return true
                            }
                        }
                        return false
                    },

                    handlePaste(view, _event, slice) {
                        const { state } = view
                        if (isSelectionInReadOnlyHeading(state)) {
                            return true // block paste
                        }
                        return false
                    },

                    handleClick(view, pos, event) {
                        const { state } = view
                        const $pos = state.doc.resolve(pos)
                        const node = $pos.node()

                        if (node.type.name === 'heading' && node.attrs.class?.includes('review-section-heading')) {
                            // Move cursor to the first editable position after this heading
                            const headingEnd = $pos.end($pos.depth)
                            const tr = state.tr
                            // Find next editable position
                            let nextPos = headingEnd + 1
                            while (nextPos < state.doc.content.size) {
                                const $next = state.doc.resolve(nextPos)
                                const nextNode = $next.node()
                                if (nextNode.type.name === 'heading' && nextNode.attrs.class?.includes('review-section-heading')) {
                                    break
                                }
                                if (nextNode.type.name === 'paragraph' && nextNode.content.size === 0) {
                                    // Empty paragraph - place cursor here
                                    tr.setSelection(TextSelection.create(state.doc, nextPos + 1))
                                    view.dispatch(tr)
                                    return true
                                }
                                if (nextNode.isTextblock && nextNode.type.name !== 'heading') {
                                    tr.setSelection(TextSelection.create(state.doc, nextPos + 1))
                                    view.dispatch(tr)
                                    return true
                                }
                                nextPos += nextNode.nodeSize
                            }
                            return true
                        }
                        return false
                    },

                    decorations(state) {
                        const decorations: Decoration[] = []
                        state.doc.descendants((node, pos) => {
                            if (node.type.name === 'heading' && node.attrs.class?.includes('review-section-heading')) {
                                decorations.push(
                                    Decoration.node(pos, pos + node.nodeSize, {
                                        class: 'review-section-heading',
                                    })
                                )
                            }
                        })
                        return DecorationSet.create(state.doc, decorations)
                    },
                },
            }),
        ]
    },
})

function isSelectionInReadOnlyHeading(state: { doc: { resolve: (pos: number) => { node: () => { type: { name: string }, attrs: { class?: string } } } }, selection: { from: number, to: number } }): boolean {
    const { from, to } = state.selection
    // Check both ends of the selection
    for (const pos of [from, to]) {
        const $pos = state.doc.resolve(pos)
        const node = $pos.node()
        if (node.type.name === 'heading' && node.attrs.class?.includes('review-section-heading')) {
            return true
        }
    }
    return false
}
