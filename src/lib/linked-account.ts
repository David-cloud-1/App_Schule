import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verknüpftes Zweitkonto des Super-Admins (PROJ-29): ein normales Azubi-Konto
 * im Bereich Tourismus, erreichbar nur über den serverseitigen Sitzungswechsel.
 */

/** Bereichs-Code, in dem das Zweitkonto angelegt wird */
export const LINKED_DEPARTMENT_CODE = 'TOUR'

/** Platzhalter-Adressen enden auf .invalid — garantiert unzustellbar (RFC 2606) */
const LINKED_EMAIL_DOMAIN = 'linked.invalid'

export type SwitchTarget = 'main' | 'linked'

export interface LinkContext {
  /** Hauptkonto des Paars (bei Hauptkonto: das eigene) */
  mainUserId: string
  /** Welches Konto der Aufrufer gerade ist */
  current: SwitchTarget
}

interface ProfileLinkRow {
  role: string
  linked_main_user_id: string | null
}

/**
 * Prüft, ob dieses Konto den Umschalter nutzen darf: Super-Admin (Hauptkonto)
 * oder dessen Zweitkonto. Alle anderen → null. Beim Zweitkonto zählt nur, wenn
 * das Hauptkonto noch Super-Admin ist.
 */
export async function getLinkContext(service: SupabaseClient, userId: string): Promise<LinkContext | null> {
  const { data, error } = await service
    .from('profiles')
    .select('role, linked_main_user_id')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  const profile = data as ProfileLinkRow

  if (profile.linked_main_user_id) {
    const { data: main } = await service
      .from('profiles')
      .select('role')
      .eq('id', profile.linked_main_user_id)
      .maybeSingle()
    if ((main as { role: string } | null)?.role !== 'admin') return null
    return { mainUserId: profile.linked_main_user_id, current: 'linked' }
  }

  if (profile.role === 'admin') return { mainUserId: userId, current: 'main' }
  return null
}

/** ID des Zweitkontos zu einem Hauptkonto — oder null, falls noch keines existiert */
export async function findLinkedUserId(service: SupabaseClient, mainUserId: string): Promise<string | null> {
  const { data, error } = await service
    .from('profiles')
    .select('id')
    .eq('linked_main_user_id', mainUserId)
    .maybeSingle()
  if (error) throw new Error(`Zweitkonto konnte nicht gesucht werden: ${error.message}`)
  return (data as { id: string } | null)?.id ?? null
}

/**
 * Legt das Zweitkonto an, falls es fehlt, und gibt dessen ID zurück.
 * Reihenfolge: Konto anlegen → Profil verknüpfen. Scheitert die Verknüpfung
 * (z. B. paralleler Aufruf hat schneller verknüpft), wird das überzählige Konto
 * wieder gelöscht und das vorhandene zurückgegeben.
 */
export async function ensureLinkedUser(service: SupabaseClient, mainUserId: string): Promise<string> {
  const existing = await findLinkedUserId(service, mainUserId)
  if (existing) return existing

  const { data: department, error: deptErr } = await service
    .from('departments')
    .select('id')
    .eq('code', LINKED_DEPARTMENT_CODE)
    .eq('is_active', true)
    .maybeSingle()
  if (deptErr || !department) throw new Error('Bereich für das Zweitkonto nicht gefunden')
  const departmentId = (department as { id: string }).id

  // Kein Passwort: Anmeldung ist nur über den Sitzungswechsel möglich
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: `tourismus-${randomUUID()}@${LINKED_EMAIL_DOMAIN}`,
    email_confirm: true,
    user_metadata: { full_name: 'Tourismus-Testkonto' },
  })
  if (createErr || !created?.user) {
    throw new Error(`Zweitkonto konnte nicht angelegt werden: ${createErr?.message ?? 'unbekannt'}`)
  }
  const linkedId = created.user.id

  // Pseudonym passend zum Bereich (das Profil entsteht per Datenbank-Trigger)
  const { data: pseudonym } = await service.rpc('generate_unique_pseudonym', { p_department_id: departmentId })

  const { error: linkErr } = await service
    .from('profiles')
    .update({
      role: 'student',
      department_id: departmentId,
      linked_main_user_id: mainUserId,
      leaderboard_opt_out: true,
      display_name: 'Tourismus-Testkonto',
      ...(typeof pseudonym === 'string' ? { pseudonym } : {}),
    })
    .eq('id', linkedId)

  if (linkErr) {
    // Überzähliges Konto aufräumen; bei Wettlauf gewinnt das schon verknüpfte
    await service.auth.admin.deleteUser(linkedId).catch((err: unknown) => {
      console.error('[ensureLinkedUser] cleanup', err)
    })
    const winner = await findLinkedUserId(service, mainUserId)
    if (winner) return winner
    throw new Error(`Zweitkonto konnte nicht verknüpft werden: ${linkErr.message}`)
  }

  return linkedId
}
