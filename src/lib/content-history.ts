import type { SupabaseClient } from '@supabase/supabase-js'

export const CONTENT_TYPES = ['question', 'topic', 'subject', 'exam_question_set'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

/** Tabelle, in der ein Inhaltstyp liegt — für Papierkorb- und Konflikt-Checks. */
export const CONTENT_TABLE: Record<ContentType, string> = {
  question: 'questions',
  topic: 'topics',
  subject: 'subjects',
  exam_question_set: 'exam_question_sets',
}

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value)
}

/**
 * Bündelt Versionen, die eine Massenaktion soeben erzeugt hat, nachträglich
 * zu einem Vorgang (statt Session-Variablen über mehrere Anfragen hinweg zu
 * verlassen, die bei gepoolten Verbindungen nicht zuverlässig sind). Gibt
 * `null` zurück, wenn das Bündeln fehlschlägt — das darf die eigentliche
 * Aktion nie zum Scheitern bringen, die Einzel-Versionen bleiben so oder so
 * erhalten.
 */
export async function groupIntoBatch(
  supabase: SupabaseClient,
  contentType: ContentType,
  contentIds: string[],
  description: string
): Promise<string | null> {
  if (contentIds.length < 2) return null
  try {
    const { data, error } = await supabase.rpc('group_recent_versions_into_batch', {
      p_content_type: contentType,
      p_content_ids: contentIds,
      p_description: description,
    })
    if (error) {
      console.error('[groupIntoBatch]', error)
      return null
    }
    return data as string
  } catch (err) {
    console.error('[groupIntoBatch]', err)
    return null
  }
}

export type VersionConflict = {
  currentVersion: number
  changedByName: string | null
  changedAt: string
}

/**
 * Prüft vor dem Speichern, ob der Inhalt sich seit dem Laden schon
 * geändert hat (Edge Case: zwei Personen bearbeiten fast gleichzeitig).
 * `expectedVersion` fehlt → kein Konflikt-Check (Rückwärtskompatibilität
 * für Aufrufer, die die Zählnummer noch nicht mitschicken).
 */
export async function checkVersionConflict(
  supabase: SupabaseClient,
  contentType: ContentType,
  id: string,
  expectedVersion: number | undefined
): Promise<VersionConflict | null> {
  if (expectedVersion === undefined) return null

  const { data: current } = await supabase
    .from(CONTENT_TABLE[contentType])
    .select('version_number')
    .eq('id', id)
    .maybeSingle()

  const currentVersion = (current as { version_number?: number } | null)?.version_number
  if (currentVersion === undefined || currentVersion === expectedVersion) return null

  const { data: lastVersion } = await supabase
    .from('content_versions')
    .select('created_at, changed_by, changed_by_label, profiles:changed_by ( display_name )')
    .eq('content_type', contentType)
    .eq('content_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = lastVersion as {
    created_at?: string
    changed_by_label?: string | null
    profiles?: { display_name?: string | null } | null
  } | null

  return {
    currentVersion,
    changedByName: row?.profiles?.display_name ?? row?.changed_by_label ?? null,
    changedAt: row?.created_at ?? new Date().toISOString(),
  }
}
