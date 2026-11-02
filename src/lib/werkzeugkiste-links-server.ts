import { z } from 'zod'
import { LINK_CODE_MUSTER, type LinkAdminZeile, type LinkStand } from '@/lib/werkzeugkiste-links'

/**
 * Server-Seite des öffentlichen Links (PROJ-67): Umwandlung der Zeilen aus den
 * Datenbankfunktionen, Mengenbremse und die Kopfzeilen der öffentlichen Seite.
 * Wer was darf, entscheidet die Datenbank; hier steht keine zweite Regel.
 */

export const codeSchema = z.string().regex(LINK_CODE_MUSTER)
export const idSchema = z.string().uuid()

/** Zeile aus link_lesen / link_erzeugen (JSON) */
export function linkZuStand(roh: unknown): LinkStand | null {
  if (!roh || typeof roh !== 'object') return null
  const r = roh as Record<string, unknown>
  if (typeof r.code !== 'string' || !LINK_CODE_MUSTER.test(r.code)) return null
  return {
    code: r.code,
    erzeugtAm: typeof r.erzeugtAm === 'string' ? r.erzeugtAm : '',
    aufrufe: Number(r.aufrufe) || 0,
    letzterAufruf: typeof r.letzterAufruf === 'string' ? r.letzterAufruf : null,
  }
}

export interface LinkAdminRoh {
  link_id: string
  titel: string
  werkzeug: string
  besitzer_name: string
  erzeugt_am: string
  aufrufe: number | string
  letzter_aufruf: string | null
  gesamt: number | string
}

export function linkAdminZeile(z: LinkAdminRoh): LinkAdminZeile {
  return {
    id: z.link_id,
    titel: z.titel,
    werkzeug: z.werkzeug,
    besitzerName: z.besitzer_name,
    erzeugtAm: z.erzeugt_am,
    aufrufe: Number(z.aufrufe) || 0,
    letzterAufruf: z.letzter_aufruf,
  }
}

// ── Öffentliche Auslieferung ───────────────────────────────────────────────

/**
 * Die Seite enthält Text aus einer KI-Antwort und braucht Skripte. Deshalb:
 * Sandbox OHNE `allow-same-origin` — die Seite bekommt eine fremde Herkunft und
 * erreicht weder Cookies noch Speicher noch Schnittstellen der App. Erlaubt
 * sind nur Skripte (Aufgaben) und Dialoge (Drucken, „Eingaben löschen?“).
 * Keine Verbindung ins Netz, keine Formulare, nur eingebettete Bilder.
 */
export const OEFFENTLICH_CSP = [
  'sandbox allow-scripts allow-modals',
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data:',
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ')

export const OEFFENTLICH_KOPF: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': OEFFENTLICH_CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
}

/** Ruhige Seite für ungültige, abgeschaltete und fehlende Links (immer gleich, immer 404) */
export function nichtAktivSeite(): Response {
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Link nicht aktiv</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#111827;color:#f9fafb}
main{max-width:28rem;padding:1.5rem;text-align:center}
h1{font-size:1.25rem;margin:0 0 .5rem}
p{margin:0;color:#9ca3af}
@media (prefers-color-scheme:light){body{background:#f4f5f7;color:#111827}p{color:#4b5563}}
</style></head>
<body><main><h1>Dieser Link ist nicht mehr aktiv.</h1><p>Das Material wurde abgeschaltet oder gibt es nicht mehr.</p></main></body></html>`
  return new Response(html, {
    status: 404,
    headers: {
      ...OEFFENTLICH_KOPF,
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'none'",
    },
  })
}

// ── Mengenbremse ───────────────────────────────────────────────────────────

/**
 * Einfache Mengenbremse (wie PROJ-55): Der Zähler liegt im Speicher der
 * Server-Instanz und hält nur Zeitpunkte, keine Besucherdaten über die Minute
 * hinaus. Sie bremst Durchprobieren und Ansturm, ersetzt aber kein verteiltes Limit.
 */
export const LINK_PRO_MINUTE_UND_QUELLE = 120
export const LINK_PRO_MINUTE_UND_CODE = 60
const FENSTER_MS = 60_000
const zeitpunkte = new Map<string, number[]>()

function zaehle(schluessel: string, grenze: number, jetzt: number): boolean {
  const frisch = (zeitpunkte.get(schluessel) ?? []).filter((t) => jetzt - t < FENSTER_MS)
  if (frisch.length >= grenze) {
    zeitpunkte.set(schluessel, frisch)
    return false
  }
  frisch.push(jetzt)
  zeitpunkte.set(schluessel, frisch)
  return true
}

/** `true`, wenn der Aufruf durchgehen darf */
export function linkBremse(quelle: string, code: string, jetzt = Date.now()): boolean {
  const ok = zaehle(`q:${quelle}`, LINK_PRO_MINUTE_UND_QUELLE, jetzt) && zaehle(`c:${code}:${quelle}`, LINK_PRO_MINUTE_UND_CODE, jetzt)
  if (zeitpunkte.size > 5000) {
    for (const [k, v] of zeitpunkte) if (v.every((t) => jetzt - t >= FENSTER_MS)) zeitpunkte.delete(k)
  }
  return ok
}

export function linkBremseZuruecksetzen() {
  zeitpunkte.clear()
}
