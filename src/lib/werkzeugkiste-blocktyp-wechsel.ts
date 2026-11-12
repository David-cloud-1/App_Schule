import { beispielBlock, istBeispiel } from '@/lib/werkzeugkiste-katalog'
import type { Block } from '@/lib/werkzeugkiste-editor'

/**
 * PROJ-95: Typ eines Blocks wechseln. Reine Rechenfunktionen ohne Oberfläche:
 * Block rein, neuer Block samt Dialoglisten („übernommen / geht verloren / bitte prüfen") raus.
 * Dialog und Ergebnis kommen aus derselben Berechnung und können nicht auseinanderlaufen.
 */

export interface WechselPlan {
  block: Block
  uebernommen: string[]
  verloren: string[]
  pruefen: string[]
  /** Unverändertes Beispiel: das Beispiel des Zieltyps ersetzt es ohne Dialog (E4) */
  beispiel: boolean
}

/** Familien (E1). `single_choice` gehört zur Auswahlfrage und wechselt wie `multiple_choice`. */
export const FAMILIEN: Record<string, string[]> = {
  fragen: ['multiple_choice', 'true_false', 'single_choice_set'],
  luecken: ['fill_blanks', 'advanced_fill_blanks', 'drag_words', 'mark_words'],
  karten: ['dialog_cards', 'flashcards', 'memory_game'],
  reihenfolgen: ['reihenfolge', 'image_sequencing'],
}

/** Katalogtyp eines Blocktyps: `single_choice` zählt als Auswahlfrage */
function katalogTyp(typ: string): string {
  return typ === 'single_choice' ? 'multiple_choice' : typ
}

export function familieVon(typ: string): string[] | null {
  const t = katalogTyp(typ)
  return Object.values(FAMILIEN).find((f) => f.includes(t)) ?? null
}

/** Typen, in die ein Block dieses Typs wechseln kann (ohne den eigenen Katalogtyp) */
export function wechselZiele(typ: string): string[] {
  const t = katalogTyp(typ)
  return (familieVon(t) ?? []).filter((z) => z !== t)
}

// ── Hilfen ───────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function zahl(n: number, einzahl: string, mehrzahl: string): string {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`
}

