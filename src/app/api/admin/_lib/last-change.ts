import { createServiceClient } from '@/lib/supabase-server'

/** „Zuletzt geändert von <Name> am <Datum>“ (PROJ-127), aus dem Änderungsprotokoll */
export type LastChange = { by: string | null; at: string; action: string }

/**
 * Jüngster Protokolleintrag je Objekt. Liest mit dem Dienstschlüssel, gibt
 * aber nur Name, Zeitpunkt und Art zurück, nie Details. Fehler führen zu
 * einer leeren Liste: die Zeile „Zuletzt geändert“ entfällt dann.
 */
export async function lastChangesFor(objectType: string, objectIds: string[]): Promise<Map<string, LastChange>> {
  const result = new Map<string, LastChange>()
  if (objectIds.length === 0) return result
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('admin_audit_log')
      .select('object_id, admin_id, admin_name, action_type, created_at')
      .eq('object_type', objectType)
      .in('object_id', objectIds)
      .order('created_at', { ascending: false })
      .limit(Math.min(objectIds.length * 20, 5000))
    if (error) return result
    const rows = (data ?? []) as {
      object_id: string
      admin_id: string | null
      admin_name: string | null
      action_type: string
      created_at: string
    }[]
    const missingNames = new Set<string>()
    for (const r of rows) {
      if (result.has(r.object_id)) continue
      result.set(r.object_id, { by: r.admin_name, at: r.created_at, action: r.action_type })
      if (!r.admin_name && r.admin_id) missingNames.add(r.admin_id)
    }
    if (missingNames.size > 0) {
      // Ältere Einträge ohne gespeicherten Namen: aus dem Profil ergänzen
      const { data: profiles } = await service
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .in('id', [...missingNames])
      const names = new Map(
        ((profiles ?? []) as { id: string; first_name: string | null; last_name: string | null; display_name: string | null }[]).map(
          (p) => [p.id, [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ') || p.display_name || null]
        )
      )
      for (const r of rows) {
        const entry = result.get(r.object_id)
        if (entry && !entry.by && r.admin_id && entry.at === r.created_at) entry.by = names.get(r.admin_id) ?? null
      }
    }
  } catch {
    // ohne „Zuletzt geändert“ weiter
  }
  return result
}
