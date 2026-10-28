import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  fehler,
  frischStempel,
  MAX_OFFENE_ABLAEUFE,
  neuerAblaufSchema,
  schreibAdresse,
  skriptPfad,
  ungueltig,
  vorbelegung,
  zeileZuAblauf,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'

/**
 * POST /api/admin/werkzeugkiste/ablaeufe — neuer Ablauf (PROJ-51).
 * Legt die Zeile an (Einstellungen aus dem letzten eigenen Ablauf vorbelegt)
 * und gibt eine einmalige Adresse zurück, unter der der Browser das Skript
 * direkt in den Speicher lädt — nicht durch die App (4,5-MB-Grenze).
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = neuerAblaufSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  const { werkzeug, datei } = parsed.data

  const { count } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
  if ((count ?? 0) >= MAX_OFFENE_ABLAEUFE) {
    return fehler('Du hast gerade sehr viele offene Abläufe. Schließe ältere ab oder brich sie ab.', 429)
  }

  const { data: letzter } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .select('einstellungen')
    .eq('owner_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .insert({
      owner_id: auth.user.id,
      werkzeug,
      datei_name: datei.name,
      datei_groesse: datei.groesse,
      datei_typ: datei.typ || null,
      einstellungen: vorbelegung(werkzeug, (letzter as { einstellungen?: never } | null)?.einstellungen),
      ...frischStempel(),
    })
    .select(ABLAUF_SPALTEN)
    .single()
  if (error || !data) return fehler('Der Ablauf konnte nicht angelegt werden.', 500)

  const zeile = data as AblaufZeile
  const upload = await schreibAdresse(createServiceClient(), skriptPfad(zeile.owner_id, zeile.id, datei.name))
  if (!upload) {
    await auth.supabase.from(ABLAUF_TABELLE).delete().eq('id', zeile.id)
    return fehler('Das Hochladen konnte nicht vorbereitet werden. Bitte versuche es erneut.', 502)
  }

  return NextResponse.json({ ablauf: zeileZuAblauf(zeile), upload }, { status: 201 })
}
