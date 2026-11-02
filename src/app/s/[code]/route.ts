import { after } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { ausgabePfad, leseAdresse } from '@/lib/werkzeugkiste-server'
import { codeSchema, linkBremse, nichtAktivSeite, OEFFENTLICH_KOPF } from '@/lib/werkzeugkiste-links-server'

type Kontext = { params: Promise<{ code: string }> }

/**
 * GET /s/:code (PROJ-67) — die fertige Interaktive Seite für Menschen ohne
 * Konto. Öffentlich (die Anmelde-Schranke lässt `/s/` durch). Ungültige,
 * abgeschaltete und fehlende Links sehen alle gleich aus (404), damit niemand
 * herausfinden kann, ob es einen Code je gab.
 *
 * Die Seite enthält Text aus einer KI-Antwort und braucht Skripte. Sie läuft
 * deshalb in einer Sandbox ohne eigene Herkunft (siehe `OEFFENTLICH_CSP`) und
 * erreicht nichts von der App. Der Inhalt wird aus dem Speicher durchgereicht
 * (Datenstrom), damit auch Seiten über 4,5 MB gehen. Kein Zwischenspeicher:
 * Abschalten wirkt sofort und der Zähler stimmt.
 */
export async function GET(request: Request, { params }: Kontext) {
  const code = (await params).code
  if (!codeSchema.safeParse(code).success) return nichtAktivSeite()

  const quelle = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unbekannt'
  if (!linkBremse(quelle, code)) {
    return new Response('Gerade zu viele Zugriffe. Bitte gleich noch einmal versuchen.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    })
  }

  const service = createServiceClient()
  const { data, error } = await service.rpc('link_nachschlagen', { p_code: code })
  if (error) return nichtAktivSeite()
  const zeile = (Array.isArray(data) ? data[0] : null) as { ablauf_id: string; owner_id: string } | null
  if (!zeile) return nichtAktivSeite()

  const adresse = await leseAdresse(service, ausgabePfad(zeile.owner_id, zeile.ablauf_id))
  if (!adresse) return nichtAktivSeite()
  const datei = await fetch(adresse, { cache: 'no-store' }).catch(() => null)
  if (!datei || !datei.ok || !datei.body) return nichtAktivSeite()

  // Nur Zähler und Zeitpunkt, nichts über die Besucher
  after(async () => {
    await service.rpc('link_aufruf_zaehlen', { p_code: code })
  })
  return new Response(datei.body, { status: 200, headers: OEFFENTLICH_KOPF })
}
