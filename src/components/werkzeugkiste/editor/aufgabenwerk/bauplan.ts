import type { Block } from '@/lib/werkzeugkiste-editor'
import {
  LUECKEN_TYPEN,
  hatEinzelnesSternchen,
  hatHtmlReste,
  luecken,
  markWoerter,
  zerlege,
  type LueckenTyp,
} from '@/components/werkzeugkiste/editor/aufgabenwerk/luecken'

/**
 * Bauplan der Aufgaben, die sich an Ort und Stelle bearbeiten lassen (PROJ-114).
 *
 * **Einzige Quelle für App und Seite:** Das Aufgabenwerk in der Vorschau zeichnet danach,
 * die App prüft danach, was die Seite zurückschickt, und das Seiten-Skript findet danach
 * den angeklickten Eintrag. Ein Typ ohne Bauplan öffnet sich (noch) in der Schublade.
 * Die gespeicherte Struktur ändert sich nie.
 *
 * Diese Datei darf nichts aus React oder der App laden: Sie wird in das Aufgabenwerk gebündelt.
 */

/** Ein Text-Teil der Aufgabe (Frage, Arbeitsanweisung, Überschrift) */
export interface TextTeil {
  art: 'text'
  feld: string
  label: string
  platzhalter: string
  pflicht: boolean
  max: number
  /** Leer = Feld wird entfernt (der Kern zeigt dann seine Standard-Anweisung) */
  leerWeg?: boolean
}

/** Gemeinsam für alle Listen */
interface ListenTeil {
  feld: string
  mindestens: number
  hoechstens: number
  einzahl: string
  mehrzahl: string
  /** Kurzname für Verlauf und Toast („loeschen-antwort“) */
  schluessel: string
}

/** Muster A: Antworten mit Kreis (genau eine richtig) und Rückmeldung je Antwort */
export interface AntwortenTeil extends ListenTeil {
  art: 'antworten'
  textFeld: string
  richtigFeld: string
  rueckmeldungFeld: string
}

/** Muster A, feste Form: Wahr/Falsch mit je einer Rückmeldung */
export interface WahrFalschTeil {
  art: 'wahrfalsch'
  feld: string
  rueckmeldungRichtig: string
  rueckmeldungFalsch: string
}

/** Ein Teil eines Paars (Muster C) */
export interface PaarFeld {
  feld: string
  label: string
  platzhalter: string
  max: number
}

/** Muster C: Paare – kurz nebeneinander oder lang zum Aufklappen */
export interface PaareTeil extends ListenTeil {
  art: 'paare'
  links: PaarFeld
  rechts: PaarFeld
  lang: boolean
  /** Satz am zugeklappten Eintrag, wenn der zweite Teil fehlt */
  fehlt: string
}

/** Muster E: Text mit Lücken (Sternchen-Schreibweise bleibt gespeichert) */
export interface LueckenTeil {
  art: 'luecken'
  feld: string
  typ: LueckenTyp
  /** „Als Lücke“ bzw. „Als Lösung“ */
  knopf: string
  einzahl: string
  mehrzahl: string
  tipp: boolean
  varianten: boolean
}

export type Teil = TextTeil | AntwortenTeil | WahrFalschTeil | PaareTeil | LueckenTeil

export interface Bauplan {
  muster: 'A' | 'C' | 'E'
  teile: Teil[]
  /** Seite: CSS-Auswahl der anklickbaren Einträge in der gebauten Aufgabe (fehlt = nur ganze Aufgabe) */
  finder?: string
}

export const TEXT_MAX = 2000
const FRAGE_MAX = 5000
const LUECKENTEXT_MAX = 20_000

const FRAGE: TextTeil = {
  art: 'text',
  feld: 'question',
  label: 'Frage',
  platzhalter: 'Frage eingeben, z. B. „Wer haftet für Schäden während des Transports?“',
  pflicht: true,
  max: FRAGE_MAX,
}

