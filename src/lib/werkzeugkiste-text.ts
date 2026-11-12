/**
 * Textblöcke im Baukasten-Editor (PROJ-89, Paket 2): Boxen des Schuldesigns und
 * die Rundreise-Prüfung „HTML → gestaltete Ansicht → HTML“.
 *
 * Die KI schreibt Boxen nur mit ihrer Klasse (`<div class="merke">`), das
 * Aussehen setzt der Kern (`schuldesign.py`). Ältere Antworten tragen noch
 * Inline-Stile – die lässt der Kern unangetastet, und der Editor auch.
 *
 * Nur im Browser (und in jsdom-Tests) benutzen: braucht DOMParser.
 */

export interface BoxArt {
  klasse: string
  label: string
  /** Standard-Titelzeile wie in schuldesign.py */
  titel: string
}

/** Die Boxen aus dem Master-Prompt, in der Reihenfolge des Menüs */
export const BOX_ARTEN: BoxArt[] = [
  { klasse: 'lernziele', label: 'Lernziele', titel: 'Lernziele' },
  { klasse: 'merke', label: 'Merke', titel: 'Merke:' },
  { klasse: 'tipp', label: 'Tipp', titel: 'Tipp aus der Praxis:' },
  { klasse: 'achtung', label: 'Achtung', titel: 'Achtung:' },
  { klasse: 'beispiel', label: 'Beispiel', titel: 'Beispiel' },
  { klasse: 'ausgangssituation', label: 'Ausgangssituation', titel: 'Ausgangssituation' },
  { klasse: 'arbeitsauftrag', label: 'Arbeitsauftrag', titel: 'Arbeitsauftrag' },
  { klasse: 'mission', label: 'Fall (Mission)', titel: '📁 Neuer Fall' },
  { klasse: 'pruefung', label: 'Prüfungssimulation', titel: '⭐ IHK-Prüfungssimulation' },
]

/** Schreibvarianten wie `_ALIAS` in schuldesign.py */
const ALIAS: Record<string, string> = {
  lernziel: 'lernziele', lernzielbox: 'lernziele',
  ausgangssituationbox: 'ausgangssituation', situation: 'ausgangssituation',
  arbeitsauftragbox: 'arbeitsauftrag', auftrag: 'arbeitsauftrag',
  merkebox: 'merke', merksatz: 'merke',
  tippbox: 'tipp', praxistipp: 'tipp',
  achtungbox: 'achtung', warnung: 'achtung',
  beispielbox: 'beispiel',
  missionbox: 'mission', fallakte: 'mission', fall: 'mission',
  pruefungssimulation: 'pruefung', pruefungsbox: 'pruefung', ihk: 'pruefung',
  schrittliste: 'schritte', schritt: 'schritte', ablauf: 'schritte',
  zweispalten: 'vergleich', gegenueberstellung: 'vergleich',
  zebratabelle: 'zebra',
}

const BOXEN = new Set(BOX_ARTEN.map((b) => b.klasse))

/** Kennzeichen aus dem class-Attribut wie `_schluessel` im Kern – erste bekannte Klasse zählt */
export function kennzeichen(klasse: string | null | undefined): string | null {
  for (const roh of (klasse ?? '').split(/\s+/)) {
    let k = roh
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[-_]/g, '')
    k = ALIAS[k] ?? k
    if (BOXEN.has(k) || k === 'vergleich' || k === 'schritte' || k === 'zebra') return k
  }
  return null
}

/** Ist das eine Box, die der gestaltete Editor bearbeiten kann? (eigener Stil = Vorrang wie im Kern) */
export function istBox(el: Element): boolean {
  const k = kennzeichen(el.getAttribute('class'))
  return el.tagName === 'DIV' && !!k && BOXEN.has(k) && !el.hasAttribute('style')
}

export function boxArt(klasse: string | null | undefined): BoxArt | undefined {
  const k = kennzeichen(klasse)
  return BOX_ARTEN.find((b) => b.klasse === k)
}

// ── Aufräumen und Vergleichen ────────────────────────────────────────────

const AUSPACKEN_IN = new Set(['LI', 'TD', 'TH', 'DIV'])

function parse(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return doc.body
}

/**
 * `<li><p>x</p></li>` → `<li>x</li>` (ebenso in Zellen und Boxen): Der gestaltete
 * Editor packt Text dort in Absätze, das Original der KI meist nicht.
 */
