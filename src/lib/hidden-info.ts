import type { SupabaseClient } from '@supabase/supabase-js'

/** Beschreibung des Vorgangs, wenn eine Frage aus der Meldungs-Inbox ausgeblendet wird (PROJ-131) */
export const REPORT_BATCH_DESCRIPTION = 'Nach einer Meldung'

const LEGACY_LABEL = 'Stand bei Einführung'
export const HIDDEN_BEFORE_TEXT = 'Schon vor dieser Änderung ausgeblendet'

export type StatusVersion = {
  content_id: string
  change_type: 'created' | 'deactivated' | 'activated'
  created_at: string
  changed_by_label: string | null
  batch_id: string | null
  profiles?: { display_name?: string | null; first_name?: string | null; last_name?: string | null } | null
}

function personName(v: StatusVersion): string | null {
  const full = [v.profiles?.first_name?.trim(), v.profiles?.last_name?.trim()].filter(Boolean).join(' ')
  return full || v.profiles?.display_name?.trim() || v.changed_by_label || null
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })
}

/**
 * Satz „warum und von wem ausgeblendet“ (B40) aus der jüngsten Version, die
 * den Zustand gesetzt hat. `version` fehlt oder ist der Einführungsstand:
 * die Frage war schon vorher ausgeblendet.
 */
export function describeHidden(version: StatusVersion | undefined, batchDescription: string | null): string {
  if (!version || version.changed_by_label === LEGACY_LABEL || version.change_type === 'activated') {
    return HIDDEN_BEFORE_TEXT
  }
  if (version.change_type === 'deactivated' && batchDescription === REPORT_BATCH_DESCRIPTION) {
    return 'Ausgeblendet nach einer Meldung'
  }
  const name = personName(version)
  const prefix = version.change_type === 'created' ? 'Ausgeblendet angelegt' : 'Ausgeblendet'
  return `${prefix}${name ? ` von ${name}` : ''} am ${shortDate(version.created_at)}`
}

/**
 * Für ausgeblendete Fragen: ID → Satz. Braucht einen Client, der alle
 * Versionen und Vorgänge lesen darf (Dienst-Client, nach der Rechteprüfung) —
 * Vorgänge sieht sonst nur der Super-Admin oder die handelnde Person.
 * Wirft nicht; bei einem Fehler fehlen die Sätze.
 */
export async function loadHiddenInfo(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (ids.length === 0) return result
  const { data, error } = await client
    .from('content_versions')
    .select(
      'content_id, change_type, created_at, changed_by_label, batch_id, profiles:changed_by ( display_name, first_name, last_name )',
    )
    .eq('content_type', 'question')
    .in('content_id', ids)
    .in('change_type', ['created', 'deactivated', 'activated'])
    .order('version_number', { ascending: false })
    .limit(1000)
  if (error) {
    console.error('[loadHiddenInfo] versions', error)
    return result
  }
  const latest = new Map<string, StatusVersion>()
  for (const row of (data ?? []) as unknown as StatusVersion[]) {
    if (!latest.has(row.content_id)) latest.set(row.content_id, row)
  }
  const batchIds = Array.from(new Set(Array.from(latest.values()).flatMap((v) => (v.batch_id ? [v.batch_id] : []))))
  const batches = new Map<string, string | null>()
  if (batchIds.length > 0) {
    const { data: rows, error: batchError } = await client
      .from('content_change_batches')
      .select('id, description')
      .in('id', batchIds)
    if (batchError) console.error('[loadHiddenInfo] batches', batchError)
    for (const b of (rows ?? []) as { id: string; description: string | null }[]) batches.set(b.id, b.description)
  }
  for (const id of ids) {
    const version = latest.get(id)
    result.set(id, describeHidden(version, version?.batch_id ? (batches.get(version.batch_id) ?? null) : null))
  }
  return result
}