function klartext(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Felder, die das Formular des Typs kennt – alles andere zählt als „Weitere Angaben“ */
const BEKANNT: Record<string, string[]> = {
  multiple_choice: ['type', 'question', 'answers'],
  single_choice: ['type', 'question', 'answers'],
  true_false: ['type', 'question', 'correct', 'feedback_correct', 'feedback_wrong'],
  single_choice_set: ['type', 'questions'],
  fill_blanks: ['type', 'text', 'description'],
  advanced_fill_blanks: ['type', 'text', 'description'],
  drag_words: ['type', 'text', 'description'],
  mark_words: ['type', 'text', 'description'],
  dialog_cards: ['type', 'cards', 'title'],
  flashcards: ['type', 'cards', 'description'],
  memory_game: ['type', 'cards', 'pairs', 'description'],
  reihenfolge: ['type', 'items', 'description'],
  image_sequencing: ['type', 'steps', 'items', 'description'],
}

function weitereAngaben(block: Block): number {
  const bekannt = BEKANNT[String(block.type)] ?? ['type']
  return Object.keys(block).filter((k) => !bekannt.includes(k) && block[k] !== undefined).length
}

interface Ergebnis {
  block: Block
  uebernommen: string[]
  verloren: string[]
  pruefen: string[]
}

function neu(): Pick<Ergebnis, 'uebernommen' | 'verloren' | 'pruefen'> {
  return { uebernommen: [], verloren: [], pruefen: [] }
}

// ── Familie: Fragen ──────────────────────────────────────────────────────

interface FrageForm {
  frage: string
  /** Auswahl/Schnellfrage: Antworten; Richtig/falsch: undefined */
  antworten?: { text: string; correct: boolean; feedback: string }[]
  /** Nur Richtig/falsch */
  stimmt?: boolean
  feedbackRichtig?: string
  feedbackFalsch?: string
  /** Schnellfragen: Anzahl der Fragen insgesamt */
  fragenGesamt: number
}

function leseFrage(block: Block): FrageForm {
  const typ = String(block.type)
  if (typ === 'true_false') {
    return {
      frage: str(block.question),
      stimmt: block.correct === true || block.correct === 'true' || block.correct === 'wahr' || block.correct === 1,
      feedbackRichtig: str(block.feedback_correct),
      feedbackFalsch: str(block.feedback_wrong),
      fragenGesamt: 1,
    }
  }
  if (typ === 'single_choice_set') {
    const fragen = liste(block.questions)
    const f = obj(fragen[0])
    const richtig = str(f.correct)
    const falsch = liste(f.wrong).map(str)
    const antworten = [...(richtig ? [{ text: richtig, correct: true, feedback: '' }] : []), ...falsch.map((text) => ({ text, correct: false, feedback: '' }))]
    return { frage: str(f.question), antworten, fragenGesamt: fragen.length }
  }
  const antworten = liste(block.answers).map((a) => {
    const x = obj(a)
    return { text: str(x.text), correct: x.correct === true, feedback: str(x.feedback) }
  })
  return { frage: str(block.question), antworten, fragenGesamt: 1 }
}

function wechselFragen(block: Block, ziel: string): Ergebnis {
  const q = leseFrage(block)
  const quelle = String(block.type)
  const erg = neu()
  const antworten = q.antworten ?? []
  const richtige = antworten.filter((a) => a.correct)
  const mitFeedback = antworten.filter((a) => a.feedback.trim()).length
  const merke = (liste: string[], n: number, ein: string, mehr: string) => {
    if (n > 0) liste.push(zahl(n, ein, mehr))
  }

  if (q.frage.trim()) erg.uebernommen.push(quelle === 'true_false' ? 'Aussage als Frage' : 'Fragetext')

  if (ziel === 'true_false') {
    if (quelle === 'single_choice_set' && q.fragenGesamt > 1) erg.verloren.push(`${zahl(q.fragenGesamt - 1, 'weitere Frage', 'weitere Fragen')}`)
    merke(erg.verloren, antworten.length, 'Antwort', 'Antworten')
    if (mitFeedback) erg.verloren.push('Rückmeldungen zu den Antworten')
    erg.pruefen.push('Ob die Aussage stimmt, ist auf „richtig“ voreingestellt. Bitte prüfen und anpassen.')
    return { ...erg, block: { type: 'true_false', question: q.frage, correct: true, feedback_correct: '', feedback_wrong: '' } }
  }

  // Zielform: Antworten (Auswahlfrage, Schnellfragen)
  let basis: { text: string; correct: boolean; feedback: string }[]
  if (quelle === 'true_false') {
    const stimmt = q.stimmt === true
    basis = [
      { text: 'Richtig', correct: stimmt, feedback: stimmt ? (q.feedbackRichtig ?? '') : (q.feedbackFalsch ?? '') },
      { text: 'Falsch', correct: !stimmt, feedback: stimmt ? (q.feedbackFalsch ?? '') : (q.feedbackRichtig ?? '') },
    ]
    erg.uebernommen.push('Antworten „Richtig“ und „Falsch“', 'beide Rückmeldungen')
  } else {
    basis = antworten
  }

  if (ziel === 'multiple_choice') {
    if (quelle === 'single_choice_set') {
      if (q.fragenGesamt > 1) erg.verloren.push(zahl(q.fragenGesamt - 1, 'weitere Frage', 'weitere Fragen'))
      if (basis.length) erg.uebernommen.push(zahl(basis.length, 'Antwort', 'Antworten'))
      if (!richtige.length) erg.pruefen.push('Es war keine richtige Antwort eingetragen.')
    }
    const answers = basis.map((a) => ({ text: a.text, correct: a.correct, ...(a.feedback.trim() ? { feedback: a.feedback } : {}) }))
    return { ...erg, block: { type: 'multiple_choice', question: q.frage, answers } }
  }

  // Ziel: Schnellfragen
  const ersteRichtige = basis.find((a) => a.correct)
  const wrong = basis.filter((a) => !a.correct).map((a) => a.text)
  const weitere = Math.max(0, basis.filter((a) => a.correct).length - 1)
  if (quelle === 'multiple_choice' || quelle === 'single_choice') {
    if (basis.length) erg.uebernommen.push(zahl(basis.length - weitere, 'Antwort', 'Antworten'))
    if (weitere > 0) erg.verloren.push(zahl(weitere, 'weitere richtige Antwort', 'weitere richtige Antworten'))
    if (mitFeedback) erg.verloren.push('Rückmeldungen zu den Antworten')
    if (!ersteRichtige) erg.pruefen.push('Es war keine richtige Antwort markiert. Bitte eine eintragen.')
  } else {
    erg.verloren.push(...(q.feedbackRichtig?.trim() || q.feedbackFalsch?.trim() ? ['Rückmeldungen'] : []))
  }
  if (wrong.length < 2) erg.pruefen.push('Schnellfragen brauchen mindestens zwei falsche Antworten, sonst kann man raten.')
  return {
    ...erg,
    block: { type: 'single_choice_set', questions: [{ question: q.frage, correct: ersteRichtige?.text ?? '', wrong }] },
  }
}

// ── Familie: Lücken & Wörter ─────────────────────────────────────────────

type Luecke = { varianten: string[]; tipp: string }
type Stueck = string | Luecke

/** Zerlegt einen Text in Fließtext und Lücken – nach den Regeln des Quelltyps (seite.py) */
function parseLuecken(text: string, typ: string): Stueck[] {
  const teile: Stueck[] = []
  const re = /\*([^*]+)\*/g
  let pos = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > pos) teile.push(text.slice(pos, m.index))
    let inhalt = m[1]
    let tipp = ''
    pos = m.index + m[0].length
    if (typ === 'advanced_fill_blanks') {
      const innen = /^(.*?)\s*\(([^)]*)\)$/.exec(inhalt)
      if (innen) {
        inhalt = innen[1]
        tipp = innen[2].trim()
      } else {
        const nach = /^\s*\(([^)]*)\)/.exec(text.slice(pos))
        if (nach) {
          tipp = nach[1].trim()
          pos += nach[0].length
        }
      }
    }
    if (typ === 'drag_words') {
      const i = inhalt.indexOf(':')
      if (i >= 0) {
        tipp = inhalt.slice(i + 1).trim()
        inhalt = inhalt.slice(0, i)
      }
      teile.push({ varianten: [inhalt.trim()], tipp })
    } else if (typ === 'mark_words') {
      teile.push({ varianten: [inhalt], tipp: '' })
    } else {
      teile.push({ varianten: inhalt.split('/').map((v) => v.trim()).filter(Boolean), tipp })
    }
  }
  if (pos < text.length) teile.push(text.slice(pos))
  return teile
}

