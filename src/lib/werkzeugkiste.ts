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
}

const H5P: WerkzeugFormat = { id: 'h5p', label: 'H5P für Moodle', hinweis: 'Ergebnisse zählen im Notenbuch' }
const SEITE: WerkzeugFormat = { id: 'seite', label: 'Interaktive Seite', hinweis: 'Zum Üben, auch offline und druckbar' }

export const WERKZEUGE: Werkzeug[] = [
  { id: 'skript', name: 'Ganzes Skript', gruppe: 'selbstlernen', beschreibung: 'Skript vollständig interaktiv', icon: BookOpen, aktiv: true, formate: [H5P, SEITE] },
  { id: 'kreativ', name: 'Kreative Einheit', gruppe: 'selbstlernen', beschreibung: 'Schüler erarbeiten es selbst', icon: Sparkles, aktiv: false, formate: [H5P, SEITE] },
  { id: 'differenzierung', name: 'Differenzierung', gruppe: 'selbstlernen', beschreibung: 'Dasselbe in mehreren Stufen', icon: BarChart3, aktiv: false, formate: [] },
  { id: 'kahoot', name: 'Kahoot-Quiz', gruppe: 'ueben', beschreibung: 'Wiederholung, Stundeneinstieg', icon: Timer, aktiv: false, formate: [] },
  { id: 'moodle', name: 'Moodle-Fragen', gruppe: 'ueben', beschreibung: 'Tests in der Lernplattform', icon: ListChecks, aktiv: false, formate: [] },
  { id: 'learningapps', name: 'LearningApps', gruppe: 'ueben', beschreibung: 'Inhalte zum Kopieren', icon: LayoutGrid, aktiv: false, formate: [] },
  { id: 'youtube', name: 'Video-Fragen', gruppe: 'ueben', beschreibung: 'Arbeitsauftrag zu einem Video', icon: MonitorPlay, aktiv: false, formate: [] },
  { id: 'arbeitsblatt', name: 'Arbeitsblatt', gruppe: 'unterricht', beschreibung: 'Blatt mit Lösung', icon: FileText, aktiv: false, formate: [] },
  { id: 'lernsituation', name: 'Lernsituation', gruppe: 'unterricht', beschreibung: 'Betrieblicher Auftrag', icon: Briefcase, aktiv: false, formate: [] },
  { id: 'pruefung', name: 'Klassenarbeit', gruppe: 'unterricht', beschreibung: 'IHK-Stil, AFB I–III', icon: ClipboardCheck, aktiv: false, formate: [] },
  { id: 'podcast', name: 'Podcast', gruppe: 'hoeren', beschreibung: 'Lern-Dialog als MP3', icon: Mic, aktiv: false, formate: [] },
  { id: 'lied', name: 'Lernlied', gruppe: 'hoeren', beschreibung: 'Fachbegriffe als Ohrwurm', icon: Music, aktiv: false, formate: [] },
]

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
}

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
  aktualisiertAm: string
}

/**
 * Darf dieser Schritt geöffnet werden? Vorwärts nur, was schon vorbereitet
 * ist: Prompt erst mit Einlesung, Antwort erst mit Prompt, Fertig erst mit Ergebnis.
 */
export function schrittErlaubt(ablauf: Pick<Ablauf, 'kennzahlen' | 'prompt' | 'ergebnis'>, schritt: AblaufSchritt): boolean {
  switch (schritt) {
    case 1:
      return true
    case 2:
      return !!ablauf.kennzahlen
    case 3:
    case 4:
      return !!ablauf.kennzahlen && !!ablauf.prompt
    case 5:
      return !!ablauf.ergebnis
  }
}

/** Schritt aus der Adresse, begrenzt auf das, was der Ablauf schon erlaubt */
export function schrittAusParam(
  param: string | null | undefined,
  ablauf: Pick<Ablauf, 'schritt' | 'kennzahlen' | 'prompt' | 'ergebnis'>,
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

/** Einstellungen beim Werkzeugwechsel: Format auf den Standard des neuen Werkzeugs, Rest bleibt */
export function einstellungenFuerWerkzeug(werkzeugId: string, bisher: AblaufEinstellungen): AblaufEinstellungen {
  const werkzeug = findeWerkzeug(werkzeugId)
  return { ...bisher, format: werkzeug?.formate[0]?.id ?? '' }
}
