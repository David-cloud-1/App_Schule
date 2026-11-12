import { describe, expect, it } from 'vitest'
import {
  TABELLE_MAX_SPALTEN,
  TABELLE_MAX_ZEILEN,
  datenEinfuegen,
  diagrammAusRaster,
  diagrammProbleme,
  diagrammRaster,
  einfuegeText,
  leeresRaster,
  loeseTabelleHeraus,
  rasterAus,
  spalteLoeschen,
  spalteVerschieben,
  tabelleAusHtml,
  zahlLesen,
  zeileEinfuegen,
  zeileLoeschen,
  zeileVerschieben,
} from './werkzeugkiste-tabelle'
import type { Struktur } from './werkzeugkiste-editor'

describe('Raster', () => {
  it('füllt ungleich lange Zeilen auf', () => {
    expect(rasterAus([['a', 'b'], ['c']])).toEqual([['a', 'b'], ['c', '']])
    expect(rasterAus(undefined)).toEqual([])
  })
  it('hält Mindest- und Höchstgröße ein', () => {
    expect(zeileLoeschen([['a']], 0)).toEqual([['a']])
    expect(spalteLoeschen([['a']], 0)).toEqual([['a']])
    expect(zeileEinfuegen(leeresRaster(TABELLE_MAX_ZEILEN, 2), 0)).toHaveLength(TABELLE_MAX_ZEILEN)
  })
  it('verschiebt Zeilen und Spalten', () => {
    expect(zeileVerschieben([['a'], ['b']], 0, 1)).toEqual([['b'], ['a']])
    expect(spalteVerschieben([['a', 'b']], 1, -1)).toEqual([['b', 'a']])
    expect(zeileVerschieben([['a']], 0, -1)).toEqual([['a']])
  })
})

