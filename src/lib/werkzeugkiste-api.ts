import type { Ablauf, AblaufAuswahl, AblaufEinstellungen, AblaufTeil, DirektSperre, LaufInfo } from '@/lib/werkzeugkiste'
import type { ModellPreis } from '@/lib/werkzeugkiste-kosten'
import type { LinkAdminListe, LinkStand } from '@/lib/werkzeugkiste-links'
import { SEITENGROESSE, type MaterialAbfrage, type MaterialListe } from '@/lib/werkzeugkiste-materialien'
import type {
  FreigabeEingabe,
  FreigabeOptionen,
  FreigabeStand,
  ModerationListe,
  RegalAbfrage,
  RegalListe,
} from '@/lib/werkzeugkiste-regal'

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
 *
 * Regal des Kollegiums (PROJ-53, Paket 1):
 *   GET    /regal?suche=&fach=&werkzeug=&sortierung=&seite=   sichtbare Karten (schmale Felder) und Filterwerte
 *   GET    /regal/optionen                 Fachbereiche und Fächer für den Teilen-Dialog
 *   GET    /regal/lehrkraefte?suche=       Personensuche (nur Lehrer-Rollen, Name)
 *   GET    /regal/:id/download             fertige Datei aus dem Regal (zählt einmal je Person und Tag)
 *   GET/PUT/DELETE /ablaeufe/:id/freigabe  eigene Freigabe lesen · teilen · zurücknehmen
 *
 * Regal des Kollegiums (PROJ-53, Paket 2):
 *   POST   /regal/:id/anpassen             Kopie des Materials in „Meine Materialien“ (ohne Skript)
 *   GET    /regal/moderation?seite=        alle Freigaben (nur Super-Admin)
 *   POST   /regal/:id/entnehmen {grund}    aus dem Regal nehmen (nur Super-Admin)
 *   POST   /regal/:id/zulassen             Sperre aufheben (nur Super-Admin)
 *
 * Kostenloser Weg in Teilen (PROJ-69):
 *   DELETE /ablaeufe/:id/teile              Teil-Liste samt Teil-Antworten verwerfen
 *   POST   /ablaeufe/:id/teile/:nr/prompt   Prompt eines Teils (mit weiter: Weiterschreib-Prompt)
 *   POST   /ablaeufe/:id/teile/:nr/antwort  Teil-Antwort einfügen und prüfen
 *   POST   /ablaeufe/:id/zusammenfuegen     Teile zu einer Antwort zusammenfügen
 *   POST   /ablaeufe/:id/weiterschreiben    abgeschnittene Antwort (ohne Teile) kürzen + Weiterschreib-Prompt
 *   POST   /ablaeufe/:id/fortsetzung        Antwort auf den Weiterschreib-Prompt anhängen
 *
 * Öffentlicher Link „Link für alle“ (PROJ-67):
 *   GET/POST/DELETE /ablaeufe/:id/link    eigenen Link lesen · erzeugen · abschalten
 *   GET    /links?seite=                   alle aktiven Links (nur Super-Admin)
 *   DELETE /links/:id                      fremden Link abschalten (nur Super-Admin)
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
    /** Maschinenlesbarer Grund bei Rückfragen (409), z. B. „teile_vorhanden“, „unvollstaendig“ */
    readonly code?: string,
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
  const daten = (await res.json().catch(() => ({}))) as { error?: string; hint?: string; code?: string } & T
  if (!res.ok) throw new WerkzeugFehler(daten.error || ALLGEMEINER_FEHLER, res.status, daten.hint, daten.code)
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

// ── Kostenloser Weg in Teilen (PROJ-69) ───────────────────────────────────

export interface TeilWarnung {
  art: 'doppelt' | 'falscher_teil'
  /** Der andere Teil, zu dem die Antwort schon gehört bzw. eher passt */
  teil: number
  satz: string
}

/** Antwort beim Einfügen: übernommen, oder nicht — dann mit Warnung (Lehrkraft entscheidet) oder Fehlersatz */
export type TeilAntwortErgebnis =
  | {
      uebernommen: true
      ablauf: Ablauf
      teil: AblaufTeil
      geretteteKapitel: number
      nachbesserungsPrompt: string | null
      tippKleiner: boolean
    }
  | { uebernommen: false; warnung?: TeilWarnung; fehler?: string }

export function ladeTeilPrompt(id: string, nr: number, weiter = false) {
  return anfrage<{ prompt: string; nr: number; von: number }>(`/ablaeufe/${encodeURIComponent(id)}/teile/${nr}/prompt`, {
    method: 'POST',
    body: JSON.stringify(weiter ? { weiter: true } : {}),
  })
}

export function sendeTeilAntwort(id: string, nr: number, eingabe: { antwort: string; weiter?: boolean; trotzdem?: boolean }) {
  return anfrage<TeilAntwortErgebnis>(`/ablaeufe/${encodeURIComponent(id)}/teile/${nr}/antwort`, {
    method: 'POST',
    body: JSON.stringify(eingabe),
  })
}

/** Fehler mit Status 409 und Code `unvollstaendig`: ein Teil ist abgeschnitten, Zustimmung nötig (`unvollstaendigOk`) */
export function fuegeTeileZusammen(id: string, unvollstaendigOk = false) {
  return anfrage<{ ablauf: Ablauf; hinweise: string[] }>(`/ablaeufe/${encodeURIComponent(id)}/zusammenfuegen`, {
    method: 'POST',
    body: JSON.stringify(unvollstaendigOk ? { unvollstaendigOk } : {}),
  })
}

export function verwirfTeile(id: string) {
  return anfrage<{ ablauf: Ablauf }>(`/ablaeufe/${encodeURIComponent(id)}/teile`, { method: 'DELETE' })
}