function schreibeLuecken(teile: Stueck[], ziel: string): string {
  return teile
    .map((t) => {
      if (typeof t === 'string') return t
      const wort = ziel === 'fill_blanks' || ziel === 'advanced_fill_blanks' ? t.varianten.join('/') : (t.varianten[0] ?? '')
      if (ziel === 'drag_words') return `*${wort}${t.tipp ? `:${t.tipp}` : ''}*`
      return `*${wort}*`
    })
    .join('')
}

function wechselLuecken(block: Block, ziel: string): Ergebnis {
  const quelle = String(block.type)
  const erg = neu()
  const teile = parseLuecken(str(block.text), quelle)
  const luecken = teile.filter((t): t is Luecke => typeof t !== 'string')
  const text = schreibeLuecken(teile, ziel)
  const zielHatVarianten = ziel === 'fill_blanks' || ziel === 'advanced_fill_blanks'
  const zielHatTipp = ziel === 'drag_words'
  const mitVarianten = luecken.filter((l) => l.varianten.length > 1).length
  const mitTipp = luecken.filter((l) => l.tipp).length

  erg.uebernommen.push('Text', zahl(luecken.length, 'markiertes Wort', 'markierte Wörter'))
  const desc = str(block.description)
  if (desc.trim()) erg.uebernommen.push('Arbeitsauftrag')
  if (mitVarianten && !zielHatVarianten) erg.verloren.push(`Alternative Schreibweisen (${zahl(mitVarianten, 'Lücke', 'Lücken')})`)
  if (mitTipp && !zielHatTipp) erg.verloren.push(zahl(mitTipp, 'Hinweis', 'Hinweise'))
  if (mitTipp && zielHatTipp) erg.uebernommen.push(zahl(mitTipp, 'Tipp', 'Tipps'))
  if (ziel === 'advanced_fill_blanks') erg.pruefen.push('Die Lücken haben keinen Hinweis. Bei Bedarf in der Rohfassung ergänzen.')
  if (!luecken.length) erg.pruefen.push('Der Text enthält keine mit Sternchen markierten Wörter.')

  const neuerBlock: Block = { type: ziel, text, ...(desc.trim() ? { description: desc } : {}) }
  return { ...erg, block: neuerBlock }
}

