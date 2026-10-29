/**
 * Formatierungs-Helfer für den Text-Editor des Lehrerzimmers (PROJ-63).
 * Reine Funktionen auf Text + Markierung (E6: fett, kursiv, Aufzählung, Link).
 * Gespeichert wird einfaches Markdown; angezeigt wird es streng gefiltert.
 */
export interface EditorState {
  value: string
  start: number
  end: number
}

/** Markierten Text mit `marker` umschließen; ohne Markierung kommt ein Platzhalter hinein, der markiert bleibt. */
export function wrapSelection(state: EditorState, marker: string, placeholder: string): EditorState {
  const { value, start, end } = state
  const selected = value.slice(start, end)
  const before = value.slice(0, start)
  const after = value.slice(end)

  // Schon umschlossen → wieder entfernen
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, selected.length - marker.length)
    return { value: before + inner + after, start, end: start + inner.length }
  }

  const text = selected || placeholder
  const next = before + marker + text + marker + after
  const textStart = start + marker.length
  return { value: next, start: textStart, end: textStart + text.length }
}

/** Alle berührten Zeilen als Aufzählung („- “) setzen; sind sie es schon, wieder zurücknehmen. */
export function toggleList(state: EditorState): EditorState {
  const { value, start, end } = state
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const nextBreak = value.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const allListed = lines.every((l) => l.startsWith('- '))
  const changed = lines.map((l) => (allListed ? l.slice(2) : l.startsWith('- ') ? l : `- ${l}`)).join('\n')
  return {
    value: value.slice(0, lineStart) + changed + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + changed.length,
  }
}

/** Link einfügen: markierter Text wird zum Linktext; ohne Markierung kommt „Linktext“. */
export function insertLink(state: EditorState, url: string): EditorState {
  const { value, start, end } = state
  const label = value.slice(start, end) || 'Linktext'
  const link = `[${label}](${url})`
  return {
    value: value.slice(0, start) + link + value.slice(end),
    start: start + 1,
    end: start + 1 + label.length,
  }
}

/** Nimmt nur Web- und Mail-Adressen als Link-Ziel; fehlt das Schema, wird `https://` ergänzt. */
export function normalizeLinkUrl(raw: string): string | null {
  const input = raw.trim()
  if (!input || /\s/.test(input)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`
  try {
    const url = new URL(withScheme)
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null
    return withScheme
  } catch {
    return null
  }
}
