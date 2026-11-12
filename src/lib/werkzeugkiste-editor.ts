/**
 * Baukasten-Editor (PROJ-89): Struktur eines Materials und reine Operationen
 * darauf. Läuft im Browser und auf dem Server. Kein YAML hier – YAML liest und
 * schreibt nur der Werkzeugkiste-Kern (PyYAML), damit der Editor genau das
 * zeigt, was später gebaut wird.
 *
 * Die Struktur entspricht der Kapitel-YAML des Master-Prompts:
 *   cover · chapters[] (title, elements[]) · final_chapter (question_set, summary)
 * Unbekannte Felder werden immer unverändert durchgereicht.
 */

export type Block = { type: string } & Record<string, unknown>

export type Thema = { title?: string; elements: Block[] } & Record<string, unknown>

export type Deckblatt = { title?: string; subtitle?: string; school?: string; duration?: string } & Record<string, unknown>

export type Abschluss = Record<string, unknown>

export interface Struktur extends Record<string, unknown> {
  cover: Deckblatt
  chapters: Thema[]
  final_chapter?: Abschluss
}

/** Genaue Stelle eines Befunds (vom Kern) */
export type Stelle = { kapitel: number; element?: number } | { abschluss: true }

export interface EditorBefund {
  text: string
  schwere: 'hoch' | 'mittel'
  stellen: Stelle[]
}

/** Was der Editor beim Öffnen bekommt */
export interface EditorDaten {
  id: string
  titel: string
  werkzeug: string
  struktur: Struktur
  /** Stand des gespeicherten Entwurfs (Zwei-Tabs-Regel); null = es gibt (noch) keinen */
  stand: string | null
  befunde: EditorBefund[] | null
  /** Ist der Link für alle aktiv bzw. liegt das Material im Regal? (Text im Veröffentlichen-Dialog) */
  oeffentlich: boolean
  imRegal: boolean
}

/** Werkzeuge, deren Seite aus der Kapitel-YAML gebaut wird (E2) */
export const EDITIERBARE_WERKZEUGE = ['skript', 'kreativ', 'differenzierung', 'arbeitsblatt', 'lernsituation'] as const

/** Obergrenze für den gespeicherten Entwurf (Zeichen JSON), wie die Datenbank-Regel */
export const ENTWURF_MAX_ZEICHEN = 2_400_000

/** Wie lange nach der letzten Eingabe automatisch gespeichert wird (E10: höchstens 2 s) */
export const SPEICHERN_NACH_MS = 1200

/** So viele Schritte merkt sich „Rückgängig“ mindestens (E11) */
export const RUECKGAENGIG_SCHRITTE = 60

export function istEditierbar(m: {
  werkzeug: string
  status: string
  format?: string | null
}): boolean {
  return (
    m.status === 'fertig' &&
    (EDITIERBARE_WERKZEUGE as readonly string[]).includes(m.werkzeug) &&
    m.format === 'seite'
  )
}

/**
 * Weg in den Baukasten für ein Material (PROJ-89, Paket 3):
 * - `bearbeiten`: fertige Interaktive Seite eines der fünf Kapitel-Werkzeuge
 * - `als-seite`: fertiges H5P-Material dieser Werkzeuge mit Antwort – erst als Seite kopieren (E12)
 */
export function baukastenWeg(m: { werkzeug: string; status: string; format?: string | null; hatAntwort?: boolean }): 'bearbeiten' | 'als-seite' | null {
  if (m.status !== 'fertig' || !(EDITIERBARE_WERKZEUGE as readonly string[]).includes(m.werkzeug)) return null
  if (m.format === 'seite') return 'bearbeiten'
  if (m.format === 'h5p' && m.hatAntwort) return 'als-seite'
  return null
}

/** Adresse des Editors */
export function bearbeitenHref(id: string): string {
  return `/admin/werkzeugkiste/bearbeiten/${id}`
}

// ── Klartext ─────────────────────────────────────────────────────────────

