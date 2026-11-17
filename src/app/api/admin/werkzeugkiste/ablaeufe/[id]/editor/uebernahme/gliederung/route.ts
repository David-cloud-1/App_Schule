import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { ungueltig } from '@/lib/werkzeugkiste-server'
import { gliederungVon, type Gliederung } from '@/lib/werkzeugkiste-uebernahme'
import { ladeQuelle, quelleSchema, zielOderFehler } from '@/lib/werkzeugkiste-uebernahme-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * GET …/ablaeufe/:id/editor/uebernahme/gliederung?art=eigen|regal&id=… (PROJ-108) — Themen und
 * Blöcke einer Quelle für den Dialog „Aus Material übernehmen“: nur Titel, Typ und Kurzzeile, nie
 * ganze Inhalte. Nur lesend; die Sichtbarkeit prüft `ladeQuelle` (eigenes Material oder Datenbank-
 * funktion des Regals). Das Ziel (`:id`) muss ein eigenes, bearbeitbares Material sein.
 */
export async function GET(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const q = new URL(request.url).searchParams
  const ref = quelleSchema.safeParse({ art: q.get('art'), id: q.get('id') })
  if (!ref.success) return ungueltig(ref.error)

  const ziel = await zielOderFehler(auth.supabase, auth.user.id, (await params).id)
  if (!ziel.zeile) return ziel.antwort
  const geladen = await ladeQuelle(auth.supabase, auth.user.id, ref.data)
  if (!geladen.quelle) return geladen.antwort
  const k = geladen.quelle
  const antwort: Gliederung = {
    titel: k.titel,
    werkzeug: k.werkzeug,
    ...gliederungVon(k.struktur),
    ...(k.herkunft ? { herkunft: k.herkunft } : {}),
  }
  return NextResponse.json(antwort, { headers: { 'Cache-Control': 'no-store' } })
}
