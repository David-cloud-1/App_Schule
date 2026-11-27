/**
 * PROJ-132: Text aus einer PowerPoint-Datei (.pptx) lesen.
 *
 * Eine .pptx ist ein ZIP-Archiv. Der Text jeder Folie steht in
 * `ppt/slides/slideN.xml` in `<a:t>`-Läufen, Absätze sind `<a:p>`. Wir öffnen
 * das Archiv mit `fflate` (schon im Projekt) und sammeln den Text in
 * Folienreihenfolge. Es wird nichts gespeichert und nichts ausgeführt.
 */
import { unzipSync } from 'fflate'

/** Schutz vor „ZIP-Bomben“: eine einzelne Folie darf entpackt nicht größer sein */
const MAX_SLIDE_BYTES = 5 * 1024 * 1024
/** Mehr Folien lesen wir nicht (ein Skript hat selten mehr als ein paar hundert) */
const MAX_SLIDES = 500
/**
 * Schutz vor „ZIP-Bomben“: alle Folien zusammen dürfen entpackt nicht größer
 * sein. fflate legt den Ausgabepuffer in der angegebenen Größe an, die Summe
 * im Filter begrenzt also den Speicher, bevor etwas entpackt wird.
 */
export const MAX_TOTAL_SLIDE_BYTES = 40 * 1024 * 1024

/** Die Datei ist entpackt zu groß – die Route meldet das verständlich */
export class PptxTooLargeError extends Error {
  constructor() {
    super('pptx too large')
    this.name = 'PptxTooLargeError'
  }
}

const SLIDE_PATH = /^ppt\/slides\/slide(\d+)\.xml$/

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

/** Text einer Folie: ein Absatz je Zeile, Zeilenumbrüche (`<a:br/>`) bleiben erhalten */
export function slideXmlToText(xml: string): string {
  const paragraphs: string[] = []
  for (const para of xml.match(/<a:p[ >][\s\S]*?<\/a:p>/g) ?? []) {
    const withBreaks = para.replace(/<a:br\s*\/?>/g, '\n')
    const runs = [...withBreaks.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>|(\n)/g)]
    const line = runs.map((m) => (m[2] ? '\n' : decodeEntities(m[1] ?? ''))).join('')
    if (line.trim()) paragraphs.push(line.trim())
  }
  return paragraphs.join('\n')
}

/**
 * Text aller Folien, getrennt durch eine Leerzeile. Wirft einen Fehler, wenn
 * die Datei kein lesbares Archiv ist (zum Beispiel passwortgeschützt).
 */
export function readPptxText(buffer: Uint8Array): string {
  let total = 0
  let count = 0
  let tooLarge = false
  const files = unzipSync(buffer, {
    filter: (file) => {
      if (tooLarge || !SLIDE_PATH.test(file.name)) return false
      if (file.originalSize > MAX_SLIDE_BYTES) return false
      if (count >= MAX_SLIDES) return false
      total += file.originalSize
      if (total > MAX_TOTAL_SLIDE_BYTES) {
        tooLarge = true
        return false
      }
      count++
      return true
    },
  })
  if (tooLarge) throw new PptxTooLargeError()
  const slides = Object.keys(files)
    .map((name) => ({ name, n: Number(SLIDE_PATH.exec(name)?.[1] ?? 0) }))
    .sort((a, b) => a.n - b.n)
    .slice(0, MAX_SLIDES)

  const decoder = new TextDecoder('utf-8')
  const texts: string[] = []
  for (const slide of slides) {
    const text = slideXmlToText(decoder.decode(files[slide.name]))
    if (text) texts.push(text)
  }
  return texts.join('\n\n')
}