// ── Familie: Karten ──────────────────────────────────────────────────────

interface Karte {
  front: string
  back: string
}

function leseKarten(block: Block): Karte[] {
  const roh = liste(block.cards).length ? liste(block.cards) : liste(block.pairs)
  return roh.map((k) => {
    const x = obj(k)
    const hinten = x.back ?? x.b
    return { front: str(x.front ?? x.a), back: Array.isArray(hinten) ? hinten.map(str).join('/') : str(hinten) }
  })
}

const LANG = 40

function wechselKarten(block: Block, ziel: string): Ergebnis {
  const quelle = String(block.type)
  const erg = neu()
  let karten = leseKarten(block)
  const desc = str(block.description)
  const titel = str(block.title)

  erg.uebernommen.push(zahl(karten.length, 'Karte', 'Karten'))
  if (quelle !== 'dialog_cards' && desc.trim() && ziel !== 'dialog_cards') erg.uebernommen.push('Arbeitsauftrag')
  if (quelle !== 'dialog_cards' && desc.trim() && ziel === 'dialog_cards') erg.verloren.push('Arbeitsauftrag')
  if (quelle === 'dialog_cards' && titel.trim()) erg.verloren.push('Titel')

  if (ziel === 'flashcards') {
    const mitHtml = karten.filter((k) => /<[^>]+>/.test(k.back)).length
    if (mitHtml) {
      karten = karten.map((k) => ({ ...k, back: klartext(k.back) }))
      erg.pruefen.push(`Formatierung auf den Rückseiten entfällt (${zahl(mitHtml, 'Karte', 'Karten')}). Die Rückseite ist hier die erwartete Antwort.`)
    }
    const lang = karten.filter((k) => k.back.length > LANG).length
    if (lang) erg.pruefen.push(`${zahl(lang, 'Rückseite ist', 'Rückseiten sind')} lang. Zum Eintippen eignen sich kurze Antworten.`)
    if (karten.length < 2) erg.pruefen.push('Lernkarten zum Tippen brauchen mindestens 2 Karten.')
  }
  if (ziel === 'memory_game') {
    if (karten.length < 3) erg.pruefen.push('Memory braucht mindestens 3 Paare, sonst wird es übersprungen.')
    if (karten.length > 10) erg.pruefen.push(`Memory zeigt höchstens 10 Paare. Die übrigen ${karten.length - 10} bleiben im Block, werden aber nicht gespielt.`)
    const lang = karten.filter((k) => k.front.length > LANG || k.back.length > LANG).length
    if (lang) erg.pruefen.push(`${zahl(lang, 'Karte ist', 'Karten sind')} lang. Memory liest sich mit kurzen Begriffen besser.`)
  }
  if (quelle === 'flashcards' && ziel !== 'flashcards' && karten.some((k) => k.back.includes('/'))) {
    erg.pruefen.push('Mehrere akzeptierte Antworten (mit „/“) stehen jetzt als Text auf der Rückseite.')
  }

  const cards = karten.map((k) => ({ front: k.front, back: k.back }))
  const neuerBlock: Block =
    ziel === 'dialog_cards'
      ? { type: ziel, cards }
      : { type: ziel, ...(desc.trim() ? { description: desc } : {}), cards }
  return { ...erg, block: neuerBlock }
}