/** Arbeitsanweisung (`description`): leer zeigt der Kern seine Standard-Anweisung */
const anweisung = (standard: string): TextTeil => ({
  art: 'text',
  feld: 'description',
  label: 'Arbeitsanweisung',
  platzhalter: standard,
  pflicht: false,
  max: TEXT_MAX,
  leerWeg: true,
})

const AUSWAHL: Bauplan = {
  muster: 'A',
  finder: '.antworten .antwort',
  teile: [
    FRAGE,
    {
      art: 'antworten',
      feld: 'answers',
      textFeld: 'text',
      richtigFeld: 'correct',
      rueckmeldungFeld: 'feedback',
      mindestens: 2,
      hoechstens: 10,
      einzahl: 'Antwort',
      mehrzahl: 'Antworten',
      schluessel: 'antwort',
    },
  ],
}

const lueckenPlan = (typ: LueckenTyp, standard: string, knopf: string, einzahl: string, mehrzahl: string, finder: string): Bauplan => ({
  muster: 'E',
  finder,
  teile: [
    anweisung(standard),
    {
      art: 'luecken',
      feld: 'text',
      typ,
      knopf,
      einzahl,
      mehrzahl,
      tipp: typ === 'advanced_fill_blanks' || typ === 'drag_words',
      varianten: typ === 'fill_blanks' || typ === 'advanced_fill_blanks',
    },
  ],
})

