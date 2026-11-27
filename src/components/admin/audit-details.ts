/**
 * Alt/Neu-Zeilen für das Änderungsprotokoll (PROJ-127). Liest die Formen, die
 * die Verwaltungs-Schnittstellen in `details` ablegen:
 *  - `changes: { feld: { alt, neu } }` (Items, Einstellungen)
 *  - `gesperrt` / `bereich: { alt, neu }` (Sperren, Rollenwechsel)
 *  - `from` / `to` (Rolle, Bereich verschieben)
 *  - `neu: { feld: wert }` (Anlegen)
 */
export type AuditChangeLine = { label: string; alt: string | null; neu: string }

const FIELD_LABEL: Record<string, string> = {
  name: 'Name',
  description: 'Beschreibung',
  category: 'Kategorie',
  icon_key: 'Symbol',
  price: 'Preis',
  rarity_override: 'Seltenheit',
  is_active: 'Aktiv',
  prompt_notes: 'Hinweise für die KI',
  currency_name: 'Name der Münzen',
  hof_name: 'Name des Hofs',
  hof_short_name: 'Kurzform des Hofs',
  gesperrt: 'Gesperrt',
  bereich: 'Bereich',
  role: 'Rolle',
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'ja' : 'nein'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

function isPair(v: unknown): v is { alt: unknown; neu: unknown } {
  return typeof v === 'object' && v !== null && 'alt' in v && 'neu' in v
}

export function auditChangeLines(details: Record<string, unknown> | null | undefined): AuditChangeLine[] {
  if (!details) return []
  const lines: AuditChangeLine[] = []
  const label = (key: string) => FIELD_LABEL[key] ?? key

  const addPairs = (obj: unknown) => {
    if (typeof obj !== 'object' || obj === null) return
    for (const [key, v] of Object.entries(obj)) {
      if (isPair(v)) lines.push({ label: label(key), alt: formatAuditValue(v.alt), neu: formatAuditValue(v.neu) })
    }
  }

  addPairs(details.changes)
  for (const key of ['gesperrt', 'bereich']) {
    const v = details[key]
    if (isPair(v)) lines.push({ label: label(key), alt: formatAuditValue(v.alt), neu: formatAuditValue(v.neu) })
  }
  if ('from' in details && 'to' in details && !isPair(details.bereich)) {
    lines.push({ label: 'Wert', alt: formatAuditValue(details.from), neu: formatAuditValue(details.to) })
  }
  if (typeof details.neu === 'object' && details.neu !== null && !isPair(details.neu)) {
    for (const [key, v] of Object.entries(details.neu)) {
      lines.push({ label: label(key), alt: null, neu: formatAuditValue(v) })
    }
  }
  return lines
}
