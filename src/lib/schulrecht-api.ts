import type {
  Fall,
  FallSchritt,
  Fund,
  Fundstelle,
  FundstellenVerweis,
  SuchErgebnis,
  ThemenAntwort,
  VorschriftInhalt,
} from '@/lib/schulrecht'

/**
 * Aufrufe der Seite „Schulrecht“ aus dem Browser (PROJ-55). Alle Routen liegen
 * unter /api/admin/schulrecht und prüfen serverseitig die Lehrer-Rolle; den
 * Python-Kern spricht nur der Server an.
 *
 * Datenschutz (E4): Frage, Sachverhalt und Antwort gehen NUR im Nachrichtenkörper
 * (POST) über die Leitung, nie in der Adresse, und stehen in keinem Protokoll.
 *
 *   GET    /themen                    Chips (Start + weitere) und Rechtsquellen — darf gemerkt werden
 *   POST   /suche {frage, quellen?}   Fundstellen ohne KI — nie gemerkt
 *   POST   /aufwaermen                lädt das Einbettungsmodell vor (ohne Frage)
 *   GET    /vorschrift?kuerzel=       Inhaltsverzeichnis einer Rechtsquelle — darf gemerkt werden
 *   GET    /norm?kuerzel=&nr=         Wortlaut einer Norm — darf gemerkt werden
 *   POST   /erkennen {sachverhalt}    Personenbezüge mit Ersetzungsvorschlag (wird nicht gespeichert)
 *   POST   /faelle {sachverhalt, fundstellen, alleAbgelehnt}
 *                                     legt den Fall mit dem BESTÄTIGTEN Sachverhalt an (läuft nach 24 h ab)
 *   GET    /faelle/:id                Fall lesen (abgelaufene Fälle: 404)
 *   PATCH  /faelle/:id {schritt}      weitesten erreichten Schritt merken (nur erhöhen)
 *   DELETE /faelle/:id                Fall verwerfen
 *   POST   /faelle/:id/prompt         Kern baut den Prompt aus Sachverhalt + Fundstellen
 *   POST   /faelle/:id/pruefen {antwort}  speichert die Antwort, prüft erfundene Fundstellen
 *   POST   /faelle/:id/aktennotiz     Word-Datei (wird nicht abgelegt), Antwort: Datei
 */

export const SR_API = '/api/admin/schulrecht'

export class SchulrechtFehler extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly hinweis?: string,
  ) {
    super(message)
    this.name = 'SchulrechtFehler'
  }
}

const ALLGEMEINER_FEHLER = 'Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.'
const KEINE_VERBINDUNG = 'Keine Verbindung. Bitte prüfe dein Internet und versuche es erneut.'

async function sende(pfad: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${SR_API}${pfad}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    })
  } catch {
    throw new SchulrechtFehler(KEINE_VERBINDUNG, 0)
  }
  if (!res.ok) {
    const daten = (await res.json().catch(() => ({}))) as { error?: string; hint?: string }
    throw new SchulrechtFehler(daten.error || ALLGEMEINER_FEHLER, res.status, daten.hint)
  }
  return res
}

async function anfrage<T>(pfad: string, init?: RequestInit): Promise<T> {
  const res = await sende(pfad, init)
  return (await res.json().catch(() => ({}))) as T
}

function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export function ladeThemen() {
  return anfrage<ThemenAntwort>('/themen')
}

export function sucheFundstellen(frage: string, quellen?: string[]) {
  return anfrage<SuchErgebnis>('/suche', post({ frage, ...(quellen ? { quellen } : {}) }))
}

/** Hilft nur gegen die Wartezeit beim ersten Mal; Fehler sind egal */
export function waermeAuf() {
  return anfrage<{ ok: true }>('/aufwaermen', { method: 'POST' }).catch(() => undefined)
}

export function ladeVorschrift(kuerzel: string) {
  return anfrage<VorschriftInhalt>(`/vorschrift?kuerzel=${encodeURIComponent(kuerzel)}`)
}

export function ladeNorm(kuerzel: string, nr: string) {
  return anfrage<{ fundstelle: Fundstelle }>(`/norm?kuerzel=${encodeURIComponent(kuerzel)}&nr=${encodeURIComponent(nr)}`)
}

export function erkennePersonenbezuege(sachverhalt: string) {
  return anfrage<{ funde: Fund[] }>('/erkennen', post({ sachverhalt }))
}

export function legeFallAn(eingabe: { sachverhalt: string; fundstellen: FundstellenVerweis[]; alleAbgelehnt: boolean }) {
  return anfrage<{ fall: Fall }>('/faelle', post(eingabe))
}

export function ladeFall(id: string) {
  return anfrage<{ fall: Fall }>(`/faelle/${encodeURIComponent(id)}`)
}

export function verwirfFall(id: string) {
  return anfrage<{ ok: true }>(`/faelle/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function speichereFallSchritt(id: string, schritt: FallSchritt) {
  return anfrage<{ fall: Fall }>(`/faelle/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ schritt }),
  })
}

export function erstelleFallPrompt(id: string) {
  return anfrage<{ fall: Fall }>(`/faelle/${encodeURIComponent(id)}/prompt`, { method: 'POST' })
}

export function pruefeFallAntwort(id: string, antwort: string) {
  return anfrage<{ fall: Fall }>(`/faelle/${encodeURIComponent(id)}/pruefen`, post({ antwort }))
}

/** Holt die Word-Datei als Blob; sie wird nirgends abgelegt */
export async function ladeAktennotiz(id: string): Promise<{ blob: Blob; dateiname: string }> {
  const res = await sende(`/faelle/${encodeURIComponent(id)}/aktennotiz`, { method: 'POST' })
  const kopf = res.headers.get('Content-Disposition') ?? ''
  const treffer = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(kopf)
  let dateiname = 'Aktennotiz.docx'
  if (treffer) {
    try {
      dateiname = decodeURIComponent(treffer[1])
    } catch {
      dateiname = treffer[1]
    }
  }
  return { blob: await res.blob(), dateiname }
}
