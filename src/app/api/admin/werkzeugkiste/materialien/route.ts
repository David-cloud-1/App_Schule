import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { SPEICHER_GRENZE_BYTES, type MaterialListe } from '@/lib/werkzeugkiste-materialien'
import {
  LISTEN_SPALTEN,
  leereSeiteSchema,
  listenAbfrageSchema,
  speicherPruefen,
  speicherGenutzt,
  suchbegriff,
  zeileZuMaterial,
  type ListenZeile,
} from '@/lib/werkzeugkiste-materialien-server'
import { EIGENE_SEITE } from '@/lib/werkzeugkiste'
import { grundgeruest } from '@/lib/werkzeugkiste-editor'
import { vermerkZuRegal, type RegalVermerkZeile } from '@/lib/werkzeugkiste-regal-server'
import { ABLAUF_TABELLE, ungueltig, fehler } from '@/lib/werkzeugkiste-server'

/**
 * GET /api/admin/werkzeugkiste/materialien (PROJ-52) — die eigenen Entwürfe
 * und Materialien als schmale Zeilen (nie Prompt oder Antwort), mit Suche,
 * Werkzeug-Filter und Seiten. Entwürfe (eingelesen, noch nicht fertig) stehen
 * zuerst, danach nach „zuletzt bearbeitet“. Abläufe, deren Skript noch nicht
 * eingelesen ist (abgebrochener Upload), erscheinen nicht.
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const params = new URL(request.url).searchParams
  const parsed = listenAbfrageSchema.safeParse({
    suche: params.get('suche') ?? undefined,
    werkzeug: params.get('werkzeug') || undefined,
    oeffentlich: params.get('oeffentlich') || undefined,
    seite: params.get('seite') ?? undefined,
    je: params.get('je') ?? undefined,
  })
  if (!parsed.success) return ungueltig(parsed.error)
  const { suche, werkzeug, seite, je, oeffentlich } = parsed.data

  // Zugriff regelt RLS (nur eigene Zeilen); owner_id zusätzlich, damit es auch ohne sie stimmt
  let abfrage = auth.supabase
    .from(ABLAUF_TABELLE)
    .select(LISTEN_SPALTEN, { count: 'exact' })
    .eq('owner_id', auth.user.id)
    .not('kennzahlen', 'is', null)

  if (werkzeug) abfrage = abfrage.eq('werkzeug', werkzeug)
  // „Nur öffentliche“ (PROJ-67): zuerst die eigenen aktiven Links, dann nur diese Materialien
  if (oeffentlich) {
    const { data: aktive } = await auth.supabase.from('werkzeug_links').select('ablauf_id').is('abgeschaltet_am', null)
    const ids = ((Array.isArray(aktive) ? aktive : []) as { ablauf_id: string }[]).map((l) => l.ablauf_id)
    if (ids.length === 0) {
      const leer: MaterialListe = {
        eintraege: [],
        gesamt: 0,
        hatMehr: false,
        speicher: { genutztBytes: (await speicherGenutzt(auth.supabase)) ?? 0, grenzeBytes: SPEICHER_GRENZE_BYTES },
      }
      return NextResponse.json(leer)
    }
    abfrage = abfrage.in('id', ids)
  }
  const begriff = suchbegriff(suche)
  if (begriff) abfrage = abfrage.or(`titel.ilike.%${begriff}%,datei_name.ilike.%${begriff}%`)

  const von = (seite - 1) * je
  const { data, count, error } = await abfrage
    // 'laeuft' (Entwurf) sortiert absteigend vor 'fertig'
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(von, von + je - 1)
  if (error) return fehler('Die Liste konnte gerade nicht geladen werden.', 500)

  const eintraege = ((data ?? []) as unknown as ListenZeile[]).map(zeileZuMaterial)

  // Freigaben fürs Regal (PROJ-53): nur die eigenen, mit den Zählern der Personen und Bereiche
  const materialIds = eintraege.filter((e) => e.art === 'material').map((e) => e.id)
  if (materialIds.length > 0) {
    const { data: freigaben } = await auth.supabase
      .from('regal_freigaben')
      .select('ablauf_id, stufe, entnommen_am, regal_freigabe_personen(count), regal_freigabe_bereiche(count)')
      .in('ablauf_id', materialIds)
    const nachId = new Map<string, RegalVermerkZeile>()
    for (const f of (Array.isArray(freigaben) ? freigaben : []) as unknown as RegalVermerkZeile[]) nachId.set(f.ablauf_id, f)
    for (const e of eintraege) {
      const f = nachId.get(e.id)
      if (f) e.regal = vermerkZuRegal(f)
    }
  }

  // Öffentliche Links (PROJ-67): nur die eigenen aktiven (RLS), ohne den Code selbst
  if (materialIds.length > 0) {
    const { data: links } = await auth.supabase
      .from('werkzeug_links')
      .select('ablauf_id, aufrufe')
      .in('ablauf_id', materialIds)
      .is('abgeschaltet_am', null)
    const nachId = new Map<string, number>()
    for (const l of (Array.isArray(links) ? links : []) as { ablauf_id: string; aufrufe: number | string }[]) {
      nachId.set(l.ablauf_id, Number(l.aufrufe) || 0)
    }
    for (const e of eintraege) {
      const aufrufe = nachId.get(e.id)
      if (aufrufe !== undefined) e.oeffentlich = { aufrufe }
    }
  }
  const gesamt = count ?? eintraege.length
  const antwort: MaterialListe = {
    eintraege,
    gesamt,
    hatMehr: von + eintraege.length < gesamt,
    speicher: { genutztBytes: (await speicherGenutzt(auth.supabase)) ?? 0, grenzeBytes: SPEICHER_GRENZE_BYTES },
  }
  return NextResponse.json(antwort)
}

/**
 * POST /api/admin/werkzeugkiste/materialien (PROJ-94) — „Leere Seite anlegen“:
 * eine Interaktive Seite ohne Skript und ohne KI, mit Grundgerüst als Entwurf.
 * Das Material ist sofort „fertig“ (damit läuft es nie ab, E4), hat aber keine
 * veröffentlichte Fassung: weder Antwort noch Ergebnis noch Datei. Rolle und
 * Besitz regelt RLS; die Speichergrenze wird vorher geprüft (PROJ-52).
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const eingabe = leereSeiteSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)

  const voll = await speicherPruefen(auth.supabase)
  if (voll) return voll

  const jetzt = new Date().toISOString()
  const { data, error } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .insert({
      owner_id: auth.user.id,
      werkzeug: EIGENE_SEITE,
      status: 'fertig',
      schritt: 5,
      titel: eingabe.data.titel,
      einstellungen: { format: 'seite' },
      entwurf: grundgeruest(eingabe.data.titel, eingabe.data.untertitel),
      entwurf_am: jetzt,
    })
    .select('id')
    .single()
  if (error || !data) return fehler('Die Seite konnte nicht angelegt werden.', 500)
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
