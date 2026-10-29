import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { DIREKT_ERSTELLEN_AKTIV } from '@/lib/werkzeugkiste'
import { RUECKFRAGE_AB_EUR, schaetze, TAGESLIMIT, euro } from '@/lib/werkzeugkiste-kosten'
import {
  aktualisiere,
  direktStartSchema,
  einstellungenFuerWechsel,
  fehler,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'
import {
  brichAb,
  GUTHABEN_SATZ,
  guthabenGesperrt,
  istAktiv,
  ladeKiEinstellungen,
  laeufeHeute,
  laufZuInfo,
  legeLaufAn,
  letzterLauf,
  merkeProbe,
  repariere,
  sperreFuer,
  stosseAn,
  teileFuer,
} from '@/lib/werkzeugkiste-direkt'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const TAGESLIMIT_SATZ = `Du hast heute schon ${TAGESLIMIT} Materialien direkt erstellt. Morgen geht es wieder – oder mach jetzt kostenlos mit deiner eigenen KI weiter.`

/**
 * GET /api/admin/werkzeugkiste/ablaeufe/:id/direkt (PROJ-64) — Stand der
 * direkten Erstellung: letzter Lauf (repariert dabei hängende Teile), Sperre
 * und Preise. Mit `?schaetzung=1` zusätzlich die Zeichen je Teil für die Schätzung.
 */
export async function GET(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)

  const service = createServiceClient()
  const url = new URL(request.url)
  try {
    const e = await ladeKiEinstellungen(service)
    let lauf = await letzterLauf(auth.supabase, zeile.id)
    if (lauf && istAktiv(lauf)) lauf = await repariere(service, url.origin, lauf)
    const sperre = await sperreFuer(service, auth.user.id, e)
    const teile =
      url.searchParams.get('schaetzung') === '1' && zeile.kennzahlen
        ? (await teileFuer(service, zeile, zeileZuAblauf(zeile).auswahl)).map((t) => t.zeichen)
        : null
    return NextResponse.json({
      lauf: lauf ? laufZuInfo(lauf) : null,
      sperre,
      preis: e.preis,
      usdEur: e.usdEur,
      teile,
    })
  } catch (err) {
    return kernFehlerAntwort(err)
  }
}

/**
 * POST …/direkt — startet „Direkt erstellen“. Ein Doppelklick startet nichts
 * Zweites (liefert den laufenden Lauf). Kostet es laut Schätzung mehr als
 * 2 €, braucht es `bestaetigt: true` (sonst 409 mit dem Betrag).
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  // Vorerst ausgeblendet — auch über die Schnittstelle startet kein bezahlter Lauf.
  // WERKZEUGKISTE_DIREKT=1 schaltet es zum Testen frei (z. B. in einer Vorschau).
  if (!DIREKT_ERSTELLEN_AKTIV && process.env.WERKZEUGKISTE_DIREKT !== '1') {
    return fehler('Die direkte Erstellung ist zurzeit nicht verfügbar. Nutze den kostenlosen Weg mit deiner eigenen KI.', 404)
  }
  const parsed = direktStartSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.kennzahlen) return fehler('Das Skript ist noch nicht eingelesen.', 400)
  if (!process.env.ANTHROPIC_API_KEY) return fehler('Die direkte Erstellung ist noch nicht eingerichtet.', 503)

  const service = createServiceClient()
  const origin = new URL(request.url).origin
  try {
    const laufend = await letzterLauf(auth.supabase, zeile.id)
    if (laufend && istAktiv(laufend)) return NextResponse.json({ lauf: laufZuInfo(laufend) })

    const e = await ladeKiEinstellungen(service)
    if (guthabenGesperrt(e)) return NextResponse.json({ error: GUTHABEN_SATZ, sperre: 'guthaben' }, { status: 403 })
    if ((await laeufeHeute(service, auth.user.id)) >= TAGESLIMIT)
      return NextResponse.json({ error: TAGESLIMIT_SATZ, sperre: 'tageslimit' }, { status: 429 })

    const teile = await teileFuer(service, zeile, zeileZuAblauf(zeile).auswahl)
    const schaetzung = schaetze(teile.map((t) => t.zeichen), e.preis, e.usdEur)
    if (schaetzung.eur >= RUECKFRAGE_AB_EUR && !parsed.data.bestaetigt) {
      return NextResponse.json(
        { error: `Das kostet ca. ${euro(schaetzung.eur)}. Trotzdem erstellen?`, schaetzungEur: schaetzung.eur },
        { status: 409 },
      )
    }

    const einstellungen = einstellungenFuerWechsel(parsed.data.werkzeug, parsed.data.einstellungen)
    const neu = await aktualisiere(auth.supabase, zeile.id, { werkzeug: parsed.data.werkzeug, einstellungen, weg: 'direkt', schritt: Math.max(zeile.schritt, 3) })
    if (!neu) return fehler('Die Einstellungen konnten nicht gespeichert werden.', 500)

    // Bei leerem Guthaben ist das hier der eine Probe-Lauf der Stunde
    if (e.guthabenLeerSeit) await merkeProbe(service)

    const angelegt = await legeLaufAn(service, neu, teile, e)
    if ('laufend' in angelegt) {
      const l = await letzterLauf(auth.supabase, zeile.id)
      return NextResponse.json({ lauf: l ? laufZuInfo(l) : null })
    }
    await Promise.all(angelegt.teilIds.map((id) => stosseAn(origin, 'teil', id)))
    return NextResponse.json({ lauf: laufZuInfo(angelegt.lauf) }, { status: 202 })
  } catch (err) {
    return kernFehlerAntwort(err)
  }
}

/** DELETE …/direkt — bricht den laufenden Lauf ab; bereits angefallene Kosten bleiben erfasst */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  const lauf = await letzterLauf(auth.supabase, zeile.id)
  if (!lauf) return fehler('Es läuft keine Erstellung.', 404)
  const neu = istAktiv(lauf) ? await brichAb(createServiceClient(), lauf.id) : lauf
  return NextResponse.json({ lauf: neu ? laufZuInfo(neu) : laufZuInfo(lauf) })
}
