/**
 * Schulrecht nachschlagen (PROJ-55): Typen, feste Texte und kleine Hilfen für
 * die Seite „Schulrecht“ und den Aktennotiz-Ablauf. Die Suche selbst, die
 * Erkennung von Personenbezügen und die Prüfung der Fundstellen liegen im
 * Werkzeugkiste-Kern; hier steht nur, was die Oberfläche braucht.
 */

export const SCHULRECHT_HREF = '/admin/schulrecht'
export const FALL_NEU_HREF = `${SCHULRECHT_HREF}/fall`

export const HAFTUNGSHINWEIS = 'Keine Rechtsberatung. Im Zweifel Schulleitung oder Rechtsabteilung fragen.'

export const ANONYMISIERUNGS_WARNUNG = 'Der Sachverhalt enthält Namen. Er wird an eine externe KI weitergegeben.'

/** Hinweis über dem Sachverhalt: Namen gar nicht erst eintippen (die automatische Erkennung findet nicht alles) */
export const OHNE_NAMEN_HINWEIS =
  'Schreibe den Fall am besten gleich ohne Namen, zum Beispiel „ein Schüler“, „Klasse X“ oder „der Ausbildungsbetrieb“.'

export const KURZE_FRAGE_HINWEIS = 'Mit einer ganzen Frage findest du genauere Stellen.'

export const KEIN_TREFFER_TEXT = 'Dazu wurde nichts gefunden. Formuliere die Frage anders, zum Beispiel mit anderen Worten oder als ganzen Satz.'

/** Wie lange ein Aktennotiz-Ablauf höchstens liegen bleibt (E4) */
export const FALL_LAUFZEIT_STUNDEN = 24

export const FRAGE_MAX_ZEICHEN = 500
export const SACHVERHALT_MAX_ZEICHEN = 5000
export const ANTWORT_MAX_ZEICHEN = 60_000

export type FallSchritt = 1 | 2 | 3

export const FALL_SCHRITTE: { nr: FallSchritt; label: string }[] = [
  { nr: 1, label: 'Sachverhalt' },
  { nr: 2, label: 'Prompt' },
  { nr: 3, label: 'Aktennotiz' },
]

export function fallHref(id: string, schritt?: FallSchritt): string {
  const basis = `${FALL_NEU_HREF}/${encodeURIComponent(id)}`
  return schritt ? `${basis}?schritt=${schritt}` : basis
}

/** Der Aktennotiz-Ablauf erscheint wie der Werkzeug-Ablauf ohne Seitenleiste (PROJ-51) */
export function istFallPfad(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === FALL_NEU_HREF || pathname.startsWith(`${FALL_NEU_HREF}/`)
}

// ── Rechtsquellen und Fundstellen ──────────────────────────────────────────

export type Rang = 'gesetz' | 'verordnung' | 'verwaltungsvorschrift' | 'dienstordnung' | 'handlungsleitlinie'

export interface Rechtsquelle {
  kuerzel: string
  titel: string
  stand: string
  rang: Rang
  /** Anzahl der Normen, nur zur Anzeige */
  normen: number
}

export interface Thema {
  id: string
  /** Kurzer Name für den Chip, z. B. „Handy“ */
  label: string
  /** Beispielfrage, die beim Klick ins Suchfeld kommt */
  frage: string
}

export interface ThemenAntwort {
  /** Startauswahl (zehn Chips) */
  start: Thema[]
  /** „Weitere Themen“ */
  weitere: Thema[]
  quellen: Rechtsquelle[]
}

/** Verweis auf eine Norm, wie der Fall sie sich merkt (nie der Wortlaut) */
export interface FundstellenVerweis {
  kuerzel: string
  nr: string
}

export interface Fundstelle extends FundstellenVerweis {
  /** Name der Vorschrift, z. B. „Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen“ */
  vorschrift: string
  titel: string
  /** Stand-Datum der Vorschrift, ISO (JJJJ-MM-TT) */
  stand: string
  rang: Rang
  /** Wortlaut */
  text: string
  /** Treffer, den nur ein Suchverfahren vorn sieht: ein Vorschlag, kein sicherer Treffer */
  ungeprueft?: boolean
  // ── ab PROJ-88 (der Kern liefert sie zusätzlich) ──
  /** Vorab geschriebene Zusammenfassung in Alltagssprache (Opus-geprüft); maßgeblich bleibt der Wortlaut */
  kurzfassung?: string | null
  /** Die Absätze einzeln, mit Kernaussage, Markierung und erkannten Verweisen */
  absaetze?: FundAbsatz[]
  /** Position (ab 1) des Absatzes, der am besten zur Frage passt */
  passend?: number
  /** Mehrere Suchverfahren sehen die Norm weit vorn */
  sicher?: boolean
}