export function schreibeWeiter(id: string) {
  return anfrage<{ ablauf: Ablauf; prompt: string; kapitel: string[]; runde: number; tippKleiner: boolean }>(
    `/ablaeufe/${encodeURIComponent(id)}/weiterschreiben`,
    { method: 'POST' },
  )
}

export type FortsetzungErgebnis = { uebernommen: true; ablauf: Ablauf; tippKleiner: boolean } | { uebernommen: false; fehler: string }

export function setzeFort(id: string, antwort: string) {
  return anfrage<FortsetzungErgebnis>(`/ablaeufe/${encodeURIComponent(id)}/fortsetzung`, {
    method: 'POST',
    body: JSON.stringify({ antwort }),
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

export function ladeMaterialien({ suche, werkzeug, seite, nurOeffentlich }: MaterialAbfrage) {
  const params = new URLSearchParams({ seite: String(seite), je: String(SEITENGROESSE) })
  if (suche.trim()) params.set('suche', suche.trim())
  if (werkzeug) params.set('werkzeug', werkzeug)
  if (nurOeffentlich) params.set('oeffentlich', '1')
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

// ── Regal des Kollegiums (PROJ-53) ────────────────────────────────────────

export function ladeRegal({ suche, fach, werkzeug, sortierung, seite }: RegalAbfrage) {
  const params = new URLSearchParams({ seite: String(seite), sortierung })
  if (suche.trim()) params.set('suche', suche.trim())
  if (fach) params.set('fach', fach)
  if (werkzeug) params.set('werkzeug', werkzeug)
  return anfrage<RegalListe>(`/regal?${params.toString()}`)
}

export function ladeFreigabeOptionen() {
  return anfrage<FreigabeOptionen>('/regal/optionen')
}

export async function sucheLehrkraefte(suche: string) {
  const { lehrkraefte } = await anfrage<{ lehrkraefte: { id: string; name: string }[] }>(
    `/regal/lehrkraefte?suche=${encodeURIComponent(suche)}`,
  )
  return lehrkraefte
}

/** `freigabe: null` heißt „Nur ich“ */
export function ladeFreigabe(ablaufId: string) {
  return anfrage<{ freigabe: FreigabeStand | null }>(`/ablaeufe/${encodeURIComponent(ablaufId)}/freigabe`)
}

/** „Nur ich“ nimmt das Material aus dem Regal, alles andere teilt oder ändert die Freigabe */
export async function speichereFreigabe(ablaufId: string, eingabe: FreigabeEingabe): Promise<void> {
  const pfad = `/ablaeufe/${encodeURIComponent(ablaufId)}/freigabe`
  if (eingabe.stufe === 'privat') {
    await anfrage<{ ok: true }>(pfad, { method: 'DELETE' })
    return
  }
  await anfrage<{ ok: true }>(pfad, {
    method: 'PUT',
    body: JSON.stringify({
      stufe: eingabe.stufe,
      fachId: eingabe.fachId,
      notiz: eingabe.notiz,
      bereiche: eingabe.stufe === 'fachbereich' ? eingabe.bereiche : [],
      personen: eingabe.stufe === 'ausgewaehlte' ? eingabe.personen : [],
    }),
  })
}

/** Datei aus dem Regal laden: erst prüfen, dann den kurzlebigen Link öffnen (wie bei den eigenen Materialien) */
export async function ladeRegalDatei(freigabeId: string): Promise<void> {
  const { url } = await anfrage<{ url: string }>(`/regal/${encodeURIComponent(freigabeId)}/download?pruefen=1`)
  window.location.assign(url)
}

/** Legt eine Kopie des Regal-Materials an; die Kopie hat kein Skript und lässt sich überarbeiten */
export function passeAn(freigabeId: string) {
  return anfrage<{ ablauf: Ablauf }>(`/regal/${encodeURIComponent(freigabeId)}/anpassen`, { method: 'POST' })
}

export function ladeModeration(seite: number) {
  return anfrage<ModerationListe>(`/regal/moderation?seite=${seite}`)
}

export function entnimmAusRegal(freigabeId: string, grund: string) {
  return anfrage<{ ok: true }>(`/regal/${encodeURIComponent(freigabeId)}/entnehmen`, {
    method: 'POST',
    body: JSON.stringify({ grund }),
  })
}

export function lasseWiederZu(freigabeId: string) {
  return anfrage<{ ok: true }>(`/regal/${encodeURIComponent(freigabeId)}/zulassen`, { method: 'POST' })
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

// ── Öffentlicher Link (PROJ-67) ─────────────────────────────────────────────

const linkPfad = (ablaufId: string) => `/ablaeufe/${encodeURIComponent(ablaufId)}/link`

/** `link: null` heißt „kein aktiver Link“ */
export function ladeLink(ablaufId: string) {
  return anfrage<{ link: LinkStand | null }>(linkPfad(ablaufId))
}

/** Gibt es schon einen aktiven Link, kommt dieser zurück (kein zweiter) */
export function erzeugeLink(ablaufId: string) {
  return anfrage<{ link: LinkStand }>(linkPfad(ablaufId), { method: 'POST' })
}

export function schalteLinkAb(ablaufId: string) {
  return anfrage<{ ok: true }>(linkPfad(ablaufId), { method: 'DELETE' })
}

export function ladeLinkUebersicht(seite: number) {
  return anfrage<LinkAdminListe>(`/links?seite=${seite}`)
}

export function schalteLinkAdminAb(linkId: string) {
  return anfrage<{ ok: true }>(`/links/${encodeURIComponent(linkId)}`, { method: 'DELETE' })
}
