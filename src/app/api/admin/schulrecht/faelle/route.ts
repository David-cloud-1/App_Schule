import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'
import { FALL_SPALTEN, FALL_TABELLE, MAX_OFFENE_FAELLE, neuerFallSchema, ohneZwischenspeicher, zeileZuFall, type FallZeile } from '@/lib/schulrecht-server'

export const maxDuration = 30

/**
 * POST /api/admin/schulrecht/faelle (PROJ-55) — legt den Aktennotiz-Fall mit dem
 * BESTÄTIGTEN, anonymisierten Sachverhalt an. Er läuft 24 Stunden nach der
 * letzten Bearbeitung ab. Der Originaltext kommt hier nie an.
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = neuerFallSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  // Abgelaufene Fälle zuerst wegräumen (die Zeilenregel zeigt sie ohnehin nicht mehr; stündlich räumt pg_cron auf)
  await createServiceClient().from(FALL_TABELLE).delete().lt('laeuft_ab_am', new Date().toISOString())

  const { count } = await auth.supabase.from(FALL_TABELLE).select('id', { count: 'exact', head: true }).eq('owner_id', auth.user.id)
  if ((count ?? 0) >= MAX_OFFENE_FAELLE) {
    return fehler('Du hast schon sehr viele offene Fälle.', 429, 'Schließe einen Fall ab oder verwirf ihn, dann geht es weiter.')
  }

  const { data, error } = await auth.supabase
    .from(FALL_TABELLE)
    .insert({
      owner_id: auth.user.id,
      sachverhalt: parsed.data.sachverhalt,
      fundstellen: parsed.data.fundstellen,
      alle_abgelehnt: parsed.data.alleAbgelehnt,
    })
    .select(FALL_SPALTEN)
    .single()
  if (error || !data) return fehler('Der Fall konnte nicht angelegt werden.', 500)
  return ohneZwischenspeicher(NextResponse.json({ fall: zeileZuFall(data as FallZeile) }, { status: 201 }))
}
