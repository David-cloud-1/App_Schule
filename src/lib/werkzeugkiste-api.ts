import type { Ablauf, AblaufAuswahl, AblaufEinstellungen, DirektSperre, LaufInfo } from '@/lib/werkzeugkiste'
import type { ModellPreis } from '@/lib/werkzeugkiste-kosten'
import { SEITENGROESSE, type MaterialAbfrage, type MaterialListe } from '@/lib/werkzeugkiste-materialien'

/**
 * Aufrufe der Werkzeugkiste aus dem Browser (PROJ-51). Alle Routen liegen
 * unter /api/admin/werkzeugkiste und prüfen serverseitig die Lehrer-Rolle;
 * den Python-Kern spricht nur der Server an.
 *
 *   GET    /optionen                       Auswahllisten (Niveaus, Bildungsgänge, Lernfelder, Umfang)
 *   POST   /ablaeufe                       neuer Ablauf + einmalige Hochlade-Adresse
 *   GET    /ablaeufe/:id                   Ablauf lesen
 *   PATCH  /ablaeufe/:id                   Werkzeug, Einstellungen, Auswahl, Schritt speichern
 *   DELETE /ablaeufe/:id                   Ablauf abbrechen (samt Dateien)
 *   POST   /ablaeufe/:id/einlesen          nach dem Hochladen: Kern liest das Skript
 *   POST   /ablaeufe/:id/prompt            Kern baut den Prompt
 *   POST   /ablaeufe/:id/pruefen           Kern prüft die KI-Antwort (Prüfstelle)
 *   POST   /ablaeufe/:id/bauen             Kern baut die Datei
 *   GET/POST /ablaeufe/:id/kapitel         Kapitel der Antwort · Prompt nur für ein Kapitel (PROJ-52, Paket 2)
 *   POST   /ablaeufe/:id/kapitel/einsetzen KI-Antwort zu einem Kapitel einsetzen
 *   GET    /ablaeufe/:id/download          Weiterleitung auf einen kurzlebigen Download-Link
 *   GET    /ablaeufe/:id/vorschau          Vorschau als HTML (abgeschottet angezeigt)
 *
 * Meine Materialien (PROJ-52, Paket 1):
 *   GET    /materialien?suche=&werkzeug=&seite=   Liste der eigenen Materialien und Entwürfe (schmale Zeilen)
 *   PATCH  /ablaeufe/:id  {titel}          Material umbenennen
 *   POST   /ablaeufe/:id/kopie             „Gleiches Skript, anderes Werkzeug“: neuer Ablauf mit kopiertem Skript, bei Schritt 2
 *   GET    /ablaeufe/:id/antwort           gespeicherte KI-Antwort als .yaml
 */

export const WK_API = '/api/admin/werkzeugkiste'

export interface WerkzeugOption {
  key: string
  label: string
}

export interface WerkzeugOptionen {
  niveaus: WerkzeugOption[]
  bildungsgaenge: WerkzeugOption[]
  /** Lernfelder je Bildungsgang-Schlüssel */
  lernfelder: Record<string, WerkzeugOption[]>
  umfaenge: WerkzeugOption[]
}

export interface HochladeAuftrag {
  url: string
  method: 'PUT' | 'POST'
  headers: Record<string, string>
}

/** Fehler mit verständlicher Meldung aus der Schnittstelle */
export class WerkzeugFehler extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly hinweis?: string,
  ) {
    super(message)
    this.name = 'WerkzeugFehler'
  }
}

const ALLGEMEINER_FEHLER = 'Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.'

async function anfrage<T>(pfad: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${WK_API}${pfad}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    })
  } catch {
    throw new WerkzeugFehler('Keine Verbindung. Bitte prüfe dein Internet und versuche es erneut.', 0)
  }
  const daten = (await res.json().catch(() => ({}))) as { error?: string; hint?: string } & T
  if (!res.ok) throw new WerkzeugFehler(daten.error || ALLGEMEINER_FEHLER, res.status, daten.hint)
  return daten
}

export function ladeOptionen() {
  return anfrage<WerkzeugOptionen>('/optionen')
}

export function legeAblaufAn(werkzeug: string, datei: { name: string; groesse: number; typ: string }) {
  return anfrage<{ ablauf: Ablauf; upload: HochladeAuftrag }>('/ablaeufe', {
    method: 'POST',
    body: JSON.stringify({ werkzeug, datei }),
  })
}

/** Video-Fragen (PROJ-54, Paket D): Link und Transkript statt einer Datei; der Ablauf ist danach schon eingelesen */
export function legeVideoAblaufAn(werkzeug: string, video: { url: string; transkript: string }) {
  return anfrage<{ ablauf: Ablauf }>('/ablaeufe', {
    method: 'POST',
    body: JSON.stringify({ werkzeug, video }),
  })
}

export function ladeAblauf(id: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}`)
}

export function speichereAblauf(
  id: string,
  aenderung: Partial<{
    werkzeug: string
    einstellungen: AblaufEinstellungen
    auswahl: AblaufAuswahl
    schritt: number
    weg: 'direkt' | 'kostenlos'
  }>,
) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(aenderung),
  })
}

export function loescheAblauf(id: string) {
  return anfrage<{ ok: true }>(`/ablaeufe/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function lieseSkriptEin(id: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/einlesen`, { method: 'POST' })
}

/** `hinweis`: z. B. „Die Seitenangabe war nicht lesbar – ganzes Skript verwendet“ */
export function erstellePrompt(id: string) {
  return anfrage<{ ablauf: Ablauf; hinweis?: string | null }>(`/ablaeufe/${encodeURIComponent(id)}/prompt`, { method: 'POST' })
}

export function pruefeAntwort(id: string, antwort: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/pruefen`, {
    method: 'POST',
    body: JSON.stringify({ antwort }),
  })
}

