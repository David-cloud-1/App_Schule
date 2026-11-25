/**
 * Erreichbarkeit der Links im Block „Einbetten“ (PROJ-109, nur Server).
 *
 * Es werden NUR Adressen geprüft, deren Anbieter auf der Liste steht (sonst könnte man den
 * Server benutzen, um beliebige oder interne Adressen abzufragen). Weiterleitungen werden
 * nicht verfolgt, der Inhalt wird nie gelesen. Eine Prüfung sperrt nichts: Sie liefert nur
 * Hinweise für die Prüfstelle.
 */
import { erkenneAnbieter, pruefeLink } from './werkzeugkiste-einbettung'
import type { EditorBefund } from './werkzeugkiste-editor'

export type Erreichbarkeit = 'ok' | 'nicht_erreichbar' | 'nicht_geprueft'

export const PRUEF_ZEIT_MS = 4000
export const PRUEF_MAX_LINKS = 10

type Abruf = (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'body'>>

/** Antwort einordnen: nur eindeutig „weg“ ist nicht erreichbar; Sperren gegen Programme zählen nicht */
function einordnen(status: number): Erreichbarkeit {
  if (status === 404 || status === 410) return 'nicht_erreichbar'
  if (status >= 500) return 'nicht_erreichbar'
  if (status === 401 || status === 403 || status === 429) return 'nicht_geprueft'
  return 'ok'
}

export async function pruefeErreichbar(roh: string, abruf: Abruf = fetch): Promise<Erreichbarkeit> {
  const p = pruefeLink(roh)
  if (!p.ok || !erkenneAnbieter(p.url)) return 'nicht_geprueft'
  try {
    const res = await abruf(p.url.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(PRUEF_ZEIT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (kompatibel; Linkpruefung)', accept: 'text/html' },
      cache: 'no-store',
    })
    // Der Inhalt interessiert nicht
    void res.body?.cancel().catch(() => {})
    return einordnen(res.status)
  } catch (e) {
    const name = (e as { name?: string })?.name
    // Zeitüberschreitung sagt nichts über den Link; ein Netzfehler (Name nicht gefunden) schon
    if (name === 'TimeoutError' || name === 'AbortError') return 'nicht_geprueft'
    return 'nicht_erreichbar'
  }
}

export interface Einbettung {
  url: string
  kapitel: number
  element: number
}

/** Alle Einbett-Blöcke mit Link im Entwurf (nur Kapitel, nicht das Abschlusskapitel) */
export function sammleEinbettungen(struktur: unknown): Einbettung[] {
  const kapitel = (struktur as { chapters?: unknown } | null)?.chapters
  if (!Array.isArray(kapitel)) return []
  const aus: Einbettung[] = []
  kapitel.forEach((k, ki) => {
    const el = (k as { elements?: unknown } | null)?.elements
    if (!Array.isArray(el)) return
    el.forEach((b, ei) => {
      const o = b as { type?: unknown; url?: unknown } | null
      if (o?.type === 'einbetten' && typeof o.url === 'string' && o.url.trim()) {
        aus.push({ url: o.url.trim(), kapitel: ki, element: ei })
      }
    })
  })
  return aus
}

/** Hinweise für die Prüfstelle zu Links, die nicht zu erreichen sind (nie ein Fehler, nie eine Sperre) */
export async function erreichbarkeitsBefunde(struktur: unknown, abruf?: Abruf): Promise<EditorBefund[]> {
  const liste = sammleEinbettungen(struktur).slice(0, PRUEF_MAX_LINKS)
  const ergebnisse = await Promise.all(liste.map((e) => pruefeErreichbar(e.url, abruf).catch((): Erreichbarkeit => 'nicht_geprueft')))
  const befunde: EditorBefund[] = []
  liste.forEach((e, i) => {
    if (ergebnisse[i] !== 'nicht_erreichbar') return
    const p = pruefeLink(e.url)
    const name = p.ok ? (erkenneAnbieter(p.url)?.name ?? p.url.hostname) : 'dem Anbieter'
    befunde.push({
      text: `Kapitel ${e.kapitel + 1} – Der Link zu ${name} scheint nicht zu funktionieren. Prüfe ihn im Browser.`,
      schwere: 'mittel',
      stellen: [{ kapitel: e.kapitel, element: e.element }],
    })
  })
  return befunde
}
