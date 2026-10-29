import {
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  ListChecks,
  MonitorPlay,
  Mic,
  Music,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react'

/**
 * Werkzeugkiste im Lehrkräfte-Bereich (PROJ-51 ff.) — einzige Quelle für die
 * Werkzeugliste der Startseite und die Werkzeug-Wahl im Ablauf. Die IDs sind
 * die Werkzeug-Schlüssel des Python-Kerns (`TOOLS` in prompts.py).
 *
 * Ein Werkzeug freischalten (PROJ-54) = `aktiv: true` setzen.
 */

export type WerkzeugGruppeId = 'selbstlernen' | 'ueben' | 'unterricht' | 'hoeren'

export interface WerkzeugGruppe {
  id: WerkzeugGruppeId
  label: string
  /** Token-Farbe der Gruppe für Icon-Kachel (ws-<farbe>) */
  farbe: 'green' | 'blue' | 'orange' | 'gold'
}

export const WERKZEUG_GRUPPEN: WerkzeugGruppe[] = [
  { id: 'selbstlernen', label: 'Selbstlernen', farbe: 'green' },
  { id: 'ueben', label: 'Üben & Wiederholen', farbe: 'blue' },
  { id: 'unterricht', label: 'Unterricht & Prüfung', farbe: 'orange' },
  { id: 'hoeren', label: 'Zum Hören', farbe: 'gold' },
]

export interface WerkzeugFormat {
  id: string
  label: string
  /** Ein Satz unter dem Format, z. B. „Ergebnisse zählen im Notenbuch“ */
  hinweis: string
}

export interface FeldOption {
  key: string
  label: string
}

/** Woher die Auswahl eines Feldes kommt: feste Liste oder Auswahllisten des Kerns */
export type FeldQuelle = 'niveaus' | 'bildungsgaenge' | 'lernfelder' | 'umfaenge'

/**
 * Eine Einstellung in Schritt 2 (PROJ-54). Jedes Werkzeug beschreibt seine
 * Einstellungen hier; die Oberfläche zeichnet sich daraus selbst (kein
 * Sonderlayout je Werkzeug). Höchstens drei Felder je Werkzeug stehen `direkt`
 * sichtbar, der Rest unter „Mehr Optionen“.
 */
export interface EinstellungsFeld {
  /** Schlüssel in den Einstellungen (und im Kern) */
  id: string
  label: string
  /** schalter = Knopfleiste (wenige Optionen) · wahl = Auswahlliste · zahl = Zahlenfeld · mehrfach = Häkchen, Werte kommagetrennt */
  art: 'schalter' | 'wahl' | 'zahl' | 'mehrfach'
  ort: 'direkt' | 'mehr'
  standard: string
  /** Feste Auswahl; alternativ `quelle` */
  optionen?: FeldOption[]
  quelle?: FeldQuelle
  /** Beschriftung für „nichts gewählt“ (nur bei wahl); ohne Angabe gibt es diese Möglichkeit nicht */
  leer?: string
  /** zahl */
  min?: number
  max?: number
  schritt?: number
  einheit?: string
  /** mehrfach: höchstens so viele Häkchen */
  hoechstens?: number
  /** Optionen und Standard hängen vom Wert eines anderen Feldes ab (z. B. Stufen je „Art“) */
  abhaengigVon?: { feld: string; optionen: Record<string, FeldOption[]>; standard: Record<string, string> }
  /** Ein Satz unter dem Feld */
  hinweis?: string
}

export interface Werkzeug {
  id: string
  name: string
  gruppe: WerkzeugGruppeId
  /** Eine Zeile Erklärung (Startseite und Schritt 2) */
  beschreibung: string
  icon: LucideIcon
  /** Bis zur Freischaltung (PROJ-54) als „kommt bald“ sichtbar, aber nicht wählbar */
  aktiv: boolean
  /** Mehr als ein Format → Auswahl in Schritt 2; das erste ist vorgewählt */
  formate: WerkzeugFormat[]
  /** Einstellungen in Schritt 2 (ohne Format) */
  felder: EinstellungsFeld[]
  /** Die bisherigen „Tipps je Werkzeug“, aufklappbar in Schritt 2 */
  tipps?: string[]
}

const H5P: WerkzeugFormat = { id: 'h5p', label: 'H5P für Moodle', hinweis: 'Ergebnisse zählen im Notenbuch' }
const SEITE: WerkzeugFormat = { id: 'seite', label: 'Interaktive Seite', hinweis: 'Zum Üben, auch offline und druckbar' }

// ── Wiederkehrende Einstellungen ────────────────────────────────────────────

const NIVEAU: EinstellungsFeld = { id: 'niveau', label: 'Niveau', art: 'schalter', ort: 'direkt', standard: 'mittel', quelle: 'niveaus' }
const BILDUNGSGANG: EinstellungsFeld = { id: 'bildungsgang', label: 'Bildungsgang', art: 'wahl', ort: 'mehr', standard: 'auto', quelle: 'bildungsgaenge' }
const LERNFELD: EinstellungsFeld = { id: 'lernfeld', label: 'Lernfeld', art: 'wahl', ort: 'mehr', standard: '', quelle: 'lernfelder', leer: 'keins' }
const UMFANG: EinstellungsFeld = { id: 'umfang', label: 'Umfang', art: 'wahl', ort: 'mehr', standard: '', quelle: 'umfaenge', leer: 'nach Skript' }
const SOZIALFORM: EinstellungsFeld = {
  id: 'sozialform',
  label: 'Sozialform',
  art: 'wahl',
  ort: 'direkt',
  standard: 'auto',
  optionen: [
    { key: 'auto', label: 'Automatisch (gemischt)' },
    { key: 'einzel', label: 'Einzelarbeit' },
    { key: 'partner', label: 'Partnerarbeit' },
    { key: 'gruppe', label: 'Gruppenarbeit' },
    { key: 'mix', label: 'Gemischt (Wechsel)' },
  ],
}
const DAUER: EinstellungsFeld = {
  id: 'dauer',
  label: 'Bearbeitungszeit',
  art: 'zahl',
  ort: 'mehr',
  standard: '60',
  min: 10,
  max: 1350,
  schritt: 5,
  einheit: 'Minuten',
}

/** Felder, die ein noch nicht umgezogenes Werkzeug vorläufig hat (werden in seinem Paket ersetzt) */
const VORLAEUFIG: EinstellungsFeld[] = [NIVEAU, BILDUNGSGANG, LERNFELD]

const WORD_ZIP = (hinweis: string): WerkzeugFormat => ({ id: 'word', label: 'Word-Dokument', hinweis })
const WORD: WerkzeugFormat = WORD_ZIP('Zum Ausdrucken und Bearbeiten')

const STUFEN_LERN: FeldOption[] = [
  { key: 'leichte_sprache', label: 'Leichte Sprache' },
  { key: 'leicht', label: 'leicht' },
  { key: 'mittel', label: 'mittel' },
  { key: 'schwer', label: 'schwer' },
]
const STUFEN_CEFR: FeldOption[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((k) => ({ key: k, label: k }))

export const WERKZEUGE: Werkzeug[] = [
  { id: 'skript', name: 'Ganzes Skript', gruppe: 'selbstlernen', beschreibung: 'Skript vollständig interaktiv', icon: BookOpen, aktiv: true, formate: [H5P, SEITE], felder: [NIVEAU, BILDUNGSGANG, LERNFELD, UMFANG] },
  { id: 'kreativ', name: 'Kreative Einheit', gruppe: 'selbstlernen', beschreibung: 'Schüler erarbeiten es selbst', icon: Sparkles, aktiv: true, formate: [H5P, SEITE], felder: [NIVEAU, BILDUNGSGANG, LERNFELD, UMFANG, { ...SOZIALFORM, ort: 'mehr' }] },
  {
    id: 'differenzierung',
    name: 'Differenzierung',
    gruppe: 'selbstlernen',
    beschreibung: 'Dasselbe in mehreren Stufen',
    icon: BarChart3,
    aktiv: true,
    formate: [WORD, H5P, SEITE],
    // Prompt und Bau kennen weder Niveau noch Bildungsgang noch Lernfeld – sie bleiben hier weg
    felder: [
      {
        id: 'art',
        label: 'Differenzieren nach',
        art: 'schalter',
        ort: 'direkt',
        standard: 'lernniveau',
        optionen: [
          { key: 'lernniveau', label: 'Lernniveau (leicht–schwer)' },
          { key: 'cefr', label: 'CEFR-Sprachniveau (A1–C2)' },
        ],
      },
      {
        id: 'stufen',
        label: 'Stufen',
        art: 'mehrfach',
        ort: 'direkt',
        standard: 'leicht,mittel,schwer',
        hoechstens: 4,
        hinweis: 'Alle gewählten Stufen stehen in einer Datei. Höchstens vier.',
        abhaengigVon: {
          feld: 'art',
          optionen: { lernniveau: STUFEN_LERN, cefr: STUFEN_CEFR },
          standard: { lernniveau: 'leicht,mittel,schwer', cefr: 'A2,B1,B2' },
        },
      },
    ],
  },
  { id: 'kahoot', name: 'Kahoot-Quiz', gruppe: 'ueben', beschreibung: 'Wiederholung, Stundeneinstieg', icon: Timer, aktiv: false, formate: [], felder: VORLAEUFIG },
  { id: 'moodle', name: 'Moodle-Fragen', gruppe: 'ueben', beschreibung: 'Tests in der Lernplattform', icon: ListChecks, aktiv: false, formate: [], felder: VORLAEUFIG },
  { id: 'learningapps', name: 'LearningApps', gruppe: 'ueben', beschreibung: 'Inhalte zum Kopieren', icon: LayoutGrid, aktiv: false, formate: [], felder: VORLAEUFIG },
  { id: 'youtube', name: 'Video-Fragen', gruppe: 'ueben', beschreibung: 'Arbeitsauftrag zu einem Video', icon: MonitorPlay, aktiv: false, formate: [], felder: VORLAEUFIG },
  {
    id: 'arbeitsblatt',
    name: 'Arbeitsblatt',
    gruppe: 'unterricht',
    beschreibung: 'Blatt mit Lösung',
    icon: FileText,
    aktiv: true,
    formate: [WORD_ZIP('ZIP mit Arbeitsblatt und Lösungsblatt'), SEITE],
    felder: [
      NIVEAU,
      { id: 'anzahl', label: 'Anzahl Aufgaben', art: 'zahl', ort: 'direkt', standard: '12', min: 1, max: 60, schritt: 1 },
      DAUER,
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  {
    id: 'lernsituation',
    name: 'Lernsituation',
    gruppe: 'unterricht',
    beschreibung: 'Betrieblicher Auftrag',
    icon: Briefcase,
    aktiv: true,
    formate: [WORD_ZIP('ZIP mit Material und Handreichung'), SEITE],
    felder: [SOZIALFORM, NIVEAU, DAUER, BILDUNGSGANG, LERNFELD],
  },
  { id: 'pruefung', name: 'Klassenarbeit', gruppe: 'unterricht', beschreibung: 'IHK-Stil, AFB I–III', icon: ClipboardCheck, aktiv: false, formate: [], felder: VORLAEUFIG },
  { id: 'podcast', name: 'Podcast', gruppe: 'hoeren', beschreibung: 'Lern-Dialog als MP3', icon: Mic, aktiv: false, formate: [], felder: VORLAEUFIG },
  { id: 'lied', name: 'Lernlied', gruppe: 'hoeren', beschreibung: 'Fachbegriffe als Ohrwurm', icon: Music, aktiv: false, formate: [], felder: VORLAEUFIG },
]

/** Alle Einstellungs-Schlüssel, die ein Werkzeug kennt (Format zählt dazu, wenn es Formate hat) */
export function feldIds(werkzeugId: string): string[] {
  const w = findeWerkzeug(werkzeugId)
  return w ? w.felder.map((f) => f.id) : []
}

/** Feste oder vom Kern gelieferte Auswahl eines Feldes; bei abhängigen Feldern je nach Wert des Bezugsfeldes */
export function feldOptionen(
  feld: EinstellungsFeld,
  einstellungen: Record<string, string>,
  kern: { niveaus: FeldOption[]; bildungsgaenge: FeldOption[]; lernfelder: Record<string, FeldOption[]>; umfaenge: FeldOption[] } | null,
): FeldOption[] {
  if (feld.abhaengigVon) return feld.abhaengigVon.optionen[einstellungen[feld.abhaengigVon.feld]] ?? []
  if (feld.optionen) return feld.optionen
  if (!kern) return []
  switch (feld.quelle) {
    case 'niveaus':
      return kern.niveaus
    case 'bildungsgaenge':
      return kern.bildungsgaenge
    case 'umfaenge':
      return kern.umfaenge
    case 'lernfelder':
      return kern.lernfelder[einstellungen.bildungsgang] ?? []
    default:
      return []
  }
}

/** Startwerte aller Felder eines Werkzeugs */
export function feldStandards(werkzeugId: string): Record<string, string> {
  const w = findeWerkzeug(werkzeugId)
  const out: Record<string, string> = {}
  for (const f of w?.felder ?? []) {
    out[f.id] = f.abhaengigVon ? (f.abhaengigVon.standard[out[f.abhaengigVon.feld] ?? ''] ?? f.standard) : f.standard
  }
  return out
}

/**
 * Ein Feld ändern. Abhängiges folgt: neuer Bildungsgang → Lernfeld leer,
 * neue „Art“ → Stufen auf deren Standard.
 */
export function feldSetzen(
  werkzeugId: string,
  einstellungen: AblaufEinstellungen,
  feldId: string,
  wert: string,
): AblaufEinstellungen {
  const neu: AblaufEinstellungen = { ...einstellungen, [feldId]: wert }
  if (feldId === 'bildungsgang') neu.lernfeld = ''
  for (const f of findeWerkzeug(werkzeugId)?.felder ?? []) {
    if (f.abhaengigVon?.feld === feldId) neu[f.id] = f.abhaengigVon.standard[wert] ?? f.standard
  }
  return neu
}

export const STANDARD_WERKZEUG = 'skript'

export function findeWerkzeug(id: string | null | undefined): Werkzeug | undefined {
  return WERKZEUGE.find((w) => w.id === id)
}

export function werkzeugeDerGruppe(gruppe: WerkzeugGruppeId): Werkzeug[] {
  return WERKZEUGE.filter((w) => w.gruppe === gruppe)
}

// ── Reiter der Werkzeugkiste-Seite ─────────────────────────────────────────

export const WERKZEUGKISTE_HREF = '/admin/werkzeugkiste'

export type WerkzeugkisteReiter = 'werkzeuge' | 'materialien' | 'regal'

export const WERKZEUGKISTE_REITER: { id: WerkzeugkisteReiter; label: string }[] = [
  { id: 'werkzeuge', label: 'Werkzeuge' },
  { id: 'materialien', label: 'Meine Materialien' },
  { id: 'regal', label: 'Regal des Kollegiums' },
]

export function reiterAusParam(param: string | null | undefined): WerkzeugkisteReiter {
  return WERKZEUGKISTE_REITER.some((r) => r.id === param) ? (param as WerkzeugkisteReiter) : 'werkzeuge'
}

/** Adresse, unter der ein neuer Ablauf beginnt — optional mit vorgewähltem Werkzeug */
export function neuerAblaufHref(werkzeug?: string): string {
  return werkzeug ? `${WERKZEUGKISTE_HREF}/neu?werkzeug=${encodeURIComponent(werkzeug)}` : `${WERKZEUGKISTE_HREF}/neu`
}

export function ablaufHref(id: string, schritt?: AblaufSchritt): string {
  const basis = `${WERKZEUGKISTE_HREF}/ablauf/${encodeURIComponent(id)}`
  return schritt ? `${basis}?schritt=${schritt}` : basis
}

/**
 * Der Ablauf erscheint ohne Seitenleiste und Kopfzeile (PROJ-51): Beim
 * Erstellen soll nichts ablenken.
 */
export function istAblaufPfad(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname === `${WERKZEUGKISTE_HREF}/neu` ||
    pathname.startsWith(`${WERKZEUGKISTE_HREF}/neu/`) ||
    pathname.startsWith(`${WERKZEUGKISTE_HREF}/ablauf/`)
  )
}

// ── Datei-Prüfung vor dem Hochladen (Schritt 1) ───────────────────────────

export const MAX_SKRIPT_BYTES = 50 * 1024 * 1024
export const ERLAUBTE_ENDUNGEN = ['docx', 'pdf', 'pptx', 'doc', 'ppt', 'txt'] as const
export const ALTE_FORMATE = ['doc', 'ppt'] as const

export function dateiEndung(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

/** Fehlertext für eine unpassende Datei, sonst `null` */
export function pruefeSkriptDatei(datei: { name: string; size: number }): string | null {
  const endung = dateiEndung(datei.name)
  if (!(ERLAUBTE_ENDUNGEN as readonly string[]).includes(endung)) {
    return 'Dieses Format geht nicht. Erlaubt sind Word (.docx, .doc), PDF, PowerPoint (.pptx, .ppt) und .txt.'
  }
  if (datei.size > MAX_SKRIPT_BYTES) {
    return 'Die Datei ist größer als 50 MB. Bitte Bilder komprimieren oder das Skript teilen.'
  }
  if (datei.size === 0) return 'Die Datei ist leer.'
  return null
}

export function istAltesFormat(name: string): boolean {
  return (ALTE_FORMATE as readonly string[]).includes(dateiEndung(name))
}

/** Bei Word wird nach Abschnitten eingegrenzt, sonst nach Seiten bzw. Folien */
export function auswahlArt(name: string): 'abschnitte' | 'seiten' | null {
  const endung = dateiEndung(name)
  if (endung === 'docx' || endung === 'doc') return 'abschnitte'
  if (endung === 'pdf') return 'seiten'
  if (endung === 'pptx' || endung === 'ppt') return 'seiten'
  return null
}

export function formatiereGroesse(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// ── Ablauf ────────────────────────────────────────────────────────────────

export type AblaufSchritt = 1 | 2 | 3 | 4 | 5

export const ABLAUF_SCHRITTE: { nr: AblaufSchritt; label: string }[] = [
  { nr: 1, label: 'Skript' },
  { nr: 2, label: 'Einstellungen' },
  { nr: 3, label: 'Prompt' },
  { nr: 4, label: 'Antwort' },
  { nr: 5, label: 'Fertig' },
]

/** Beim direkten Weg (PROJ-64) gibt es vier Schritte: Schritt 3 heißt „Erstellen“, Prompt und Antwort entfallen */
export const DIREKT_SCHRITTE: { nr: AblaufSchritt; label: string }[] = [
  { nr: 1, label: 'Skript' },
  { nr: 2, label: 'Einstellungen' },
  { nr: 3, label: 'Erstellen' },
  { nr: 5, label: 'Fertig' },
]

export interface AblaufKennzahlen {
  seiten: number
  loesungen: number
  bilder: number
  tabellen: number
}

export interface AblaufEinstellungen {
  format: string
  niveau: string
  bildungsgang: string
  lernfeld: string
  umfang: string
  /** Werkzeugeigene Einstellungen (PROJ-54), z. B. dauer, anzahl, sozialform, art, stufen */
  [feld: string]: string
}

export interface AblaufAuswahl {
  /** z. B. „3-7, 10“ (PDF/PowerPoint); leer = alles */
  seiten: string
  /** Nummern der gewählten Word-Abschnitte; leer = alles */
  abschnitte: number[]
}

export interface PruefBefund {
  text: string
}

export interface AblaufPruefung {
  /** false = Antwort ist nicht lesbar (kein YAML, abgeschnitten) → Bauen gesperrt */
  lesbar: boolean
  /** Verständlicher Satz, wenn nicht lesbar */
  fehler: string | null
  befunde: PruefBefund[]
  /** Anzahl automatisch korrigierter Kleinigkeiten */
  korrekturen: number
  nachbesserungsPrompt: string | null
}

export interface AblaufErgebnis {
  titel: string
  dateiname: string
  format: string
  kapitel: number
  aufgaben: number
  /** Inhalt eines ZIP, z. B. ['Arbeitsblatt', 'Lösungsblatt'] (PROJ-54) */
  enthaelt?: string[]
  /** Was „aufgaben“ zählt, wenn nicht Aufgaben (z. B. „Phasen“, „Versionen“) */
  einheit?: string
  /** false = es gibt keine Vorschau (Standard: ja) */
  hatVorschau?: boolean
}

/**
 * „Direkt erstellen“ (PROJ-64) ist vorerst ausgeblendet (Nutzerentscheidung
 * 2026-10-29): Die Ausgabe ist ~15× so lang wie das Skript, ein 3-Seiten-Skript
 * kostet mit Sonnet ~0,30–0,40 € und brauchte mehr als die eingestellte Obergrenze.
 * Erst nach Überarbeitung (Modell, Teilgröße, Obergrenze, Schätzung) wieder einschalten.
 */
export const DIREKT_ERSTELLEN_AKTIV = false

/** Stand einer direkten Erstellung (PROJ-64), wie die Oberfläche ihn sieht */
export interface LaufInfo {
  id: string
  status: 'laeuft' | 'baut' | 'fertig' | 'abgebrochen' | 'fehlgeschlagen'
  teileGesamt: number
  teileFertig: number
  kostenEur: number
  /** Verständlicher Satz bei Fehlschlag */
  fehler: string | null
  /** 'guthaben' = Schulguthaben aufgebraucht → nur noch der kostenlose Weg */
  fehlerArt: string | null
  gestartetAm: string
  beendetAm: string | null
}

/** Warum „Direkt erstellen“ gerade nicht geht (null = es geht) */
export type DirektSperre = 'guthaben' | 'tageslimit' | null

export interface Ablauf {
  id: string
  werkzeug: string
  /** Weitester erreichter Schritt */
  schritt: AblaufSchritt
  status: 'laeuft' | 'fertig'
  datei: { name: string; groesse: number } | null
  kennzahlen: AblaufKennzahlen | null
  /** Überschriften eines Word-Skripts für die Auswahl */
  gliederung: { nr: number; titel: string }[]
  auswahl: AblaufAuswahl
  einstellungen: AblaufEinstellungen
  prompt: string | null
  antwort: string | null
  pruefung: AblaufPruefung | null
  ergebnis: AblaufErgebnis | null
  /** Gewählter Weg (PROJ-64); null = noch nicht entschieden */
  weg: 'direkt' | 'kostenlos' | null
  aktualisiertAm: string
}

/**
 * Darf dieser Schritt geöffnet werden? Vorwärts nur, was schon vorbereitet
 * ist: Prompt erst mit Einlesung, Antwort erst mit Prompt, Fertig erst mit Ergebnis.
 */
export function schrittErlaubt(
  ablauf: Pick<Ablauf, 'kennzahlen' | 'prompt' | 'ergebnis'> & Partial<Pick<Ablauf, 'weg'>>,
  schritt: AblaufSchritt,
): boolean {
  switch (schritt) {
    case 1:
      return true
    case 2:
      return !!ablauf.kennzahlen
    case 3:
      // Direkter Weg (PROJ-64): Schritt 3 ist „Erstellen“ und braucht keinen Prompt
      return !!ablauf.kennzahlen && (ablauf.weg === 'direkt' || !!ablauf.prompt)
    case 4:
      return !!ablauf.kennzahlen && !!ablauf.prompt
    case 5:
      return !!ablauf.ergebnis
  }
}

/** Schritt aus der Adresse, begrenzt auf das, was der Ablauf schon erlaubt */
export function schrittAusParam(
  param: string | null | undefined,
  ablauf: Pick<Ablauf, 'schritt' | 'kennzahlen' | 'prompt' | 'ergebnis'> & Partial<Pick<Ablauf, 'weg'>>,
): AblaufSchritt {
  const n = Number(param)
  const gewuenscht: AblaufSchritt = n >= 1 && n <= 5 && Number.isInteger(n) ? (n as AblaufSchritt) : ablauf.schritt
  if (schrittErlaubt(ablauf, gewuenscht)) return gewuenscht
  for (let s = gewuenscht; s >= 1; s--) {
    if (schrittErlaubt(ablauf, s as AblaufSchritt)) return s as AblaufSchritt
  }
  return 1
}

/** Kurzinfo im Ablauf-Kopf: „Ganzes Skript · H5P für Moodle · mittel“ */
export function ablaufKurzinfo(ablauf: Pick<Ablauf, 'werkzeug' | 'einstellungen' | 'datei'>, niveauLabel?: string): string {
  const werkzeug = findeWerkzeug(ablauf.werkzeug)
  const teile: string[] = []
  if (ablauf.datei) teile.push(ablauf.datei.name)
  if (werkzeug) {
    teile.push(werkzeug.name)
    const format = werkzeug.formate.find((f) => f.id === ablauf.einstellungen.format)
    if (format && werkzeug.formate.length > 1) teile.push(format.label)
  }
  if (niveauLabel) teile.push(niveauLabel)
  return teile.join(' · ')
}

/**
 * Einstellungen beim Werkzeugwechsel: Format auf den Standard des neuen
 * Werkzeugs, Niveau/Bildungsgang/Lernfeld/Umfang bleiben, werkzeugeigene
 * Felder des alten Werkzeugs entfallen, die des neuen starten mit ihrem Standard
 * (gleich benannte Felder behalten ihren Wert, wenn der noch erlaubt ist).
 */
export function einstellungenFuerWerkzeug(werkzeugId: string, bisher: AblaufEinstellungen): AblaufEinstellungen {
  const werkzeug = findeWerkzeug(werkzeugId)
  const kern = ['format', 'niveau', 'bildungsgang', 'lernfeld', 'umfang']
  const neu: AblaufEinstellungen = {
    format: werkzeug?.formate[0]?.id ?? '',
    niveau: bisher.niveau,
    bildungsgang: bisher.bildungsgang,
    lernfeld: bisher.lernfeld,
    umfang: bisher.umfang,
  }
  const standards = feldStandards(werkzeugId)
  for (const f of werkzeug?.felder ?? []) {
    if (kern.includes(f.id)) continue
    const alt = bisher[f.id]
    const erlaubt = alt !== undefined && (!f.optionen || f.optionen.some((o) => o.key === alt))
    neu[f.id] = f.abhaengigVon ? standards[f.id] : erlaubt ? alt : standards[f.id]
  }
  return neu
}