/** Alle Typen, die seite.py baut – in Alltagssprache (nie `fill_blanks` in der Oberfläche) */
export const TYP_NAMEN: Record<string, string> = {
  text: 'Lehrtext',
  image: 'Bild',
  accordion: 'Begriffe zum Aufklappen',
  multiple_choice: 'Auswahlfrage',
  single_choice: 'Auswahlfrage (eine richtig)',
  single_choice_set: 'Schnellfragen',
  true_false: 'Richtig oder falsch',
  fill_blanks: 'Lückentext',
  advanced_fill_blanks: 'Lückentext mit Hinweis',
  drag_words: 'Wörter ziehen',
  mark_words: 'Wörter markieren',
  drag_drop: 'Zuordnen',
  crossword: 'Kreuzworträtsel',
  dialog_cards: 'Lernkarten zum Umdrehen',
  reihenfolge: 'Reihenfolge',
  summary: 'Zusammenfassung',
  question_set: 'Kapiteltest',
  calculation_example: 'Rechenbeispiel',
  calculation_exercise: 'Rechenaufgabe',
  arithmetic_quiz: 'Kopfrechnen',
  interactive_video: 'Video mit Fragen',
  freitext: 'Offene Frage',
  trainer: 'Trainer',
  bildzuordnung: 'Bildzuordnung',
  find_words: 'Wörtersuche',
  memory_game: 'Memory',
  flashcards: 'Lernkarten zum Tippen',
  image_sequencing: 'Bilder ordnen',
  rechenweg: 'Rechenweg',
  fallakte: 'Fallakte',
  schaetzrunde: 'Schätzrunde',
  selbsteinschaetzung: 'Selbsteinschätzung',
}

export function typName(typ: string): string {
  return TYP_NAMEN[typ] ?? 'Unbekannter Block'
}

export function istBekannterTyp(typ: string): boolean {
  return typ in TYP_NAMEN
}

