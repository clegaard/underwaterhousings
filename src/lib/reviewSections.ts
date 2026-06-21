/**
 * Converts JSON review sections to a single HTML document with read-only headings.
 * The headings use contenteditable="false" so TipTap treats them as non-editable.
 */
export function sectionsToHtml(sections: {
    introduction: string
    components: Array<{ label: string; content: string }>
    conclusion: string
}): string {
    const parts: string[] = []

    parts.push('<h2 class="review-section-heading">Introduction</h2>')
    parts.push(sections.introduction || '<p></p>')

    for (const comp of sections.components) {
        parts.push(`<h2 class="review-section-heading">${escapeHtml(comp.label)}</h2>`)
        parts.push(comp.content || '<p></p>')
    }

    parts.push('<h2 class="review-section-heading">Conclusion</h2>')
    parts.push(sections.conclusion || '<p></p>')

    return parts.join('\n')
}

/**
 * Converts HTML back to JSON review sections by splitting at h2 headings.
 * Headings with contenteditable="false" are treated as section markers.
 */
export function htmlToSections(
    html: string,
    systemComponents: {
        cameras: string[]
        lenses: string[]
        housings: string[]
        ports: string[]
    }
): string {
    // Build the expected heading labels in order
    const expectedLabels: string[] = ['Introduction']
    for (const c of systemComponents.cameras) expectedLabels.push(c)
    for (const l of systemComponents.lenses) expectedLabels.push(l)
    for (const h of systemComponents.housings) expectedLabels.push(h)
    for (const p of systemComponents.ports) expectedLabels.push(p)
    expectedLabels.push('Conclusion')

    // Split by h2 headings with review-section-heading class
    const headingRegex = /<h2[^>]*class="[^"]*review-section-heading[^"]*"[^>]*>([^<]*)<\/h2>/gi
    const sections: Array<{ heading: string; content: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = headingRegex.exec(html)) !== null) {
        const headingText = match[1].trim()
        const contentStart = match.index + match[0].length
        sections.push({
            heading: headingText,
            content: html.slice(lastIndex, match.index).trim(),
        })
        lastIndex = contentStart
    }
    // Last section content after the final heading
    if (lastIndex < html.length) {
        if (sections.length > 0) {
            sections[sections.length - 1].content = html.slice(lastIndex).trim()
        }
    }

    // Match sections to expected labels
    const intro = sections.find(s => s.heading === 'Introduction')?.content || ''
    const conclusion = sections.find(s => s.heading === 'Conclusion')?.content || ''

    const components: Array<{ type: string; label: string; content: string }> = []
    for (let i = 1; i < expectedLabels.length - 1; i++) {
        const label = expectedLabels[i]
        const section = sections.find(s => s.heading === label)
        const type = i <= systemComponents.cameras.length ? 'camera'
            : i <= systemComponents.cameras.length + systemComponents.lenses.length ? 'lens'
                : i <= systemComponents.cameras.length + systemComponents.lenses.length + systemComponents.housings.length ? 'housing'
                    : 'port'
        components.push({ type, label, content: section?.content || '' })
    }

    return JSON.stringify({ introduction: intro, components, conclusion })
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
