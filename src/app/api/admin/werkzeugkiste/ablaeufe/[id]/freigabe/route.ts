import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { erzeugeAuszug, fehler, ladeEigenenAblauf, ungueltig } from '@/lib/werkzeugkiste-server'
import { istEigeneSeite } from '@/lib/werkzeugkiste-editor'
import { erstVeroeffentlichen } from '@/lib/werkzeugkiste-editor-server'
import { fehlerAusFunktion, freigabeSchema, lesenZuStand } from '@/lib/werkzeugkiste-regal-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const NICHT_GEFUNDEN = 'Dieses Material gibt es nicht mehr.'

/**
 * Freigabe eines eigenen Materials fürs Regal (PROJ-53). Nur die Besitzerin
 * oder der Besitzer, nur fertige Materialien.
 *
 *   GET     aktuellen Stand lesen (`freigabe: null` = „Nur ich“)
 *   PUT     teilen oder Sichtbarkeit ändern (Stufe, Fach, Notiz, Bereiche, Personen)
 *   DELETE  „Nur ich“: sofort aus dem Regal nehmen
 *
 * Alle Prüfungen (Besitz, Grenzen, wer wen auswählen darf) liegen in den
 * Datenbankfunktionen; hier wird nur die Eingabe geformt.
 */
async function eigenesMaterial(auth: Extract<Awaited<ReturnType<typeof requireTeacherOrAdmin>>, { error: null }>, id: string) {
  const zeile = await ladeEigenenAblauf(auth.supabase, id)
  return zeile && zeile.status === 'fertig' && zeile.owner_id === auth.user.id ? zeile : null
}

export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  if (!(await eigenesMaterial(auth, id))) return fehler(NICHT_GEFUNDEN, 404)

  const { data, error } = await auth.supabase.rpc('regal_freigabe_lesen', { p_ablauf_id: id })
  if (error) return fehlerAusFunktion(error)
  return NextResponse.json({ freigabe: lesenZuStand(data) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  const material = await eigenesMaterial(auth, id)
  if (!material) return fehler(NICHT_GEFUNDEN, 404)
  // PROJ-94: Eine nie veröffentlichte eigene Seite lässt sich nicht teilen
  const erst = erstVeroeffentlichen(material)
  if (erst) return erst

  const roh = await request.json().catch(() => null)
  const parsed = freigabeSchema.safeParse(roh)
  if (!parsed.success) return ungueltig(parsed.error)
  const { stufe, fachId, notiz, bereiche, personen } = parsed.data

  const { error } = await auth.supabase.rpc('regal_freigabe_setzen', {
    p_ablauf_id: id,
    p_stufe: stufe,
    p_fach_id: fachId ?? null,
    p_notiz: notiz ?? null,
    p_bereiche: bereiche ?? [],
    p_personen: personen ?? [],
  })
  if (error) return fehlerAusFunktion(error)

  // Ältere Materialien haben noch keinen Bilder-Auszug: beim ersten Teilen nachholen (best effort).
  // Ohne ihn lässt sich das Material herunterladen, aber nicht anpassen.
  if (!material.auszug_am && material.antwort) {
    await erzeugeAuszug(createServiceClient(), material.owner_id, material.id, material.antwort, undefined, istEigeneSeite(material.werkzeug))
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  if (!(await eigenesMaterial(auth, id))) return fehler(NICHT_GEFUNDEN, 404)

  const { error } = await auth.supabase.rpc('regal_freigabe_entfernen', { p_ablauf_id: id })
  if (error) return fehlerAusFunktion(error)
  return NextResponse.json({ ok: true })
}
