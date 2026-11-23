/**
 * Setzer (PROJ-122, Tech Design H): wandelt den Fließtext einer Leitlinie aus
 * Schulrecht in Überschriften, Absätze, Listen und Warnungen um.
 *
 * Grundsatz: Es wird nichts verändert oder weggelassen. Aufzählungszeichen
 * („•“, „-“) werden zu Listen und fallen als Zeichen weg; alle Wörter bleiben
 * in der Reihenfolge der Quelle (der Test vergleicht Wort für Wort). Was der
 * Setzer nicht sicher erkennt, bleibt ein einfacher Absatz.
 */

export type Block =
  | { id: string; art: 'kopf'; text: string }
  | { id: string; art: 'ueberschrift'; text: string }
  | { id: string; art: 'absatz'; text: string }
  | { id: string; art: 'warnung'; text: string }
  | { id: string; art: 'liste'; punkte: string[] }

type OhneId =
  | { art: 'ueberschrift'; text: string }
  | { art: 'absatz'; text: string }
  | { art: 'warnung'; text: string }
  | { art: 'liste'; punkte: string[] }

const SATZENDE = /[.!?:)]$/
const KURZE_UEBERSCHRIFT = 40

function bereinige(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** Steht an Position `pos` ein Satz- oder Zeilenanfang? */
function istSegmentAnfang(text: string, pos: number): boolean {
  if (pos === 0) return true
  const davor = text.slice(0, pos).trimEnd()
  if (davor === '') return true
  return /[.!?:]$/.test(davor) && /\s/.test(text[pos - 1])
}

/** Zerlegt eine Zeile an bekannten Überschriften (wörtlich, nur an Satzanfängen) */
function trenneUeberschriften(zeile: string, ueberschriften: readonly string[]): { ueberschrift: boolean; text: string }[] {
  if (ueberschriften.length === 0) return [{ ueberschrift: false, text: zeile }]
  const sortiert = [...ueberschriften].sort((a, b) => b.length - a.length)
  const teile: { ueberschrift: boolean; text: string }[] = []
  let rest = ''
  let i = 0
  while (i < zeile.length) {
    const treffer = sortiert.find((u) => {
      if (!zeile.startsWith(u, i)) return false
      const danach = zeile[i + u.length]
      if (danach !== undefined && !/\s/.test(danach)) return false
      // Mitten im Satz („im Zeitraum zwischen …“) ist es keine Überschrift
      return istSegmentAnfang(zeile, i) || rest.trim() === ''
    })
    if (treffer) {
      if (rest.trim()) teile.push({ ueberschrift: false, text: rest.trim() })
      rest = ''
      teile.push({ ueberschrift: true, text: treffer })
      i += treffer.length
    } else {
      rest += zeile[i]
      i++
    }
  }
  if (rest.trim()) teile.push({ ueberschrift: false, text: rest.trim() })
  return teile
}

/** Ein Textstück ohne Überschrift → Absatz und/oder Liste (an „•“ bzw. „ - “) */
function setzeStueck(stueck: string): OhneId[] {
  const text = stueck.trim()
  if (!text) return []
  const punktTrenner = /(?:^|\s)•\s+/
  const strichListe = /^- |:\s- /
  let kopf = ''
  let teile: string[] | null = null
  if (punktTrenner.test(text)) {
    const [vorher, ...punkte] = text.split(/(?:^|\s)•\s+/)
    kopf = vorher
    teile = punkte
  } else if (strichListe.test(text)) {
    const [vorher, ...punkte] = text.split(/(?:^|\s)-\s+(?=\S)/)
    kopf = vorher
    teile = punkte
  }
  const bloecke: OhneId[] = []
  if (kopf.trim()) bloecke.push(absatzOderWarnung(kopf))
  if (teile && teile.length > 0) bloecke.push({ art: 'liste', punkte: teile.map(bereinige).filter(Boolean) })
  else if (!kopf.trim()) bloecke.push(absatzOderWarnung(text))
  return bloecke
}

function absatzOderWarnung(text: string): OhneId {
  const t = bereinige(text)
  return /^Achtung\b/i.test(t) ? { art: 'warnung', text: t } : { art: 'absatz', text: t }
}

export function setzeLeitlinie(text: string, ueberschriften: readonly string[] = []): Block[] {
  const zeilen = text.split('\n').map((z) => z.trim()).filter(Boolean)
  const roh: OhneId[] = []
  let kopf: string | null = null
  zeilen.forEach((zeile, index) => {
    if (index === 0) {
      kopf = bereinige(zeile)
      return
    }
    for (const teil of trenneUeberschriften(zeile, ueberschriften)) {
      if (teil.ueberschrift) {
        roh.push({ art: 'ueberschrift', text: teil.text })
      } else if (teil.text.length <= KURZE_UEBERSCHRIFT && !SATZENDE.test(teil.text) && !/^[•-]/.test(teil.text)) {
        roh.push({ art: 'ueberschrift', text: bereinige(teil.text) })
      } else {
        roh.push(...setzeStueck(teil.text))
      }
    }
  })
  const bloecke: Block[] = []
  if (kopf !== null) bloecke.push({ id: 'b0', art: 'kopf', text: kopf })
  roh.forEach((b, i) => bloecke.push({ ...b, id: `b${i + 1}` } as Block))
  return bloecke
}

/** Alle Wörter eines Blocks (für Anker-Suche und den Wort-für-Wort-Test) */
export function blockText(block: Block): string {
  return block.art === 'liste' ? block.punkte.join(' ') : block.text
}

/** Wörter ohne Aufzählungszeichen, in Reihenfolge */
export function woerter(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((w) => w !== '' && w !== '•' && w !== '-')
}

/** In welchem Block steht die Wendung (wörtlich, Leerraum egal)? */
export function findeAnker(bloecke: readonly Block[], wendung: string): string | null {
  const ziel = bereinige(wendung)
  for (const b of bloecke) {
    if (bereinige(blockText(b)).includes(ziel)) return b.id
  }
  return null
}