export interface FundAbsatz {
  /** Position ab 1 */
  i: number
  /** Wortlaut, beginnt meist mit der Absatznummer „(2)“ */
  text: string
  kernaussage: string | null
  /** Literale Wörter im Text, die zur Frage passen */
  markiert: string[]
  verweise: NormVerweis[]
}

/** Verweis im Text auf eine andere Norm im Bestand, z. B. „Art. 86 Abs. 2“ */
export interface NormVerweis {
  start: number
  ende: number
  kuerzel: string
  nr: string
}

export interface SuchErgebnis {
  fundstellen: Fundstelle[]
  /** Altlast aus PROJ-55, seit PROJ-88 immer leer */
  themenHinweis?: string | null
}

/** So viele Treffer stehen zuerst da; „Weitere Treffer anzeigen“ zeigt den Rest (bis 15) */
export const ERSTE_TREFFER = 5

/** Einstieg statt Themen-Chips (PROJ-88, E3) */
export const BEISPIEL_FRAGEN = [
  'Darf ich einem Schüler das Handy wegnehmen?',
  'Ab wann kann ich ein ärztliches Attest verlangen?',
  'Wann muss ich den Ausbildungsbetrieb informieren, wenn ein Azubi fehlt?',
] as const

export const NICHT_ENTHALTEN_HINWEIS =
  'Durchsucht werden BayEUG, BaySchO, BSO, die Münchner Dienstordnung, BayBG, BayPVG, Datenschutzrecht, Urheberrecht und unsere Handlungsleitlinien. Nicht enthalten sind Verwaltungsvorschriften (KMBek, KMS).'

export const KURZFASSUNG_HINWEIS = 'Zusammenfassung – maßgeblich ist der Gesetzestext.'

export const KI_HINWEIS = 'Die Frage geht an deine eigene KI. Schreibe keine Namen hinein.'

/** Absätze einer Fundstelle; ältere Antworten ohne Absätze werden zu einem Absatz */
export function absaetzeVon(f: Fundstelle): FundAbsatz[] {
  if (f.absaetze && f.absaetze.length) return f.absaetze
  return [{ i: 1, text: f.text, kernaussage: null, markiert: [], verweise: [] }]
}

export type TextStueck =
  | { art: 'text'; text: string }
  | { art: 'mark'; text: string }
  | { art: 'verweis'; text: string; verweis: NormVerweis }

/**
 * Zerlegt einen Absatz in Stücke für die Anzeige: normale Wörter, markierte
 * Suchwörter und anklickbare Verweise. Kein HTML – die Oberfläche setzt die
 * Stücke selbst zusammen. Verweise haben Vorrang vor Markierungen.
 */
