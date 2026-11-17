/**
 * Lückentext-Übersetzer (PROJ-114, Muster E).
 *
 * Gespeichert wird weiter die Sternchen-Schreibweise des Kerns. In der Seite sieht die Lehrkraft
 * dagegen Text mit grünen Lücken. Diese Datei übersetzt hin und zurück – **mit denselben Regeln
 * wie der Kern** (`seite.py`), damit die Seite genau das zeigt, was die Schüler bekommen.
 *
 * Rundreise: Unveränderte Lücken behalten ihre Original-Schreibweise (`roh`), deshalb ergibt
 * `setzeZusammen(zerlege(t))` immer wieder `t` – auch bei ungewöhnlichen Schreibweisen.
 *
 * Darf nichts aus React oder der App laden: wird in das Aufgabenwerk gebündelt.
 */

export type LueckenTyp = 'fill_blanks' | 'advanced_fill_blanks' | 'drag_words' | 'mark_words'
export const LUECKEN_TYPEN: readonly LueckenTyp[] = ['fill_blanks', 'advanced_fill_blanks', 'drag_words', 'mark_words']

export interface Luecke {
  art: 'luecke'
  /** Originale Schreibweise im Text; fehlt, sobald die Lücke geändert wurde */
  roh?: string
  wort: string
  /** Weitere richtige Schreibweisen (Lückentext, erweiterter Lückentext) */
  varianten: string[]
  /** Tipp (erweiterter Lückentext, Wörter ziehen) */
  tipp: string
}
export type Stueck = { art: 'text'; text: string } | Luecke

/** Kern: `_LUECKE` */
const STERN = /\*([^*]+)\*/g
/** Kern: `_LUECKE_HINWEIS` (Tipp in Klammern, innerhalb oder hinter den Sternchen) */
const STERN_HINWEIS = /\*([^*]+?)\s*\(([^)]*)\)\*|\*([^*]+)\*(?:[ \t]*\(([^)]*)\))?/g

function lueckeAus(typ: LueckenTyp, m: RegExpExecArray): Luecke {
  if (typ === 'advanced_fill_blanks') {
    const wort = m[1] ?? m[3] ?? ''
    const tipp = (m[2] ?? m[4] ?? '').trim()
    const v = wort.split('/').map((x) => x.trim()).filter(Boolean)
    return { art: 'luecke', roh: m[0], wort: v[0] ?? wort.trim(), varianten: v.slice(1), tipp }
  }
  const inhalt = m[1]
  if (typ === 'drag_words') {
    const i = inhalt.indexOf(':')
    return { art: 'luecke', roh: m[0], wort: (i >= 0 ? inhalt.slice(0, i) : inhalt).trim(), varianten: [], tipp: i >= 0 ? inhalt.slice(i + 1).trim() : '' }
  }
  if (typ === 'fill_blanks') {
    const v = inhalt.split('/').map((x) => x.trim()).filter(Boolean)
    return { art: 'luecke', roh: m[0], wort: v[0] ?? inhalt.trim(), varianten: v.slice(1), tipp: '' }
  }
  return { art: 'luecke', roh: m[0], wort: inhalt, varianten: [], tipp: '' }
}

/** Text → Stücke (Text und Lücken im Wechsel) */
export function zerlege(typ: LueckenTyp, text: string): Stueck[] {
  const re = new RegExp((typ === 'advanced_fill_blanks' ? STERN_HINWEIS : STERN).source, 'g')
  const out: Stueck[] = []
  let pos = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > pos) out.push({ art: 'text', text: text.slice(pos, m.index) })
    out.push(lueckeAus(typ, m))
    pos = m.index + m[0].length
  }
  if (pos < text.length) out.push({ art: 'text', text: text.slice(pos) })
  return out
}

const ohne = (s: string, zeichen: RegExp) => s.replace(zeichen, '').replace(/\s+/g, ' ').trim()

/** Schreibweise einer geänderten Lücke (Sternchen, Doppelpunkt, Klammern im Inhalt werden entfernt) */
export function markierung(typ: LueckenTyp, l: Pick<Luecke, 'wort' | 'varianten' | 'tipp'>): string {
  if (typ === 'mark_words') return `*${ohne(l.wort, /\*/g)}*`
  if (typ === 'drag_words') {
    const t = ohne(l.tipp, /\*/g)
    return `*${ohne(l.wort, /[*:]/g)}${t ? `:${t}` : ''}*`
  }
  const alle = [l.wort, ...l.varianten].map((v) => ohne(v, /[*/()]/g)).filter(Boolean)
  if (typ === 'advanced_fill_blanks') {
    const t = ohne(l.tipp, /[*()]/g)
    return `*${alle.join('/')}*${t ? ` (${t})` : ''}`
  }
  return `*${alle.join('/')}*`
}

/** Stücke → Text. Unveränderte Lücken bleiben Zeichen für Zeichen, wie sie waren. */
export function setzeZusammen(typ: LueckenTyp, stuecke: Stueck[]): string {
  return stuecke.map((s) => (s.art === 'text' ? s.text : s.roh ?? markierung(typ, s))).join('')
}

/** Benachbarte Textstücke zusammenlegen, leere weglassen */
export function verdichte(stuecke: Stueck[]): Stueck[] {
  const out: Stueck[] = []
  for (const s of stuecke) {
    const vor = out[out.length - 1]
    if (s.art === 'text') {
      if (!s.text) continue
      if (vor?.art === 'text') out[out.length - 1] = { art: 'text', text: vor.text + s.text }
      else out.push(s)
    } else out.push(s)
  }
  return out
}