/**
 * `stand`: Änderungszeitpunkt, den diese Seite gesehen hat (Zwei-Tabs-Regel, PROJ-52).
 * Antwortet der Server mit 409, wurde das Material inzwischen geändert; mit `ersetzen` gewinnt dann diese Fassung.
 */
export function baueMaterial(id: string, pruefung?: { stand: string; ersetzen?: boolean }) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/bauen`, {
    method: 'POST',
    ...(pruefung ? { body: JSON.stringify(pruefung) } : {}),
  })
}

// ── Überarbeiten (PROJ-52, Paket 2) ───────────────────────────────────────

export function ladeKapitel(id: string) {
  return anfrage<{ kapitel: string[] }>(`/ablaeufe/${encodeURIComponent(id)}/kapitel`)
}

export function erstelleKapitelPrompt(id: string, index: number, wunsch: string) {
  return anfrage<{ prompt: string; titel: string }>(`/ablaeufe/${encodeURIComponent(id)}/kapitel`, {
    method: 'POST',
    body: JSON.stringify({ index, wunsch }),
  })
}

export function setzeKapitelEin(id: string, index: number, antwort: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/kapitel/einsetzen`, {
    method: 'POST',
    body: JSON.stringify({ index, antwort }),
  })
}

// ── Direkt erstellen (PROJ-64) ────────────────────────────────────────────

export interface DirektStand {
  lauf: LaufInfo | null
  sperre: DirektSperre
  preis: ModellPreis
  usdEur: number
  /** Zeichen je Teil — nur mit `schaetzung` */
  teile: number[] | null
}

/** Stand der direkten Erstellung; repariert dabei hängende Teile. Für den Warte-Bildschirm alle paar Sekunden */
export function ladeDirektStand(id: string, schaetzung = false) {
  return anfrage<DirektStand>(`/ablaeufe/${encodeURIComponent(id)}/direkt${schaetzung ? '?schaetzung=1' : ''}`)
}

/**
 * Startet „Direkt erstellen“. Fehler mit Status 409 = teuer, Bestätigung nötig
 * (erneut mit `bestaetigt`); 403/429 = gesperrt (Guthaben bzw. Tageslimit).
 */
export function starteDirekt(id: string, werkzeug: string, einstellungen: AblaufEinstellungen, bestaetigt = false) {
  return anfrage<{ lauf: LaufInfo }>(`/ablaeufe/${encodeURIComponent(id)}/direkt`, {
    method: 'POST',
    body: JSON.stringify({ werkzeug, einstellungen, ...(bestaetigt ? { bestaetigt } : {}) }),
  })
}

export function brichDirektAb(id: string) {
  return anfrage<{ lauf: LaufInfo }>(`/ablaeufe/${encodeURIComponent(id)}/direkt`, { method: 'DELETE' })
}

// ── Meine Materialien (PROJ-52) ───────────────────────────────────────────

export function ladeMaterialien({ suche, werkzeug, seite }: MaterialAbfrage) {
  const params = new URLSearchParams({ seite: String(seite), je: String(SEITENGROESSE) })
  if (suche.trim()) params.set('suche', suche.trim())
  if (werkzeug) params.set('werkzeug', werkzeug)
  return anfrage<MaterialListe>(`/materialien?${params.toString()}`)
}

export function benenneMaterialUm(id: string, titel: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ titel }),
  })
}

/** Legt einen neuen Ablauf mit dem Skript des Materials an; das Material bleibt unberührt */
export function kopiereFuerAnderesWerkzeug(id: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/kopie`, { method: 'POST' })
}

export function antwortHref(id: string) {
  return `${WK_API}/ablaeufe/${encodeURIComponent(id)}/antwort`
}

export function downloadHref(id: string) {
  return `${WK_API}/ablaeufe/${encodeURIComponent(id)}/download`
}

/**
 * Fertige Datei laden (PROJ-52, BUG-1): erst prüfen, ob sie da ist, dann den
 * kurzlebigen Link öffnen. Fehlt sie, wirft das einen `WerkzeugFehler` mit ruhigem Satz.
 */
export async function ladeDatei(id: string): Promise<void> {
  const { url } = await anfrage<{ url: string }>(`/ablaeufe/${encodeURIComponent(id)}/download?pruefen=1`)
  window.location.assign(url)
}

export function vorschauHref(id: string) {
  return `${WK_API}/ablaeufe/${encodeURIComponent(id)}/vorschau`
}

/** Vorschau-HTML laden — angezeigt per srcdoc, weil die App iframes per X-Frame-Options sperrt */
export async function ladeVorschau(id: string): Promise<string> {
  const res = await fetch(vorschauHref(id)).catch(() => null)
  if (!res?.ok) throw new WerkzeugFehler('Die Vorschau konnte nicht geladen werden.', res?.status ?? 0)
  return res.text()
}

/**
 * Lädt die Datei direkt in den Speicher (nicht durch die App — so greift die
 * 4,5-MB-Grenze nicht) und meldet den Fortschritt in Prozent.
 */
export function ladeHoch(auftrag: HochladeAuftrag, datei: File, fortschritt: (prozent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(auftrag.method, auftrag.url)
    for (const [name, wert] of Object.entries(auftrag.headers)) xhr.setRequestHeader(name, wert)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) fortschritt(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        fortschritt(100)
        resolve()
      } else {
        reject(new WerkzeugFehler('Das Hochladen hat nicht geklappt. Bitte versuche es erneut.', xhr.status))
      }
    }
    xhr.onerror = () =>
      reject(new WerkzeugFehler('Das Hochladen wurde unterbrochen. Bitte prüfe dein Internet und versuche es erneut.', 0))
    xhr.send(datei)
  })
}
