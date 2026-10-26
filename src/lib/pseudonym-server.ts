import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Stellt sicher, dass ein Konto ein Pseudonym hat (PROJ-44). Lehrer-Rollen
 * erscheinen in der Rangliste ausschließlich unter Pseudonym; neue Konten
 * bekommen eines beim Anlegen, ältere Konten ggf. nicht.
 *
 * Erwartet einen Service-Client. Fehler werden nur protokolliert – ein
 * fehlendes Pseudonym verhindert nie den Rollenwechsel, die Rangliste zeigt
 * dann einen neutralen Namen statt des Klarnamens.
 */
export async function ensurePseudonym(service: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data: profile } = await service
      .from('profiles')
      .select('pseudonym, department_id')
      .eq('id', userId)
      .maybeSingle()
    const row = profile as { pseudonym: string | null; department_id: string | null } | null
    if (!row || (row.pseudonym && row.pseudonym.trim() !== '')) return

    const { data: pseudonym, error } = await service.rpc('generate_unique_pseudonym', {
      p_department_id: row.department_id,
    })
    if (error || typeof pseudonym !== 'string') {
      console.error('[ensurePseudonym] generate', error?.message)
      return
    }
    await service.from('profiles').update({ pseudonym }).eq('id', userId)
  } catch (err) {
    console.error('[ensurePseudonym]', err)
  }
}
