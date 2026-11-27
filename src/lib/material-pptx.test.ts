// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { PptxTooLargeError, readPptxText, slideXmlToText } from './material-pptx'
import { detectMaterialKind, MIME_BY_KIND } from './assessment-import'

const slide = (...paras: string[]) =>
  `<?xml version="1.0"?><p:sld xmlns:a="x" xmlns:p="y"><p:cSld><p:spTree>${paras
    .map((p) => `<p:sp><p:txBody><a:p><a:r><a:t>${p}</a:t></a:r></a:p></p:txBody></p:sp>`)
    .join('')}</p:spTree></p:cSld></p:sld>`

function pptx(slides: Record<string, string>): Buffer {
  const files: Record<string, Uint8Array> = { '[Content_Types].xml': strToU8('<Types/>') }
  for (const [name, xml] of Object.entries(slides)) files[name] = strToU8(xml)
  return Buffer.from(zipSync(files))
}

describe('readPptxText (PROJ-132)', () => {
  it('liest den Text aller Folien in Folienreihenfolge, nicht in Dateireihenfolge', () => {
    const buffer = pptx({
      'ppt/slides/slide10.xml': slide('Zehn'),
      'ppt/slides/slide2.xml': slide('Zwei', 'Zwei b'),
      'ppt/slides/slide1.xml': slide('Eins'),
    })
    expect(readPptxText(buffer)).toBe('Eins\n\nZwei\nZwei b\n\nZehn')
  })

  it('entschlüsselt XML-Zeichen und behält Zeilenumbrüche im Absatz', () => {
    const xml = '<a:p><a:r><a:t>Soll &amp; Haben &lt;5&gt;</a:t></a:r><a:br/><a:r><a:t>zweite Zeile</a:t></a:r></a:p>'
    expect(slideXmlToText(xml)).toBe('Soll & Haben <5>\nzweite Zeile')
  })

  it('überspringt leere Folien und fremde Dateien im Archiv', () => {
    const buffer = pptx({
      'ppt/slides/slide1.xml': '<p:sld></p:sld>',
      'ppt/slides/slide2.xml': slide('Text'),
      'ppt/media/image1.png': 'kein Text',
    })
    expect(readPptxText(buffer)).toBe('Text')
  })

  it('gibt bei einer Datei ohne Text einen leeren String zurück (die Oberfläche meldet „kein lesbarer Text“)', () => {
    expect(readPptxText(pptx({ 'ppt/slides/slide1.xml': '<p:sld></p:sld>' }))).toBe('')
  })

  it('wirft bei einer Datei, die kein Archiv ist', () => {
    expect(() => readPptxText(Buffer.from('das ist kein zip'))).toThrow()
  })

  it('wird als PowerPoint erkannt, aber nur mit der Endung .pptx', () => {
    const buffer = pptx({ 'ppt/slides/slide1.xml': slide('x') })
    expect(detectMaterialKind(buffer, 'Skript.PPTX')).toBe('pptx')
    expect(detectMaterialKind(buffer, 'skript.zip')).toBeNull()
    expect(MIME_BY_KIND.pptx).toContain('presentationml')
  })
})

describe('readPptxText – Schutz vor ZIP-Bomben (PROJ-132, QA BUG-1)', () => {
  it('bricht ab, wenn alle Folien zusammen entpackt zu groß sind, bevor etwas entpackt wird', () => {
    const big = new Uint8Array(4 * 1024 * 1024).fill(32)
    const files: Record<string, Uint8Array> = {}
    for (let i = 1; i <= 12; i++) files[`ppt/slides/slide${i}.xml`] = big
    const zip = zipSync(files, { level: 9 })
    expect(zip.length).toBeLessThan(1024 * 1024)
    const before = process.memoryUsage().rss
    expect(() => readPptxText(zip)).toThrow(PptxTooLargeError)
    expect(process.memoryUsage().rss - before).toBeLessThan(200 * 1024 * 1024)
  })

  it('liest normale Präsentationen unter der Grenze weiter', () => {
    const buffer = pptx({ 'ppt/slides/slide1.xml': slide('Hallo') })
    expect(readPptxText(buffer)).toBe('Hallo')
  })
})