function auspacken(wurzel: Element) {
  for (const el of Array.from(wurzel.querySelectorAll('*'))) {
    if (!AUSPACKEN_IN.has(el.tagName)) continue
    const kinder = Array.from(el.childNodes).filter((n) => !(n.nodeType === 3 && !n.textContent?.trim()))
    const p = kinder[0] as Element | undefined
    if (kinder.length === 1 && p?.nodeType === 1 && p.tagName === 'P' && p.attributes.length === 0) {
      p.replaceWith(...Array.from(p.childNodes))
    }
  }
}

/** Was der gestaltete Editor ausgibt, in die Form bringen, die die KI schreibt */
export function aufraeumen(html: string): string {
  const body = parse(html)
  auspacken(body)
  // Ein leerer Editor liefert <p></p>
  if (body.childNodes.length === 1 && body.firstElementChild?.tagName === 'P' && !body.textContent?.trim()) return ''
  return body.innerHTML
}

/**
 * Stilangaben so, wie der Browser sie versteht: Farben (#C4BC96 = rgb(196,188,150)),
 * Leerraum und das letzte Semikolon spielen keine Rolle.
 */
function stilForm(el: HTMLElement): string {
  return (el.style?.cssText || el.getAttribute('style') || '').replace(/\s+/g, '').replace(/;$/, '')
}

const GLEICHE_TAGS: Record<string, string> = { B: 'strong', I: 'em' }

function normalKnoten(n: Node): string {
  if (n.nodeType === 3) return (n.textContent ?? '').replace(/\s+/g, ' ')
  if (n.nodeType !== 1) return ''
  const el = n as Element
  const tag = GLEICHE_TAGS[el.tagName] ?? el.tagName.toLowerCase()
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.name === 'style' ? stilForm(el as HTMLElement) : a.value.trim()}"`)
    .sort()
    .join(' ')
  const kinder = Array.from(el.childNodes)
    .filter((k) => !(k.nodeType === 3 && !k.textContent?.trim()))
    .map(normalKnoten)
    .join('')
    .trim()
  return `<${tag}${attrs ? ' ' + attrs : ''}>${kinder}</${tag}>`
}

/** Vergleichbare Form: Leerraum, Attribut-Reihenfolge, b/strong und i/em spielen keine Rolle */
export function normalisiere(html: string): string {
  const body = parse(html)
  auspacken(body)
  return Array.from(body.childNodes)
    .filter((k) => !(k.nodeType === 3 && !k.textContent?.trim()))
    .map(normalKnoten)
    .join('')
    .trim()
}

/** Bleibt der Block in der gestalteten Ansicht unverändert? */
export function rundreiseOk(original: string, ausDemEditor: string): boolean {
  return normalisiere(original) === normalisiere(ausDemEditor)
}

// ── Hinweise zur HTML-Ansicht ────────────────────────────────────────────

/**
 * Skripte, Ereignisse, javascript:-Links und eingebettete fremde Seiten (iframe,
 * object, embed, form, meta, srcdoc) entfernt der Kern beim Bauen – der Editor sagt es nur
 */
export function hatAktivenInhalt(html: string): boolean {
  return /<\s*(?:script|iframe|frame|object|embed|applet|form|meta|base)\b|[\s/]on[a-z]+\s*=|\ssrcdoc\s*=|javascript:/i.test(html)
}

/** Bilder von fremden Adressen (`<img src="https://…">`) laden offline nicht */
export function hatExterneBilder(html: string): boolean {
  return /<\s*img\b[^>]*\ssrc\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html)
}

const LEERE_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'])

/** Grobe Prüfung, ob alle Elemente geschlossen sind (nur für einen Hinweis, nie eine Sperre) */
export function sauberGeschlossen(html: string): boolean {
  const stapel: string[] = []
  const re = /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9-]*)[^>]*?(\/)?\s*>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [, zu, rohName, selbst] = m
    const name = rohName.toLowerCase()
    if (LEERE_TAGS.has(name) || selbst) continue
    if (!zu) stapel.push(name)
    else if (stapel.pop() !== name) return false
  }
  return stapel.length === 0
}

/** Eingefügtes aus Word oder Webseiten: keine fremden Schriften, Farben oder Klassen */
export function eingefuegtesBereinigen(html: string): string {
  const body = parse(html)
  for (const el of Array.from(body.querySelectorAll('*'))) {
    el.removeAttribute('style')
    el.removeAttribute('class')
    el.removeAttribute('id')
    for (const a of Array.from(el.attributes)) if (a.name.startsWith('data-') || a.name.startsWith('on')) el.removeAttribute(a.name)
    if (el.tagName === 'FONT' || el.tagName === 'SPAN') el.replaceWith(...Array.from(el.childNodes))
  }
  body.querySelectorAll('script, style, meta, link, o\\:p').forEach((el) => el.remove())
  return body.innerHTML
}
