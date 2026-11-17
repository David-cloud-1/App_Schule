import type { Block } from '@/lib/werkzeugkiste-editor'

/**
 * Bauplan der Aufgaben, die sich an Ort und Stelle bearbeiten lassen (PROJ-114).
 *
 * **Einzige Quelle für App und Seite:** Das Aufgabenwerk in der Vorschau zeichnet danach,
 * die App prüft danach, was die Seite zurückschickt. Ein Typ ohne Bauplan öffnet sich
 * (noch) in der Schublade. Die gespeicherte Struktur ändert sich nie.
 *
 * Diese Datei darf nichts aus React oder der App laden: Sie wird in das Aufgabenwerk gebündelt.
 */

/** Ein Text-Teil der Aufgabe (z. B. die Frage) */
export interface TextTeil {
  art: 'text'
  feld: string
  label: string
  platzhalter: string
  pflicht: boolean
  max: number
}

/** Muster A: Antworten mit Kreis (genau eine richtig) und Rückmeldung je Antwort */
export interface AntwortenTeil {
  art: 'antworten'
  feld: string
  textFeld: string
  richtigFeld: string
  rueckmeldungFeld: string
  mindestens: number
  hoechstens: number
  einzahl: string
}

/** Muster A, feste Form: Wahr/Falsch mit je einer Rückmeldung */
export interface WahrFalschTeil {
  art: 'wahrfalsch'
  feld: string
  rueckmeldungRichtig: string
  rueckmeldungFalsch: string
}

export type Teil = TextTeil | AntwortenTeil | WahrFalschTeil

export interface Bauplan {
  /** Muster für Tests und Anzeige */
  muster: 'A'
  teile: Teil[]
}

export const TEXT_MAX = 2000
const FRAGE_MAX = 5000

const FRAGE: TextTeil = {
  art: 'text',
  feld: 'question',
  label: 'Frage',
  platzhalter: 'Frage eingeben, z. B. „Wer haftet für Schäden während des Transports?“',
  pflicht: true,
  max: FRAGE_MAX,
}

const AUSWAHL: Bauplan = {
  muster: 'A',
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
    },
  ],
}

export const BAUPLAENE: Record<string, Bauplan> = {
  multiple_choice: AUSWAHL,
  single_choice: AUSWAHL,
  true_false: {
    muster: 'A',
    teile: [
      { ...FRAGE, label: 'Aussage', platzhalter: 'Aussage eingeben, z. B. „Der Frachtführer haftet nach CMR.“' },
      { art: 'wahrfalsch', feld: 'correct', rueckmeldungRichtig: 'feedback_correct', rueckmeldungFalsch: 'feedback_wrong' },
    ],
  },
}

/** Typen, die das Aufgabenwerk an Ort und Stelle öffnet */
export const AUFGABENWERK_TYPEN = Object.keys(BAUPLAENE)

export function hatBauplan(typ: unknown): typ is string {
  return typeof typ === 'string' && Object.prototype.hasOwnProperty.call(BAUPLAENE, typ)
}

/** Worauf in der Seite geklickt wurde */
export type EintragOrt = { art: 'frage' } | { art: 'antwort'; nr: number }

/** Liest einen Eintrag aus einer Nachricht; alles Fremde ergibt null */
export function liesEintrag(wert: unknown): EintragOrt | null {
  if (!wert || typeof wert !== 'object') return null
  const e = wert as Record<string, unknown>
  if (e.art === 'frage') return { art: 'frage' }
  if (e.art === 'antwort' && typeof e.nr === 'number' && Number.isInteger(e.nr) && e.nr >= 0 && e.nr < 100) return { art: 'antwort', nr: e.nr }
  return null
}

/**
 * Passt der angeklickte Eintrag zum gespeicherten Block? `anzahl` ist, wie viele Einträge
 * dieser Art die Seite gezählt hat. Stimmt etwas nicht, öffnet die Aufgabe ohne Eintrag –
 * nie an einem falschen.
 */
export function eintragFuerBlock(block: Block, eintrag: EintragOrt | null, anzahl: number | null): EintragOrt | null {
  if (!eintrag || !hatBauplan(block.type)) return null
  if (eintrag.art === 'frage') return eintrag
  if (block.type === 'true_false') return eintrag.nr < 2 && anzahl === 2 ? eintrag : null
  const antworten = Array.isArray(block.answers) ? block.answers : []
  return anzahl === antworten.length && eintrag.nr < antworten.length ? eintrag : null
}