export const luecken = (stuecke: Stueck[]): Luecke[] => stuecke.filter((s): s is Luecke => s.art === 'luecke')

/** Zeichen, die am Rand einer Auswahl nicht in die Lücke gehören */
const RAND = /[\s.,;:!?„“”"'‚‘’()[\]{}«»–—-]/

/** Auswahl am Rand säubern: [start, ende) ohne Leer- und Satzzeichen */
export function saeubereAuswahl(text: string, start: number, ende: number): [number, number] {
  let a = start
  let b = ende
  while (a < b && RAND.test(text[a])) a++
  while (b > a && RAND.test(text[b - 1])) b--
  return [a, b]
}

/** Auf ganze Wörter erweitern (Wörter markieren: Schüler klicken ganze Wörter an) */
export function ganzeWoerter(text: string, start: number, ende: number): [number, number] {
  let a = start
  let b = ende
  while (a > 0 && /\S/.test(text[a - 1]) && !RAND.test(text[a - 1])) a--
  while (b < text.length && /\S/.test(text[b]) && !RAND.test(text[b])) b++
  return [a, b]
}

export type Auswahlpruefung = { ok: true; stueck: number; start: number; ende: number } | { ok: false; grund: string }

/**
 * Prüft eine Auswahl, angegeben als Zeichen-Stellen im Klartext (Lücken zählen 0 Zeichen).
 * Erlaubt ist nur ein Stück Text innerhalb eines Textstücks und einer Zeile.
 */
export function pruefeAuswahl(typ: LueckenTyp, stuecke: Stueck[], von: number, bis: number): Auswahlpruefung {
  let pos = 0
  for (let i = 0; i < stuecke.length; i++) {
    const s = stuecke[i]
    if (s.art !== 'text') {
      if (von < pos && bis > pos) return { ok: false, grund: 'Die Auswahl enthält schon eine Lücke.' }
      continue
    }
    const ende = pos + s.text.length
    if (von >= pos && von <= ende) {
      if (bis > ende) return { ok: false, grund: 'Die Auswahl enthält schon eine Lücke.' }
      let [a, b] = saeubereAuswahl(s.text, von - pos, bis - pos)
      if (typ === 'mark_words' && b > a) [a, b] = ganzeWoerter(s.text, a, b)
      if (b <= a) return { ok: false, grund: 'Bitte ein Wort auswählen.' }
      if (/[\n*]/.test(s.text.slice(a, b))) return { ok: false, grund: 'Bitte nur innerhalb einer Zeile auswählen.' }
      return { ok: true, stueck: i, start: a, ende: b }
    }
    pos = ende
  }
  return { ok: false, grund: 'Bitte ein Wort im Text auswählen.' }
}

/** Macht aus einer geprüften Auswahl eine neue Lücke */
export function alsLuecke(stuecke: Stueck[], p: Extract<Auswahlpruefung, { ok: true }>): { stuecke: Stueck[]; index: number } {
  const s = stuecke[p.stueck] as { art: 'text'; text: string }
  const neu: Luecke = { art: 'luecke', wort: s.text.slice(p.start, p.ende), varianten: [], tipp: '' }
  const liste = [...stuecke.slice(0, p.stueck), { art: 'text' as const, text: s.text.slice(0, p.start) }, neu, { art: 'text' as const, text: s.text.slice(p.ende) }, ...stuecke.slice(p.stueck + 1)]
  const dicht = verdichte(liste)
  return { stuecke: dicht, index: luecken(dicht).indexOf(neu) }
}

/** Lücke entfernen: Das Wort bleibt als normaler Text stehen */
export function entferneLuecke(stuecke: Stueck[], index: number): Stueck[] {
  let n = -1
  return verdichte(stuecke.map((s) => (s.art === 'luecke' && ++n === index ? { art: 'text', text: s.wort } : s)))
}

/** HTML-Absätze im Klartext (z. B. aus einer KI) – die Schüler sähen „<p>“ */
export const hatHtmlReste = (text: string) => /<\/?p\s*>/i.test(text)
export const ohneHtmlReste = (text: string) => text.replace(/<\/p>\s*<p>/gi, '\n').replace(/<\/?p\s*>/gi, '').trim()

/** Einzelnes Sternchen ohne Gegenstück: der Kern zeigt es als Zeichen, die Lehrkraft meint vermutlich eine Lücke */
export const hatEinzelnesSternchen = (stuecke: Stueck[]) => stuecke.some((s) => s.art === 'text' && s.text.includes('*'))

/**
 * Wörter markieren: Wie der Kern zählt er alle anklickbaren Wörter durch (`data-i`).
 * Ergebnis: je Wort die Nummer der Lösung oder null.
 */
export function markWoerter(text: string): Array<number | null> {
  const out: Array<number | null> = []
  let loesung = 0
  for (const stueck of text.split(/(\*[^*]+\*)/)) {
    if (!stueck) continue
    // wie der Kern, auch für ein einzelnes „*“
    if (stueck.startsWith('*') && stueck.endsWith('*')) out.push(loesung++)
    else for (const w of stueck.match(/\S+|\s+/g) ?? []) if (w.trim()) out.push(null)
  }
  return out
}
