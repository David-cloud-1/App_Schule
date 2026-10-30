import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { Ablauf } from '@/lib/werkzeugkiste'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  fehler,
  frischStempel,
  aktualisiere,
  einlesungPfad,
  kern,
  kernFehlerAntwort,
  loescheDateien,
  MAX_OFFENE_ABLAEUFE,
  neuerAblaufSchema,
  neuesVideoSchema,
  schreibAdresse,
  skriptPfad,
  ungueltig,
  vorbelegung,
  zeileZuAblauf,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'
import { aktualisiereSpeicher, speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'

export const maxDuration = 120

/**
 * POST /api/admin/werkzeugkiste/ablaeufe — neuer Ablauf (PROJ-51).
 * Bei Video-Fragen (PROJ-54, Paket D) kommen Transkript und Link statt einer
 * Datei; der Kern legt das Transkript gleich als Einlesung ab.
 * Legt die Zeile an (Einstellungen aus dem letzten eigenen Ablauf vorbelegt)
 * und gibt eine einmalige Adresse zurück, unter der der Browser das Skript
 * direkt in den Speicher lädt — nicht durch die App (4,5-MB-Grenze).
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const istVideo = !!body && typeof body === 'object' && 'video' in body
  const videoParsed = istVideo ? neuesVideoSchema.safeParse(body) : null
  if (videoParsed && !videoParsed.success) return ungueltig(videoParsed.error)
  const parsed = videoParsed ? null : neuerAblaufSchema.safeParse(body)
  if (parsed && !parsed.success) return ungueltig(parsed.error)
  const werkzeug = videoParsed?.data?.werkzeug ?? parsed!.data!.werkzeug

  // Gezählt werden nur Entwürfe: Fertige Materialien begrenzt der Speicher (PROJ-52)
  const { count } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .eq('status', 'laeuft')
  if ((count ?? 0) >= MAX_OFFENE_ABLAEUFE) {
    return fehler('Du hast gerade sehr viele offene Abläufe. Schließe ältere ab oder brich sie ab.', 429)
  }
  const voll = await speicherPruefen(auth.supabase)
  if (voll) return voll

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
      ...(parsed ? { datei_name: parsed.data!.datei.name, datei_groesse: parsed.data!.datei.groesse, datei_typ: parsed.data!.datei.typ || null } : {}),
      einstellungen: vorbelegung(werkzeug, (letzter as { einstellungen?: never } | null)?.einstellungen),
      ...frischStempel(),
    })
    .select(ABLAUF_SPALTEN)
    .single()
  if (error || !data) return fehler('Der Ablauf konnte nicht angelegt werden.', 500)

  const zeile = data as AblaufZeile

  if (videoParsed) {
    const { url, transkript } = videoParsed.data!.video
    const service = createServiceClient()
    const abbrechen = async () => {
      await loescheDateien(service, zeile.owner_id, zeile.id).catch(() => {})
      await auth.supabase.from(ABLAUF_TABELLE).delete().eq('id', zeile.id)
    }
    const ziel = await schreibAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
    if (!ziel) {
      await abbrechen()
      return fehler('Das Transkript konnte nicht abgelegt werden. Bitte versuche es erneut.', 502)
    }
    try {
      const r = await kern<{ zeichen: number }>('/api/einlesen-video', {
        transkript,
        url: url.trim(),
        einlesung_ziel: ziel,
      })
      const kennzahlen: NonNullable<Ablauf['kennzahlen']> = {
        seiten: 0,
        loesungen: 0,
        bilder: 0,
        tabellen: 0,
        zeichen: Number(r.zeichen) || transkript.trim().length,
        ...(url.trim() ? { videoUrl: url.trim() } : {}),
      }
      const neu = await aktualisiere(auth.supabase, zeile.id, { kennzahlen, gliederung: [], schritt: 1 })
      if (!neu) throw new Error('nicht gespeichert')
      await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
      return NextResponse.json({ ablauf: zeileZuAblauf(neu) }, { status: 201 })
    } catch (e) {
      await abbrechen()
      return e instanceof Error && e.message === 'nicht gespeichert'
        ? fehler('Das Ergebnis konnte nicht gespeichert werden.', 500)
        : kernFehlerAntwort(e)
    }
  }

  const datei = parsed!.data!.datei
  const upload = await schreibAdresse(createServiceClient(), skriptPfad(zeile.owner_id, zeile.id, datei.name))
  if (!upload) {
    await auth.supabase.from(ABLAUF_TABELLE).delete().eq('id', zeile.id)
    return fehler('Das Hochladen konnte nicht vorbereitet werden. Bitte versuche es erneut.', 502)
  }

  return NextResponse.json({ ablauf: zeileZuAblauf(zeile), upload }, { status: 201 })
}
