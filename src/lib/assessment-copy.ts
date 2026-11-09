import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSelectableQuestions, type PickerQuestion } from '@/lib/assessment-questions'
import { generateAccessCode } from '@/lib/graded-assessments'

export { MAX_TITLE_LENGTH, baseTitle, nextCopyTitle } from '@/lib/assessment-copy-title'

/** Ein Zeitfenster für Kopien: sieben Tage ab dem Kopieren, die Lehrkraft passt es an */
export const COPY_WINDOW_DAYS = 7

/** Zeitfenster einer Kopie (Datenbank verlangt Werte, Entwürfe starten erst durch „Öffnen“) */
export function copyWindow(now: Date): { opensAt: string; closesAt: string } {
  return {
    opensAt: now.toISOString(),
    closesAt: new Date(now.getTime() + COPY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  }
}

/** Escape für ilike-Muster (% und _ sind dort Platzhalter) */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Welche Entwurfsfragen sind für den Zielbereich nicht (mehr) verfügbar?
 * Gleiche Regel wie beim Speichern: aktiv, Multiple-Choice, Bereichs-Pool oder eigene Frage.
 */
export function splitUnavailable(
  ids: string[],
  selectable: Pick<PickerQuestion, 'id'>[],
): { available: string[]; unavailable: string[] } {
  const ok = new Set(selectable.map((q) => q.id))
  const available: string[] = []
  const unavailable: string[] = []
  for (const id of ids) (ok.has(id) ? available : unavailable).push(id)
  return { available, unavailable }
}

export async function findUnavailableIds(
  supabase: SupabaseClient,
  departmentId: string,
  ids: string[],
  ownerId: string | null,
): Promise<string[]> {
  if (ids.length === 0) return []
  const selectable = await fetchSelectableQuestions(supabase, departmentId, ownerId)
  return splitUnavailable(ids, selectable).unavailable
}

/** Eindeutiger Beitrittscode (wie beim Anlegen), null nach 30 Fehlversuchen */
export async function generateUniqueAccessCode(supabase: SupabaseClient): Promise<string | null> {
  for (let i = 0; i < 30; i++) {
    const candidate = generateAccessCode()
    const { data: existing } = await supabase
      .from('graded_assessments')
      .select('id')
      .eq('access_code', candidate)
      .maybeSingle()
    if (!existing) return candidate
  }
  return null
}