// ── Familie: Reihenfolgen ────────────────────────────────────────────────

function wechselReihenfolge(block: Block, ziel: string): Ergebnis {
  const quelle = String(block.type)
  const erg = neu()
  const desc = str(block.description)
  const roh = quelle === 'image_sequencing' ? (liste(block.steps).length ? liste(block.steps) : liste(block.items)) : liste(block.items)
  const schritte = roh.map((x) => {
    if (x && typeof x === 'object') {
      const o = obj(x)
      return { text: str(o.text ?? o.label).trim(), path: str(o.path) }
    }
    return { text: str(x).trim(), path: '' }
  })
  erg.uebernommen.push(zahl(schritte.length, 'Schritt', 'Schritte'))
  if (desc.trim()) erg.uebernommen.push('Arbeitsauftrag')
  if (schritte.length < 3) erg.pruefen.push('Es braucht mindestens 3 Schritte, sonst wird die Aufgabe übersprungen.')

  if (ziel === 'reihenfolge') {
    const bilder = schritte.filter((x) => x.path).length
    if (bilder) erg.verloren.push(zahl(bilder, 'Bild', 'Bilder'))
    const ohneText = schritte.filter((x) => !x.text).length
    if (ohneText) erg.pruefen.push(`${zahl(ohneText, 'Schritt ohne Text heißt', 'Schritte ohne Text heißen')} jetzt „Schritt N“. Bitte Texte eintragen.`)
    const items = schritte.map((x, i) => x.text || `Schritt ${i + 1}`)
    return { ...erg, block: { type: 'reihenfolge', ...(desc.trim() ? { description: desc } : {}), items } }
  }
  const steps = schritte.map((x) => ({ text: x.text }))
  return { ...erg, block: { type: 'image_sequencing', ...(desc.trim() ? { description: desc } : {}), steps } }
}

// ── Einstieg ─────────────────────────────────────────────────────────────

/**
 * Plan für den Wechsel eines Blocks in den Zieltyp, oder `null`, wenn der Zieltyp
 * nicht zur Familie des Blocks gehört. Unveränderte Beispielblöcke bekommen das
 * Beispiel des Zieltyps (E4).
 */
export function planeWechsel(block: Block, ziel: string): WechselPlan | null {
  const quelle = String(block.type ?? '')
  if (!wechselZiele(quelle).includes(ziel)) return null
  if (istBeispiel(block)) {
    return { block: beispielBlock(ziel), uebernommen: [], verloren: [], pruefen: [], beispiel: true }
  }
  const familie = familieVon(quelle)
  let erg: Ergebnis
  if (familie === FAMILIEN.fragen) erg = wechselFragen(block, ziel)
  else if (familie === FAMILIEN.luecken) erg = wechselLuecken(block, ziel)
  else if (familie === FAMILIEN.karten) erg = wechselKarten(block, ziel)
  else erg = wechselReihenfolge(block, ziel)

  const weitere = weitereAngaben(block)
  if (weitere > 0) erg.verloren.push(`Weitere Angaben (${weitere})`)
  return { ...erg, beispiel: false }
}
