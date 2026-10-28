import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { schrittErlaubt, type AblaufSchritt } from '@/lib/werkzeugkiste'
import {
  ABLAUF_TABELLE,
  ablaufAenderungSchema,
  aktualisiere,
  einstellungenFuerWechsel,
  fehler,
  ladeEigenenAblauf,
  loescheDateien,
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

const NICHT_DA = 'Diesen Ablauf gibt es nicht mehr.'

/** GET /api/admin/werkzeugkiste/ablaeufe/:id — eigenen Ablauf lesen (PROJ-51) */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler(NICHT_DA, 404)
  return NextResponse.json({ ablauf: zeileZuAblauf(zeile) })
}

/**
 * PATCH /api/admin/werkzeugkiste/ablaeufe/:id — Werkzeug, Einstellungen,
 * Auswahl oder erreichten Schritt speichern. Der Schritt steigt nur und nur
 * so weit, wie der Ablauf vorbereitet ist.
 */
export async function PATCH(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = ablaufAenderungSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler(NICHT_DA, 404)

  const { werkzeug, einstellungen, auswahl, schritt } = parsed.data
  const felder: Record<string, unknown> = {}
  if (werkzeug) felder.werkzeug = werkzeug
  if (einstellungen) felder.einstellungen = einstellungenFuerWechsel(werkzeug ?? zeile.werkzeug, einstellungen)
  else if (werkzeug && werkzeug !== zeile.werkzeug) {
    felder.einstellungen = einstellungenFuerWechsel(werkzeug, { ...zeileZuAblauf(zeile).einstellungen, format: '' })
  }
  if (auswahl) felder.auswahl = auswahl
  if (schritt && schritt > zeile.schritt && schrittErlaubt(zeileZuAblauf(zeile), schritt as AblaufSchritt)) {
    felder.schritt = schritt
  }

  const neu = await aktualisiere(auth.supabase, zeile.id, felder)
  if (!neu) return fehler('Die Änderung konnte nicht gespeichert werden.', 500)
  return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
}

/** DELETE /api/admin/werkzeugkiste/ablaeufe/:id — abbrechen, samt aller Dateien */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler(NICHT_DA, 404)

  await loescheDateien(createServiceClient(), zeile.owner_id, zeile.id)
  const { error } = await auth.supabase.from(ABLAUF_TABELLE).delete().eq('id', zeile.id)
  if (error) return fehler('Der Ablauf konnte nicht gelöscht werden.', 500)
  return NextResponse.json({ ok: true })
}
