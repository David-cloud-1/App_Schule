import type { UserRole } from '@/lib/roles'

/**
 * Sammelaktionen der Nutzerliste (PROJ-61): gemeinsame Regeln für Server und Oberfläche.
 * Der Server erzwingt sie, die Oberfläche nutzt sie nur zur Anzeige.
 */

export const BULK_ACTIONS = ['ban', 'unban', 'move'] as const
export type BulkAction = (typeof BULK_ACTIONS)[number]

/** Obergrenze pro Aufruf (Sicherung auf dem Server) */
export const BULK_MAX_IDS = 500
/** So viele Konten schickt der Browser pro Aufruf; dazwischen aktualisiert sich der Fortschritt */
export const BULK_CHUNK_SIZE = 100

export type BulkSkipReason = 'self' | 'linked' | 'super_admin' | 'role_first' | 'not_found' | 'same_department'

export const BULK_SKIP_LABEL: Record<BulkSkipReason, string> = {
  self: 'eigenes Konto',
  linked: 'verknüpfter Zweitaccount',
  super_admin: 'Super-Admin',
  role_first: 'Rolle zuerst ändern',
  not_found: 'nicht gefunden',
  same_department: 'schon in diesem Bereich',
}

export type BulkResultItem =
  | { id: string; status: 'done' }
  | { id: string; status: 'skipped'; reason: BulkSkipReason }
  | { id: string; status: 'failed' }

export const BULK_ACTION_LABEL: Record<BulkAction, { verb: string; done: string; title: string }> = {
  ban: { verb: 'Sperren', done: 'gesperrt', title: 'Konten sperren?' },
  unban: { verb: 'Entsperren', done: 'entsperrt', title: 'Konten entsperren?' },
  move: { verb: 'Bereich ändern', done: 'verschoben', title: 'In anderen Bereich verschieben?' },
}

export type BulkTarget = {
  id: string
  role: UserRole
  department_id: string | null
  linked_main_user_id?: string | null
}

/**
 * Warum ein Konto bei einer Sammelaktion übersprungen wird (`null` = wird bearbeitet).
 * `target` ist `null`, wenn das Konto nicht (mehr) existiert.
 */
export function bulkSkipReason(
  action: BulkAction,
  target: BulkTarget | null,
  ctx: { adminId: string; targetDepartmentId?: string },
  id: string,
): BulkSkipReason | null {
  if (id === ctx.adminId) return 'self'
  if (!target) return 'not_found'
  if (target.linked_main_user_id) return 'linked'
  if (target.role === 'admin') return 'super_admin'
  if (action === 'move') {
    // Die Rolle „Bereichs-Admin“ hängt am Bereich: erst Rolle ändern, dann verschieben
    if (target.role === 'department_admin') return 'role_first'
    if (target.department_id === ctx.targetDepartmentId) return 'same_department'
  }
  return null
}

/** Teilt eine Liste in Stücke (der Browser schickt die Auswahl in Teilen) */
export function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = []
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size))
  return parts
}

/** Namensliste für die Rückfrage: erste 5 Namen, dann „und {x} weitere“ */
export function previewNames(names: string[], max = 5): string {
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} und ${names.length - max} weitere`
}

export type BulkSummary = { done: number; skipped: number; failed: number }

export function summarize(results: BulkResultItem[]): BulkSummary {
  return {
    done: results.filter((r) => r.status === 'done').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  }
}

/** Ergebnis-Satz für den Toast, z. B. „5 gesperrt“ oder „5 von 8 gesperrt, 2 übersprungen, 1 fehlgeschlagen“ */
export function resultMessage(action: BulkAction, results: BulkResultItem[]): string {
  const { done, skipped, failed } = summarize(results)
  const word = BULK_ACTION_LABEL[action].done
  const parts: string[] = []
  parts.push(skipped === 0 && failed === 0 ? `${done} ${word}` : `${done} von ${results.length} ${word}`)
  if (skipped > 0) parts.push(`${skipped} übersprungen`)
  if (failed > 0) parts.push(`${failed} fehlgeschlagen`)
  return parts.join(', ')
}