export function zerlegeText(text: string, markiert: string[], verweise: NormVerweis[]): TextStueck[] {
  const stuecke: TextStueck[] = []
  const gueltig = [...verweise]
    .filter((v) => v.start >= 0 && v.ende <= text.length && v.start < v.ende)
    .sort((a, b) => a.start - b.start)
  const worte = [...new Set(markiert.filter((w) => w.length > 2))].sort((a, b) => b.length - a.length)
  const muster = worte.length
    ? new RegExp(`(?<![\\p{L}])(${worte.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'gu')
    : null

  function markiere(abschnitt: string) {
    if (!abschnitt) return
    if (!muster) {
      stuecke.push({ art: 'text', text: abschnitt })
      return
    }
    let pos = 0
    for (const m of abschnitt.matchAll(muster)) {
      const start = m.index ?? 0
      if (start > pos) stuecke.push({ art: 'text', text: abschnitt.slice(pos, start) })
      stuecke.push({ art: 'mark', text: m[0] })
      pos = start + m[0].length
    }
    if (pos < abschnitt.length) stuecke.push({ art: 'text', text: abschnitt.slice(pos) })
  }

  let position = 0
  for (const v of gueltig) {
    if (v.start < position) continue
    markiere(text.slice(position, v.start))
    stuecke.push({ art: 'verweis', text: text.slice(v.start, v.ende), verweis: v })
    position = v.ende
  }
  markiere(text.slice(position))
  return stuecke
}

/** Treffer nach Rechtsquelle bündeln; Reihenfolge der Gruppen = bester Treffer der Gruppe */
export function gruppiereNachQuelle(fundstellen: Fundstelle[]): { kuerzel: string; vorschrift: string; fundstellen: Fundstelle[] }[] {
  const gruppen: { kuerzel: string; vorschrift: string; fundstellen: Fundstelle[] }[] = []
  for (const f of fundstellen) {
    const g = gruppen.find((x) => x.kuerzel === f.kuerzel)
    if (g) g.fundstellen.push(f)
    else gruppen.push({ kuerzel: f.kuerzel, vorschrift: f.vorschrift, fundstellen: [f] })
  }
  return gruppen
}

export interface VorschriftInhalt {
  kuerzel: string
  titel: string
  stand: string
  rang: Rang
  normen: { nr: string; titel: string }[]
}

export const RANG_LABEL: Record<Rang, string> = {
  gesetz: 'Gesetz',
  verordnung: 'Verordnung',
  verwaltungsvorschrift: 'Verwaltungsvorschrift – keine Gesetzeskraft',
  dienstordnung: 'Dienstordnung – keine Gesetzeskraft, dienstliche Weisung',
  handlungsleitlinie: 'Hausinterne Handlungsleitlinie – keine Gesetzeskraft',
}

/** Anzeige „BayEUG Art. 56“ bzw. „BSO § 12“ */
export function fundstelleKurz(f: FundstellenVerweis): string {
  return `${f.kuerzel} ${f.nr}`
}

/** „2026-07-01“ -> „01.07.2026“; alles andere bleibt unverändert */
export function standAnzeige(stand: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stand)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : stand
}

/** Text für „Text kopieren“: Wortlaut mit Quellenangabe */
export function kopierText(f: Fundstelle): string {
  const kopf = `${fundstelleKurz(f)}${f.titel ? ` – ${f.titel}` : ''}`
  const quelle = `Quelle: ${f.vorschrift}, Stand ${standAnzeige(f.stand)}`
  const rang = f.rang === 'gesetz' || f.rang === 'verordnung' ? '' : `\n${RANG_LABEL[f.rang]}`
  return `${kopf}\n\n${f.text.trim()}\n\n${quelle}${rang}`
}

/** Text für „Quelle kopieren“: Zitierzeile, z. B. „Art. 56 Abs. 5 BayEUG – Rechte und Pflichten (Stand 01.08.2025)“ */
export function quellenAngabe(f: Fundstelle): string {
  const abs = f.passend && (f.absaetze?.length ?? 0) > 1 ? absatzNummer(f.absaetze!.find((a) => a.i === f.passend)?.text) : null
  return `${f.nr}${abs ? ` Abs. ${abs}` : ''} ${f.kuerzel}${f.titel ? ` – ${f.titel}` : ''} (Stand ${standAnzeige(f.stand)})`
}

/** „(1a) Text …“ -> „1a“ */
export function absatzNummer(text: string | undefined): string | null {
  return /^\s*\((\d+[a-z]?)\)/.exec(text ?? '')?.[1] ?? null
}

/** Weniger als zwei Wörter: es wird trotzdem gesucht, aber mit Hinweis */
export function istKurzeFrage(frage: string): boolean {
  return frage.trim().split(/\s+/).filter(Boolean).length < 2
}

// ── Personenbezüge (Schritt „Sachverhalt“) ─────────────────────────────────

export type FundArt = 'vorname' | 'klasse' | 'firma' | 'datum' | 'telefon' | 'email' | 'adresse'

export const FUND_ART_LABEL: Record<FundArt, string> = {
  vorname: 'Name',
  klasse: 'Klasse',
  firma: 'Betrieb',
  datum: 'Datum',
  telefon: 'Telefonnummer',
  email: 'E-Mail-Adresse',
  adresse: 'Adresse',
}

/** Ein erkannter Personenbezug im Sachverhalt, mit Ersetzungsvorschlag des Kerns */
export interface Fund {
  /** Nummer des Fundes (von 0), stabil für diese Erkennung */
  id: number
  art: FundArt
  /** Der Originaltext, z. B. „Max Müller“ */
  text: string
  /** Zeichenposition [start, ende) im Sachverhalt, wie er erkannt wurde */
  start: number
  ende: number
  /** z. B. „Schüler A“ */
  vorschlag: string
}

export type Entscheidung =
  | { art: 'annehmen' }
  | { art: 'ablehnen' }
  | { art: 'aendern'; text: string }

export function entscheidungsText(fund: Fund, e: Entscheidung | undefined): string | null {
  if (!e || e.art === 'annehmen') return fund.vorschlag
  if (e.art === 'aendern') return e.text.trim() || null
  return null
}

/**
 * Setzt die Entscheidungen der Lehrkraft in den Sachverhalt ein. Ohne
 * Entscheidung gilt der Vorschlag („annehmen“ ist vorgewählt, das Ersetzen
 * geschieht aber nie unsichtbar: die Liste steht vorher auf dem Bildschirm).
 * Überlappende Funde werden nach Reihenfolge übersprungen.
 */
export function wendeErsetzungenAn(text: string, funde: Fund[], entscheidungen: Record<number, Entscheidung>): string {
  const sortiert = [...funde].sort((a, b) => a.start - b.start)
  let ergebnis = ''
  let position = 0
  for (const fund of sortiert) {
    if (fund.start < position || fund.ende > text.length) continue
    const ersatz = entscheidungsText(fund, entscheidungen[fund.id])
    if (ersatz === null) continue
    ergebnis += text.slice(position, fund.start) + ersatz
    position = fund.ende
  }
  return ergebnis + text.slice(position)
}

/** Wurden Funde erkannt und alle abgelehnt? Dann braucht es eine ausdrückliche Bestätigung (E3) */
export function alleAbgelehnt(funde: Fund[], entscheidungen: Record<number, Entscheidung>): boolean {
  return funde.length > 0 && funde.every((f) => entscheidungsText(f, entscheidungen[f.id]) === null)
}

// ── Aktennotiz-Ablauf ──────────────────────────────────────────────────────

export interface FallPruefung {
  /** false: Die Antwort ist leer oder offensichtlich unbrauchbar */
  lesbar: boolean
  fehler: string | null
  /** Verständliche Sätze, z. B. „Die KI nennt Art. 99 BayEUG – diese Stelle wurde ihr nicht gegeben. Bitte prüfen.“ */
  befunde: { text: string }[]
}

export interface Fall {
  id: string
  schritt: FallSchritt
  /** Bestätigter, anonymisierter Sachverhalt — nie der Originaltext */
  sachverhalt: string
  fundstellen: FundstellenVerweis[]
  prompt: string | null
  antwort: string
  pruefung: FallPruefung | null
  /** ISO-Zeitpunkt: danach ist der Fall weg */
  laeuftAb: string
}

/** Rückkehr-Schritt aus der Adresse; nur vorbereitete Schritte sind erlaubt */
export function fallSchrittErlaubt(fall: Pick<Fall, 'prompt'>, schritt: FallSchritt): boolean {
  if (schritt === 1) return true
  return !!fall.prompt
}

export function fallSchrittAusParam(fall: Pick<Fall, 'prompt' | 'schritt'>, param: string | null | undefined): FallSchritt {
  const n = Number(param)
  const gewuenscht: FallSchritt = n === 1 || n === 2 || n === 3 ? (n as FallSchritt) : fall.schritt
  return fallSchrittErlaubt(fall, gewuenscht) ? gewuenscht : 1
}

// ── Sitzungs-Zwischenspeicher im Browser (nur dieser Tab) ──────────────────

/** Was die Suche an den Aktennotiz-Ablauf übergibt: die Frage und die gezeigten Fundstellen */
export interface FallStart {
  frage: string
  fundstellen: FundstellenVerweis[]
}

export const FALL_START_KEY = 'schulrecht-fall-start'
/** Roher Sachverhalt, solange er nicht bestätigt ist. Nur sessionStorage, nie auf dem Server. */
export const SACHVERHALT_ENTWURF_KEY = 'schulrecht-sachverhalt-entwurf'

export function speichereImTab(key: string, wert: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(wert))
  } catch {
    // privater Modus o. Ä.: dann geht eben nichts über ein Neuladen hinweg
  }
}

export function leseAusTab<T>(key: string): T | null {
  try {
    const roh = sessionStorage.getItem(key)
    return roh ? (JSON.parse(roh) as T) : null
  } catch {
    return null
  }
}

export function loescheAusTab(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // nichts zu tun
  }
}
