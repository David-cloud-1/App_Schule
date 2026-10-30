import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { SPEICHER_GRENZE_BYTES, type MaterialListe } from '@/lib/werkzeugkiste-materialien'
import {
  LISTEN_SPALTEN,
  listenAbfrageSchema,
  speicherGenutzt,
  suchbegriff,
  zeileZuMaterial,
  type ListenZeile,
} from '@/lib/werkzeugkiste-materialien-server'
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
    seite: params.get('seite') ?? undefined,
    je: params.get('je') ?? undefined,
  })
  if (!parsed.success) return ungueltig(parsed.error)
  const { suche, werkzeug, seite, je } = parsed.data

  // Zugriff regelt RLS (nur eigene Zeilen); owner_id zusätzlich, damit es auch ohne sie stimmt
  let abfrage = auth.supabase
    .from(ABLAUF_TABELLE)
    .select(LISTEN_SPALTEN, { count: 'exact' })
    .eq('owner_id', auth.user.id)
    .not('kennzahlen', 'is', null)

  if (werkzeug) abfrage = abfrage.eq('werkzeug', werkzeug)
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
  const gesamt = count ?? eintraege.length
  const antwort: MaterialListe = {
    eintraege,
    gesamt,
    hatMehr: von + eintraege.length < gesamt,
    speicher: { genutztBytes: (await speicherGenutzt(auth.supabase)) ?? 0, grenzeBytes: SPEICHER_GRENZE_BYTES },
  }
  return NextResponse.json(antwort)
}