/** Verlaufs-Gruppen der Seite, nach denen die App „… gelöscht – Rückgängig“ zeigt */
export const LOESCH_TEXTE: Record<string, string> = {
  'loeschen-antwort': 'Antwort gelöscht',
}

// ── Übernahme: Die App nimmt nur, was der Bauplan erlaubt ───────────────

type Ergebnis = { ok: true; block: Block } | { ok: false; grund: string }

/** Reiner Text: keine Steuerzeichen außer Zeilenumbruch, Länge begrenzt */
export function reinerText(wert: unknown, max: number): string | null {
  if (typeof wert !== 'string' || wert.length > max) return null
  return wert.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
}

function istObjekt(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
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
    if (teil.art === 'text') {
      const t = reinerText(vorschlag[teil.feld] ?? '', teil.max)
      if (t === null) return { ok: false, grund: `${teil.label}: zu lang oder ungültig.` }
      block[teil.feld] = t
    } else if (teil.art === 'wahrfalsch') {
      if (typeof vorschlag[teil.feld] !== 'boolean') return { ok: false, grund: 'Wahr oder falsch fehlt.' }
      block[teil.feld] = vorschlag[teil.feld]
      for (const f of [teil.rueckmeldungRichtig, teil.rueckmeldungFalsch]) {
        const t = reinerText(vorschlag[f] ?? '', TEXT_MAX)
        if (t === null) return { ok: false, grund: 'Rückmeldung zu lang.' }
        if (t) block[f] = t
        else delete block[f]
      }
    } else {
      const liste = vorschlag[teil.feld]
      if (!Array.isArray(liste) || liste.length > teil.hoechstens) return { ok: false, grund: `Zu viele ${teil.einzahl}en.` }
      const bekannt = new Set([teil.textFeld, teil.richtigFeld, teil.rueckmeldungFeld])
      const alt = Array.isArray(original[teil.feld]) ? (original[teil.feld] as unknown[]) : []
      const erlaubt = new Set(alt.flatMap((a) => (istObjekt(a) ? Object.keys(a) : [])))
      const neu: Record<string, unknown>[] = []
      for (const roh of liste) {
        if (!istObjekt(roh)) return { ok: false, grund: 'Ungültige Antwort.' }
        const text = reinerText(roh[teil.textFeld] ?? '', TEXT_MAX)
        const rueck = reinerText(roh[teil.rueckmeldungFeld] ?? '', TEXT_MAX)
        if (text === null || rueck === null) return { ok: false, grund: `${teil.einzahl} zu lang.` }
        neu.push({ ...fremdeFelder(roh, bekannt, erlaubt), [teil.textFeld]: text, [teil.richtigFeld]: roh[teil.richtigFeld] === true, [teil.rueckmeldungFeld]: rueck })
      }
      block[teil.feld] = neu
    }
  }
  return { ok: true, block }
}

// ── Hinweise am Ort (gleiche Regeln in Seite und Tests) ─────────────────

export type Hinweis = { wo: string; text: string }

/** Was an der Aufgabe noch fehlt; `wo` ist das Feld bzw. `answers` für die Antwortliste */
export function hinweise(block: Block): Hinweis[] {
  const plan = hatBauplan(block.type) ? BAUPLAENE[block.type] : null
  if (!plan) return []
  const out: Hinweis[] = []
  for (const teil of plan.teile) {
    if (teil.art === 'text' && teil.pflicht && !String(block[teil.feld] ?? '').trim()) {
      out.push({ wo: teil.feld, text: `${teil.label} fehlt.` })
    }
    if (teil.art === 'antworten') {
      const l = Array.isArray(block[teil.feld]) ? (block[teil.feld] as Record<string, unknown>[]) : []
      const richtig = l.filter((a) => istObjekt(a) && a[teil.richtigFeld] === true).length
      if (l.length < teil.mindestens) out.push({ wo: teil.feld, text: `Mindestens ${teil.mindestens} Antworten nötig.` })
      else if (richtig !== 1) out.push({ wo: teil.feld, text: 'Klick auf den Kreis vor der richtigen Antwort.' })
      if (l.some((a) => istObjekt(a) && !String(a[teil.textFeld] ?? '').trim())) out.push({ wo: `${teil.feld}-leer`, text: 'Eine Antwort ist noch leer.' })
    }
  }
  return out
}