/** HTML zu Klartext für die Kurzzeile (nur Anzeige, keine Sicherheitsfunktion) */
function klartext(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const KURZ_FELDER = ['title', 'question', 'task', 'text', 'content', 'description', 'formula', 'caption', 'alt', 'path', 'url']

/** Die ersten Wörter eines Blocks für die Gliederung */
export function kurzzeile(block: Block, max = 70): string {
  for (const feld of KURZ_FELDER) {
    const wert = block[feld]
    if (typeof wert === 'string' && wert.trim()) {
      const t = klartext(wert)
      if (t) return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
    }
  }
  for (const liste of ['questions', 'items', 'cards', 'answers', 'words', 'statements']) {
    const wert = block[liste]
    if (Array.isArray(wert) && wert.length) return `${wert.length} ${wert.length === 1 ? 'Eintrag' : 'Einträge'}`
  }
  return ''
}

// ── Operationen (immer neue Objekte, nie verändern) ─────────────────────

export interface Ort {
  thema: number
  block: number
}

function themenKopie(s: Struktur): Thema[] {
  return s.chapters.map((t) => ({ ...t, elements: [...t.elements] }))
}

/** Tiefe Kopie über JSON – die Struktur ist reines JSON */
export function kopie<T>(wert: T): T {
  return JSON.parse(JSON.stringify(wert)) as T
}

/**
 * Block verschieben. `nach.block` ist die Position im Zielthema **vor** dem
 * Entfernen (so liefern es Ziehen und „nach oben/unten“).
 */
export function verschiebeBlock(s: Struktur, von: Ort, nach: Ort): Struktur {
  const themen = themenKopie(s)
  const quelle = themen[von.thema]
  const ziel = themen[nach.thema]
  if (!quelle || !ziel || von.block < 0 || von.block >= quelle.elements.length) return s
  const [block] = quelle.elements.splice(von.block, 1)
  let index = nach.block
  if (von.thema === nach.thema && nach.block > von.block) index -= 1
  index = Math.max(0, Math.min(index, ziel.elements.length))
  if (von.thema === nach.thema && index === von.block) return s
  ziel.elements.splice(index, 0, block)
  return { ...s, chapters: themen }
}

export function verschiebeThema(s: Struktur, von: number, nach: number): Struktur {
  if (von === nach || von < 0 || nach < 0 || von >= s.chapters.length || nach >= s.chapters.length) return s
  const themen = [...s.chapters]
  const [t] = themen.splice(von, 1)
  themen.splice(nach, 0, t)
  return { ...s, chapters: themen }
}

export function loescheBlock(s: Struktur, ort: Ort): Struktur {
  const themen = themenKopie(s)
  if (!themen[ort.thema]?.elements[ort.block]) return s
  themen[ort.thema].elements.splice(ort.block, 1)
  return { ...s, chapters: themen }
}

export function dupliziereBlock(s: Struktur, ort: Ort): Struktur {
  const themen = themenKopie(s)
  const block = themen[ort.thema]?.elements[ort.block]
  if (!block) return s
  themen[ort.thema].elements.splice(ort.block + 1, 0, kopie(block))
  return { ...s, chapters: themen }
}

export function setzeBlock(s: Struktur, ort: Ort, block: Block): Struktur {
  const themen = themenKopie(s)
  if (!themen[ort.thema]?.elements[ort.block]) return s
  themen[ort.thema].elements[ort.block] = block
  return { ...s, chapters: themen }
}

export function loescheThema(s: Struktur, index: number): Struktur {
  if (!s.chapters[index]) return s
  return { ...s, chapters: s.chapters.filter((_, i) => i !== index) }
}

export function dupliziereThema(s: Struktur, index: number): Struktur {
  const t = s.chapters[index]
  if (!t) return s
  const neu = { ...kopie(t), title: `${t.title ?? 'Thema'} (Kopie)` }
  const themen = [...s.chapters]
  themen.splice(index + 1, 0, neu)
  return { ...s, chapters: themen }
}

export function neuesThema(s: Struktur, titel = 'Neues Thema'): Struktur {
  return { ...s, chapters: [...s.chapters, { title: titel, elements: [] }] }
}

export function setzeThemaTitel(s: Struktur, index: number, titel: string): Struktur {
  if (!s.chapters[index]) return s
  const themen = [...s.chapters]
  themen[index] = { ...themen[index], title: titel }
  return { ...s, chapters: themen }
}

export function setzeDeckblatt(s: Struktur, cover: Deckblatt): Struktur {
  return { ...s, cover }
}

export function setzeAbschluss(s: Struktur, abschluss: Abschluss | undefined): Struktur {
  const neu = { ...s }
  if (abschluss === undefined) delete neu.final_chapter
  else neu.final_chapter = abschluss
  return neu
}

// ── Befunde zuordnen ─────────────────────────────────────────────────────

export type BefundSchluessel = `k${number}` | `k${number}-e${number}` | 'abschluss'

export function stellenSchluessel(stelle: Stelle): BefundSchluessel {
  if ('abschluss' in stelle) return 'abschluss'
  return stelle.element === undefined ? `k${stelle.kapitel}` : `k${stelle.kapitel}-e${stelle.element}`
}

/** Wie viele Befunde hängen an welchem Thema/Block? (ein Befund kann mehrere Stellen haben) */
export function befundeJeStelle(befunde: EditorBefund[] | null): Map<BefundSchluessel, number> {
  const karte = new Map<BefundSchluessel, number>()
  for (const b of befunde ?? []) {
    for (const st of b.stellen) {
      const k = stellenSchluessel(st)
      karte.set(k, (karte.get(k) ?? 0) + 1)
    }
  }
  return karte
}

/** Sprungmarke in der Editor-Vorschau (data-wk im Kern) */
export function sprungmarke(ort: Ort | 'deckblatt' | 'abschluss' | { thema: number }): string {
  if (ort === 'deckblatt') return 'deckblatt'
  if (ort === 'abschluss') return 'abschluss'
  return 'block' in ort ? `k${ort.thema}-e${ort.block}` : `k${ort.thema}`
}