export const BAUPLAENE: Record<string, Bauplan> = {
  multiple_choice: AUSWAHL,
  single_choice: AUSWAHL,
  true_false: {
    muster: 'A',
    finder: '.antworten .antwort',
    teile: [
      { ...FRAGE, label: 'Aussage', platzhalter: 'Aussage eingeben, z. B. „Der Frachtführer haftet nach CMR.“' },
      { art: 'wahrfalsch', feld: 'correct', rueckmeldungRichtig: 'feedback_correct', rueckmeldungFalsch: 'feedback_wrong' },
    ],
  },
  // ── Muster E ──
  fill_blanks: lueckenPlan('fill_blanks', 'Ergänze die fehlenden Wörter.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  advanced_fill_blanks: lueckenPlan('advanced_fill_blanks', 'Ergänze die fehlenden Wörter.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  drag_words: lueckenPlan('drag_words', 'Zieh die Wörter an die richtige Stelle.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  mark_words: lueckenPlan('mark_words', 'Markiere die Fachbegriffe im Text.', 'Als Lösung', 'Lösung', 'Lösungen', '.markiertext .wort'),
  // ── Muster C ──
  accordion: {
    muster: 'C',
    finder: '.klappliste details',
    teile: [
      {
        art: 'paare',
        feld: 'items',
        links: { feld: 'term', label: 'Begriff', platzhalter: 'Begriff, z. B. „Stückgut“', max: TEXT_MAX },
        rechts: { feld: 'definition', label: 'Erklärung', platzhalter: 'Erklärung, z. B. „Güter, die einzeln verladen werden …“', max: 10_000 },
        lang: true,
        fehlt: 'Erklärung fehlt',
        mindestens: 1,
        hoechstens: 40,
        einzahl: 'Begriff',
        mehrzahl: 'Begriffe',
        schluessel: 'begriff',
      },
    ],
  },
  dialog_cards: {
    muster: 'C',
    finder: '.karten .karte',
    teile: [
      { art: 'text', feld: 'title', label: 'Überschrift', platzhalter: 'Überschrift (optional)', pflicht: false, max: TEXT_MAX, leerWeg: true },
      {
        art: 'paare',
        feld: 'cards',
        links: { feld: 'front', label: 'Vorderseite', platzhalter: 'Vorderseite, z. B. „CMR“', max: TEXT_MAX },
        rechts: { feld: 'back', label: 'Rückseite', platzhalter: 'Rückseite, z. B. „Übereinkommen über den internationalen Straßengüterverkehr“', max: 10_000 },
        lang: true,
        fehlt: 'Rückseite fehlt',
        mindestens: 1,
        hoechstens: 40,
        einzahl: 'Karte',
        mehrzahl: 'Karten',
        schluessel: 'karte',
      },
    ],
  },
  crossword: {
    muster: 'C',
    teile: [
      anweisung('Kreuzworträtsel'),
      {
        art: 'paare',
        feld: 'words',
        links: { feld: 'word', label: 'Lösungswort', platzhalter: 'Lösungswort', max: 60 },
        rechts: { feld: 'clue', label: 'Umschreibung', platzhalter: 'Umschreibung, z. B. „Begleitpapier im Straßenverkehr“', max: TEXT_MAX },
        lang: false,
        fehlt: 'Umschreibung fehlt',
        mindestens: 2,
        hoechstens: 20,
        einzahl: 'Wort',
        mehrzahl: 'Wörter',
        schluessel: 'wort',
      },
    ],
  },
}

/** Typen, die das Aufgabenwerk an Ort und Stelle öffnet */
export const AUFGABENWERK_TYPEN = Object.keys(BAUPLAENE)

export function hatBauplan(typ: unknown): typ is string {
  return typeof typ === 'string' && Object.prototype.hasOwnProperty.call(BAUPLAENE, typ)
}

/** Für das Seiten-Skript: Typ → Auswahl der anklickbaren Einträge */
export const FINDER: Record<string, string> = Object.fromEntries(
  Object.entries(BAUPLAENE).flatMap(([t, b]) => (b.finder ? [[t, b.finder]] : [])),
)

/** Verlaufs-Gruppen der Seite, nach denen die App „… gelöscht – Rückgängig“ zeigt */
export const LOESCH_TEXTE: Record<string, string> = Object.fromEntries(
  Object.values(BAUPLAENE).flatMap((b) =>
    b.teile.flatMap((t) => (t.art === 'antworten' || t.art === 'paare' ? [[`loeschen-${t.schluessel}`, `${t.einzahl} gelöscht`]] : [])),
  ),
)

/** Worauf in der Seite geklickt wurde: die Frage/Anweisung oder ein Eintrag (Nummer = Stelle in der gebauten Seite) */
export type EintragOrt = { art: 'frage' } | { art: 'eintrag'; nr: number }

/** Liest einen Eintrag aus einer Nachricht; alles Fremde ergibt null */
export function liesEintrag(wert: unknown): EintragOrt | null {
  if (!wert || typeof wert !== 'object') return null
  const e = wert as Record<string, unknown>
  if (e.art === 'frage') return { art: 'frage' }
  if (e.art === 'eintrag' && typeof e.nr === 'number' && Number.isInteger(e.nr) && e.nr >= 0 && e.nr < 10_000) return { art: 'eintrag', nr: e.nr }
  return null
}

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
function istObjekt(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}
const listeVon = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/**
 * Welche gespeicherten Einträge zeigt der Kern, in welcher Reihenfolge? (Er lässt unvollständige weg.)
 * Ergebnis: je angezeigtem Eintrag die Nummer im Block – oder null, wenn er keinem Eintrag entspricht.
 */
function sichtbar(block: Block): Array<number | null> | null {
  const t = block.type
  if (t === 'multiple_choice' || t === 'single_choice') return listeVon(block.answers).map((_, i) => i)
  if (t === 'true_false') return [0, 1]
  if (t === 'accordion')
    return listeVon(block.items).flatMap((e, i) => (istObjekt(e) && s(e.term) && s(e.definition).trim() ? [i] : []))
  if (t === 'dialog_cards')
    return listeVon(block.cards).flatMap((e, i) => (istObjekt(e) && s(e.front) && s(e.back).trim() ? [i] : []))
  if (t === 'mark_words') return markWoerter(s(block.text))
  if ((LUECKEN_TYPEN as readonly string[]).includes(t)) return luecken(zerlege(t as LueckenTyp, s(block.text))).map((_, i) => i)
  return null
}

/**
 * Passt der angeklickte Eintrag zum gespeicherten Block? `anzahl` ist, wie viele Einträge die Seite
 * gezählt hat. Stimmt etwas nicht, öffnet die Aufgabe ohne Eintrag – nie an einem falschen.
 * Das Ergebnis nennt den Eintrag **im Block** (bei Lückentexten: die Nummer der Lücke).
 */
export function eintragFuerBlock(block: Block, eintrag: EintragOrt | null, anzahl: number | null): EintragOrt | null {
  if (!eintrag || !hatBauplan(block.type)) return null
  if (eintrag.art === 'frage') return eintrag
  const liste = sichtbar(block)
  if (!liste || anzahl !== liste.length || eintrag.nr >= liste.length) return null
  const nr = liste[eintrag.nr]
  return nr === null ? null : { art: 'eintrag', nr }
}

// ── Übernahme: Die App nimmt nur, was der Bauplan erlaubt ───────────────

type Ergebnis = { ok: true; block: Block } | { ok: false; grund: string }

/** Reiner Text: keine Steuerzeichen außer Zeilenumbruch und Tab, Länge begrenzt */
export function reinerText(wert: unknown, max: number): string | null {
  if (typeof wert !== 'string' || wert.length > max) return null
  return wert.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
}

/**
 * Felder eines Eintrags, die der Bauplan nicht kennt, bleiben erhalten – aber nur solche,
 * die es im gespeicherten Block schon gab, und nur einfache Werte (die Seite ist nicht vertrauenswürdig).
 */
function fremdeFelder(neu: Record<string, unknown>, bekannt: Set<string>, erlaubt: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(neu)) {
    if (bekannt.has(k) || !erlaubt.has(k)) continue
    if ((typeof v === 'string' && v.length <= TEXT_MAX) || typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

/** Liste mit Einträgen nach Bauplan: nur bekannte Felder als Text, bekannte Zusatzfelder bleiben */
function uebernimmListe(
  original: Block,
  vorschlag: Record<string, unknown>,
  teil: AntwortenTeil | PaareTeil,
  felder: Array<{ feld: string; max: number }>,
  extra: (roh: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown>[] | string {
  const liste = vorschlag[teil.feld]
  if (!Array.isArray(liste) || liste.length > teil.hoechstens) return `Zu viele ${teil.mehrzahl}.`
  const bekannt = new Set([...felder.map((f) => f.feld), ...Object.keys(extra({}))])
  const alt = listeVon(original[teil.feld])
  const erlaubt = new Set(alt.flatMap((a) => (istObjekt(a) ? Object.keys(a) : [])))
  const neu: Record<string, unknown>[] = []
  for (const roh of liste) {
    if (!istObjekt(roh)) return `Ungültiger Eintrag (${teil.einzahl}).`
    const eintrag: Record<string, unknown> = { ...fremdeFelder(roh, bekannt, erlaubt) }
    for (const f of felder) {
      const t = reinerText(roh[f.feld] ?? '', f.max)
      if (t === null) return `${teil.einzahl}: Text zu lang.`
      eintrag[f.feld] = t
    }
    neu.push({ ...eintrag, ...extra(roh) })
  }
  return neu
}

/**
 * Prüft den Vorschlag der Seite gegen den Bauplan und setzt ihn auf den gespeicherten Block.
 * Unbekannte Felder des Blocks kommen immer aus dem Original.
 */
export function uebernimmAufgabe(original: Block, vorschlag: unknown): Ergebnis {
  const plan = hatBauplan(original.type) ? BAUPLAENE[original.type] : null
  if (!plan) return { ok: false, grund: 'Dieser Aufgabentyp lässt sich hier nicht bearbeiten.' }
  if (!istObjekt(vorschlag) || vorschlag.type !== original.type) return { ok: false, grund: 'Die Änderung passt nicht zu dieser Aufgabe.' }
  const block: Block = { ...original }
  for (const teil of plan.teile) {
    if (teil.art === 'text' || teil.art === 'luecken') {
      const label = teil.art === 'text' ? teil.label : 'Text'
      const t = reinerText(vorschlag[teil.feld] ?? '', teil.art === 'text' ? teil.max : LUECKENTEXT_MAX)
      if (t === null) return { ok: false, grund: `${label}: zu lang oder ungültig.` }
      if (teil.art === 'text' && teil.leerWeg && !t.trim()) delete block[teil.feld]
      else block[teil.feld] = t
    } else if (teil.art === 'wahrfalsch') {
      if (typeof vorschlag[teil.feld] !== 'boolean') return { ok: false, grund: 'Wahr oder falsch fehlt.' }
      block[teil.feld] = vorschlag[teil.feld]
      for (const f of [teil.rueckmeldungRichtig, teil.rueckmeldungFalsch]) {
        const t = reinerText(vorschlag[f] ?? '', TEXT_MAX)
        if (t === null) return { ok: false, grund: 'Rückmeldung zu lang.' }
        if (t) block[f] = t
        else delete block[f]
      }
    } else if (teil.art === 'antworten') {
      const l = uebernimmListe(
        original,
        vorschlag,
        teil,
        [
          { feld: teil.textFeld, max: TEXT_MAX },
          { feld: teil.rueckmeldungFeld, max: TEXT_MAX },
        ],
        (roh) => ({ [teil.richtigFeld]: roh[teil.richtigFeld] === true }),
      )
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else {
      const l = uebernimmListe(original, vorschlag, teil, [teil.links, teil.rechts], () => ({}))
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    }
  }
  return { ok: true, block }
}

// ── Hinweise am Ort (gleiche Regeln in Seite und Tests) ─────────────────

export type Hinweis = { wo: string; text: string }

/** Was an der Aufgabe noch fehlt; `wo` ist das Feld (bei Listen auch `feld-…`) */
export function hinweise(block: Block): Hinweis[] {
  const plan = hatBauplan(block.type) ? BAUPLAENE[block.type] : null
  if (!plan) return []
  const out: Hinweis[] = []
  for (const teil of plan.teile) {
    if (teil.art === 'text' && teil.pflicht && !s(block[teil.feld]).trim()) {
      out.push({ wo: teil.feld, text: `${teil.label} fehlt.` })
    }
    if (teil.art === 'antworten' || teil.art === 'paare') {
      const l = listeVon(block[teil.feld]).filter(istObjekt)
      if (l.length < teil.mindestens) out.push({ wo: teil.feld, text: `Mindestens ${teil.mindestens} ${teil.mindestens === 1 ? teil.einzahl : teil.mehrzahl} nötig.` })
    }
    if (teil.art === 'antworten') {
      const l = listeVon(block[teil.feld]).filter(istObjekt)
      const richtig = l.filter((a) => a[teil.richtigFeld] === true).length
      if (l.length >= teil.mindestens && richtig !== 1) out.push({ wo: teil.feld, text: 'Klick auf den Kreis vor der richtigen Antwort.' })
      if (l.some((a) => !s(a[teil.textFeld]).trim())) out.push({ wo: `${teil.feld}-leer`, text: `Eine ${teil.einzahl} ist noch leer.` })
    }
    if (teil.art === 'luecken') {
      const text = s(block[teil.feld])
      const st = zerlege(teil.typ, text)
      if (!text.trim()) out.push({ wo: teil.feld, text: 'Schreib den Text hier hinein.' })
      else if (luecken(st).length === 0)
        out.push({ wo: teil.feld, text: `Noch keine ${teil.mehrzahl}: Wort auswählen und „${teil.knopf}“ klicken.` })
      if (hatEinzelnesSternchen(st)) out.push({ wo: `${teil.feld}-stern`, text: 'Im Text steht ein einzelnes Sternchen (*). Schüler sähen es als Zeichen.' })
      if (hatHtmlReste(text)) out.push({ wo: `${teil.feld}-html`, text: 'Im Text stehen HTML-Zeichen (<p>), die Lernende sehen würden.' })
    }
  }
  return out
}