describe('Einfügen aus Excel', () => {
  it('liest Tabulatoren und Zeilen', () => {
    expect(einfuegeText('a\tb\nc\td\n')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('ein einzelner Wert ist keine Tabelle', () => {
    expect(einfuegeText('nur Text')).toBeNull()
  })
  it('versteht Zellen in Anführungszeichen mit Zeilenumbruch', () => {
    expect(einfuegeText('"a\nb"\tc')).toEqual([['a\nb', 'c']])
  })
  it('erweitert das Raster und kürzt an der Obergrenze', () => {
    const daten = leeresRaster(TABELLE_MAX_ZEILEN + 5, TABELLE_MAX_SPALTEN + 2).map((z) => z.map(() => 'x'))
    const { raster, gekuerzt } = datenEinfuegen([['']], 0, 0, daten)
    expect(gekuerzt).toBe(true)
    expect(raster).toHaveLength(TABELLE_MAX_ZEILEN)
    expect(raster[0]).toHaveLength(TABELLE_MAX_SPALTEN)
  })
  it('füllt ab der gewählten Zelle', () => {
    const { raster, gekuerzt } = datenEinfuegen([['1', '2'], ['3', '4']], 1, 1, [['a', 'b']])
    expect(gekuerzt).toBe(false)
    expect(raster).toEqual([['1', '2'], ['3', 'a', 'b']].map((z, i) => (i === 0 ? [...z, ''] : z)))
  })
})

describe('zahlLesen', () => {
  it.each([
    ['12,5', 12.5],
    ['1.234,5', 1234.5],
    ['1.234', 1234],
    ['1.234.567', 1234567],
    ['-3', -3],
    ['3.5', 3.5],
    [' 7 ', 7],
  ])('liest %s', (eingabe, erwartet) => expect(zahlLesen(eingabe)).toBe(erwartet))
  it('leer ist eine Lücke, Text ein Fehler', () => {
    expect(zahlLesen('  ')).toBeNull()
    expect(zahlLesen('abc')).toBe('fehler')
    expect(zahlLesen('12 €')).toBe('fehler')
  })
})

describe('Diagramm-Daten', () => {
  const block = { type: 'diagramm', art: 'saeulen', beschriftungen: ['Q1', 'Q2'], reihen: [{ name: '2024', werte: ['1', '2,5'] }, { name: '2025', werte: ['3', ''] }] }
  it('Rundreise Raster ↔ Block', () => {
    const r = diagrammRaster(block)
    expect(r).toEqual([['', '2024', '2025'], ['Q1', '1', '3'], ['Q2', '2,5', '']])
    expect(diagrammAusRaster(r)).toEqual({ beschriftungen: ['Q1', 'Q2'], reihen: block.reihen })
  })
  it('meldet Nicht-Zahlen mit Zelle', () => {
    const { fehler } = diagrammProbleme({ ...block, reihen: [{ name: 'a', werte: ['x', '2'] }] })
    expect(fehler).toEqual([{ zeile: 1, spalte: 1, meldung: '„x“ ist keine Zahl.' }])
  })
  it('Kreis: keine negativen Werte, Hinweis bei mehreren Reihen', () => {
    const k = { ...block, art: 'kreis', reihen: [{ name: 'a', werte: ['-1', '2'] }, { name: 'b', werte: ['1', '1'] }] }
    const p = diagrammProbleme(k)
    expect(p.fehler.map((f) => f.meldung)).toContain('Ein Kreisdiagramm braucht Werte von null oder größer.')
    expect(p.hinweise).toContain('Das Kreisdiagramm zeigt nur die erste Reihe.')
  })
  it('Negative Werte sind bei Säulen erlaubt', () => {
    expect(diagrammProbleme({ ...block, reihen: [{ name: 'a', werte: ['-4', '2'] }] }).fehler).toEqual([])
  })
  it('weist auf fehlende Werte hin', () => {
    expect(diagrammProbleme({ type: 'diagramm' }).hinweise.length).toBeGreaterThan(0)
  })
})

describe('Tabelle herauslösen', () => {
  const tab = '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2<br>x</td></tr></tbody></table>'
  it('ohne Tabelle: nichts', () => {
    expect(tabelleAusHtml('<p>Hallo</p>')).toBeNull()
  })
  it('trennt Text davor und danach', () => {
    const e = tabelleAusHtml(`<p>Vor</p>${tab}<p>Nach</p>`)
    expect(e?.ok).toBe(true)
    if (!e?.ok) return
    expect(e.daten.vorher).toBe('<p>Vor</p>')
    expect(e.daten.nachher).toBe('<p>Nach</p>')
    expect(e.daten.tabelle).toMatchObject({ type: 'tabelle', kopfzeile: true, zeilen: [['A', 'B'], ['1', '2\nx']] })
    expect(e.daten.verluste).toEqual([])
  })
  it('nennt Verluste bei verbundenen Zellen und Formatierung', () => {
    const e = tabelleAusHtml('<table><tr><td colspan="2"><strong>x</strong></td></tr></table>')
    if (!e?.ok) throw new Error('erwartet ok')
    expect(e.daten.verluste.join(' ')).toMatch(/Verbundene Zellen/)
    expect(e.daten.verluste.join(' ')).toMatch(/Formatierung/)
  })
  it('lehnt Tabellen in Boxen ab', () => {
    const e = tabelleAusHtml(`<div class="merke">${tab}</div>`)
    expect(e).toMatchObject({ ok: false })
  })
  it('ersetzt den Textblock, wenn davor nichts steht, und behält die Reihenfolge', () => {
    const s = { cover: {}, chapters: [{ title: 'T', elements: [{ type: 'text', content: `${tab}<p>Nach</p>` }, { type: 'image' }] }] } as unknown as Struktur
    const e = tabelleAusHtml(`${tab}<p>Nach</p>`)
    if (!e?.ok) throw new Error('erwartet ok')
    const neu = loeseTabelleHeraus(s, 0, 0, e.daten)
    expect(neu.chapters[0].elements.map((b) => b.type)).toEqual(['tabelle', 'text', 'image'])
    expect(s.chapters[0].elements).toHaveLength(2)
  })
})
