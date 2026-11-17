import { describe, expect, it } from 'vitest'
import type { Block, Struktur } from '@/lib/werkzeugkiste-editor'
import {
  BEREICHE_MAX,
  BREITE_MAX,
  BREITE_MIN,
  aufgabeHatInhalt,
  aufgabeInBild,
  bereinigeBereiche,
  bereinigeMarken,
  bildInAufgabe,
  hatRichtigenBereich,
  neuerBereich,
  rahmenAusZiehen,
  setzeBereiche,
  bildAlsGalerieBild,
  ersetzeBild,
  fasseZurGalerieZusammen,
  galerieAlsEinzelbild,
  hatBild,
  hatTextDanach,
  leseAusrichtung,
  leseBreite,
  leseGalerieBilder,
  leseSpalten,
  leseTextDaneben,
  loeseGalerieAuf,
  markeKurz,
  markenNachAusschnitt,
  markenNachDrehung,
  naechsteStufe,
  nummerVon,
  rasteEin,
  setzeAusrichtung,
  setzeBreite,
  setzeMarken,
  setzeTextDaneben,
  wirdUnscharf,
} from '@/lib/werkzeugkiste-bild-block'

const bild = (pfad = 'images/a.png', mehr: Record<string, unknown> = {}): Block => ({ type: 'image', path: pfad, alt: 'Alt', ...mehr })
const struktur = (elemente: Block[]): Struktur => ({ cover: {}, chapters: [{ title: 'T', elements: elemente }] })

describe('Breite (PROJ-104)', () => {
  it('liest Prozentwerte, auch die alten Stufen, und begrenzt sie', () => {
    expect(leseBreite('40%')).toBe(40)
    expect(leseBreite('70%')).toBe(70)
    expect(leseBreite(' 65 ')).toBe(65)
    expect(leseBreite('33,3%')).toBe(33)
    expect(leseBreite(10)).toBe(BREITE_MIN)
    expect(leseBreite('500%')).toBe(BREITE_MAX)
    expect(leseBreite('breit')).toBe(BREITE_MAX)
    expect(leseBreite(undefined)).toBe(BREITE_MAX)
    expect(leseBreite(Number.NaN)).toBe(BREITE_MAX)
  })

  it('rastet nahe an den Stufen 25, 33, 50, 66 und 100 ein', () => {
    expect(rasteEin(49)).toBe(50)
    expect(rasteEin(52)).toBe(50)
    expect(rasteEin(34)).toBe(33)
    expect(rasteEin(68)).toBe(66)
    expect(rasteEin(98)).toBe(100)
    expect(rasteEin(40)).toBe(40)
  })

  it('rastet mit Alt (mitRaster = false) nicht ein', () => {
    expect(rasteEin(49, false)).toBe(49)
    expect(rasteEin(51.4, false)).toBe(51)
  })

  it('geht Stufe für Stufe größer und kleiner', () => {
    expect(naechsteStufe(50, 1)).toBe(66)
    expect(naechsteStufe(50, -1)).toBe(33)
    expect(naechsteStufe(40, 1)).toBe(50)
    expect(naechsteStufe(100, 1)).toBe(100)
    expect(naechsteStufe(25, -1)).toBe(25)
    expect(naechsteStufe(22, -1)).toBe(22)
  })

  it('setzt Breite und Ausrichtung im Block; Mitte ist der Normalfall und wird nicht gespeichert', () => {
    expect(setzeBreite(bild(), 50).width).toBe('50%')
    expect(setzeAusrichtung(bild(), 'rechts').align).toBe('rechts')
    expect('align' in setzeAusrichtung(bild('x.png', { align: 'links' }), 'mitte')).toBe(false)
    expect(leseAusrichtung('oben')).toBe('mitte')
    expect(leseAusrichtung('links')).toBe('links')
  })

  it('„Text daneben“ schaltet die Breite auf höchstens die Hälfte', () => {
    const an = setzeTextDaneben(bild('a.png', { width: '100%' }), 'rechts')
    expect(an.text_neben).toBe('rechts')
    expect(an.width).toBe('33%')
    expect(setzeTextDaneben(bild('a.png', { width: '40%' }), 'links').width).toBe('40%')
    expect(setzeTextDaneben(bild(), 'links').width).toBe('33%')
    expect('text_neben' in setzeTextDaneben(an, 'aus')).toBe(false)
    expect(leseTextDaneben('oben')).toBe('aus')
    expect(leseTextDaneben('rechts')).toBe('rechts')
  })

  it('erkennt Lehrtext direkt nach dem Bild und ein gesetztes Bild', () => {
    const s = struktur([bild(), { type: 'text', content: '<p>x</p>' }, bild()])
    expect(hatTextDanach(s, { thema: 0, block: 0 })).toBe(true)
    expect(hatTextDanach(s, { thema: 0, block: 2 })).toBe(false)
    expect(hatBild(bild())).toBe(true)
    expect(hatBild(bild(' '))).toBe(false)
    expect(hatBild({ type: 'text' })).toBe(false)
  })

  it('warnt, wenn ein kleines Bild groß gezogen wird', () => {
    expect(wirdUnscharf(100, 300)).toBe(true)
    expect(wirdUnscharf(30, 600)).toBe(false)
    expect(wirdUnscharf(100, 0)).toBe(false)
  })
})

describe('Markierungen (PROJ-106)', () => {
  it('liest nur bekannte Arten, begrenzt Orte, Farben und Texte', () => {
    const m = bereinigeMarken([
      { art: 'pfeil', x: -5, y: 200, x2: 'x', y2: null, farbe: 'violett', staerke: 'riesig', text: '  a   b  ' },
      { art: 'freihand', x: 1, y: 1 },
      'kaputt',
      null,
      { art: 'text', x: 5, y: 5, text: 'x'.repeat(300) },
    ])
    expect(m).toHaveLength(2)
    expect(m[0]).toMatchObject({ art: 'pfeil', x: 0, y: 100, farbe: 'rot', staerke: 'mittel', text: 'a b' })
    expect(m[0].x2).toBe(10)
    expect(m[1].text).toHaveLength(80)
    expect(m[1].x2).toBeUndefined()
  })

  it('kürzt auf 60 Markierungen und liest Nicht-Listen als leer', () => {
    expect(bereinigeMarken(Array.from({ length: 100 }, () => ({ art: 'nummer', x: 1, y: 1 })))).toHaveLength(60)
    expect(bereinigeMarken('x')).toEqual([])
    expect(bereinigeMarken(undefined)).toEqual([])
  })

  it('schreibt Markierungen in den Block und entfernt das Feld, wenn keine da sind', () => {
    const mit = setzeMarken(bild(), [{ art: 'nummer', x: 1, y: 2, farbe: 'blau', staerke: 'dick', text: '' }])
    expect(mit.marks).toHaveLength(1)
    expect('marks' in setzeMarken(mit, [])).toBe(false)
  })

  it('zählt Nummern automatisch hoch und überspringt ausgeblendete', () => {
    const m = bereinigeMarken([
      { art: 'nummer', x: 1, y: 1 },
      { art: 'pfeil', x: 1, y: 1, x2: 5, y2: 5 },
      { art: 'nummer', x: 2, y: 2, aus: true },
      { art: 'nummer', x: 3, y: 3, text: 'Auflieger' },
    ])
    expect(nummerVon(m, 0)).toBe(1)
    expect(nummerVon(m, 3)).toBe(2)
    expect(markeKurz(m, 3)).toBe('Nummer 2: Auflieger')
    expect(markeKurz(m, 1)).toBe('Pfeil')
  })

  it('dreht die Orte mit dem Bild: viermal rechts herum ergibt wieder das Ausgangsbild', () => {
    const start = bereinigeMarken([{ art: 'pfeil', x: 20, y: 10, x2: 60, y2: 30 }])
    let m = start
    for (let i = 0; i < 4; i++) m = markenNachDrehung(m, 1)
    expect(m[0]).toMatchObject({ x: 20, y: 10, x2: 60, y2: 30 })
    // Links ist das Gegenteil von rechts
    const rechts = markenNachDrehung(start, 1)
    expect(markenNachDrehung(rechts, -1)[0]).toMatchObject({ x: 20, y: 10, x2: 60, y2: 30 })
  })

  it('Rechtsdrehung: die obere linke Ecke wandert nach oben rechts', () => {
    const m = markenNachDrehung(bereinigeMarken([{ art: 'nummer', x: 0, y: 0 }]), 1)
    expect(m[0]).toMatchObject({ x: 100, y: 0 })
  })

  it('rechnet Orte auf den Ausschnitt um und blendet aus, was draußen liegt – ohne es zu löschen', () => {
    const m = bereinigeMarken([
      { art: 'nummer', x: 30, y: 30 },
      { art: 'nummer', x: 90, y: 90 },
      { art: 'rechteck', x: 40, y: 40, x2: 60, y2: 60 },
    ])
    const r = markenNachAusschnitt(m, { x: 20, y: 20, breite: 50, hoehe: 50 })
    expect(r.marken).toHaveLength(3)
    expect(r.ausserhalb).toBe(1)
    expect(r.marken[0]).toMatchObject({ x: 20, y: 20 })
    expect(r.marken[0].aus).toBeUndefined()
    expect(r.marken[1].aus).toBe(true)
    expect(r.marken[2]).toMatchObject({ x: 40, y: 40, x2: 80, y2: 80 })
  })

  it('zählt schon ausgeblendete nicht noch einmal als „neu außerhalb“', () => {
    const m = bereinigeMarken([{ art: 'nummer', x: 90, y: 90, aus: true }])
    expect(markenNachAusschnitt(m, { x: 0, y: 0, breite: 50, hoehe: 50 }).ausserhalb).toBe(0)
  })
})

describe('Galerie (PROJ-105)', () => {
  it('liest Bilder, begrenzt auf 12 und Spalten auf 2 bis 4', () => {
    const block = { type: 'gallery', images: Array.from({ length: 20 }, (_, i) => ({ path: `p${i}`, alt: 'a' })) }
    expect(leseGalerieBilder(block)).toHaveLength(12)
    expect(leseGalerieBilder({ type: 'gallery' })).toEqual([])
    expect(leseSpalten(2)).toBe(2)
    expect(leseSpalten('4')).toBe(4)
    expect(leseSpalten(9)).toBe(3)
  })

  it('fasst Bild-Blöcke zu einer Galerie zusammen: an der Stelle des ersten, mit Texten und Markierungen', () => {
    const s = struktur([
      { type: 'text', content: '<p>vor</p>' },
      bild('images/a.png', { alt: 'A', caption: 'Foto A', marks: [{ art: 'nummer', x: 1, y: 1 }] }),
      { type: 'text', content: '<p>mitte</p>' },
      bild('images/b.png', { alt: 'B' }),
    ])
    const r = fasseZurGalerieZusammen(s, [
      { thema: 0, block: 3 },
      { thema: 0, block: 1 },
    ])
    expect(r).not.toBeNull()
    const el = r!.struktur.chapters[0].elements
    expect(el.map((b) => b.type)).toEqual(['text', 'gallery', 'text'])
    expect(r!.ort).toEqual({ thema: 0, block: 1 })
    const bilder = leseGalerieBilder(el[1])
    expect(bilder.map((b) => b.path)).toEqual(['images/a.png', 'images/b.png'])
    expect(bilder[0]).toMatchObject({ alt: 'A', caption: 'Foto A' })
    expect(bilder[0].marks).toHaveLength(1)
    // Das Original bleibt unverändert
    expect(s.chapters[0].elements).toHaveLength(4)
  })

  it('fasst nichts zusammen, wenn ein Block kein Bild hat oder weniger als zwei gewählt sind', () => {
    const s = struktur([bild(), { type: 'text', content: 'x' }, bild('')])
    expect(fasseZurGalerieZusammen(s, [{ thema: 0, block: 0 }])).toBeNull()
    expect(fasseZurGalerieZusammen(s, [{ thema: 0, block: 0 }, { thema: 0, block: 1 }])).toBeNull()
    expect(fasseZurGalerieZusammen(s, [{ thema: 0, block: 0 }, { thema: 0, block: 2 }])).toBeNull()
  })

  it('löst eine Galerie wieder in einzelne Bild-Blöcke auf (Rundreise)', () => {
    const s = struktur([bild('images/a.png', { alt: 'A', caption: 'U' }), bild('images/b.png', { alt: 'B' })])
    const g = fasseZurGalerieZusammen(s, [{ thema: 0, block: 0 }, { thema: 0, block: 1 }])!
    const zurueck = loeseGalerieAuf(g.struktur, g.ort)!
    expect(zurueck.orte).toHaveLength(2)
    const el = zurueck.struktur.chapters[0].elements
    expect(el.map((b) => b.type)).toEqual(['image', 'image'])
    expect(el[0]).toMatchObject({ path: 'images/a.png', alt: 'A', caption: 'U', width: '100%' })
    expect(loeseGalerieAuf(s, { thema: 0, block: 0 })).toBeNull()
  })

  it('wandelt eine Galerie mit nur einem Bild in ein Einzelbild um', () => {
    const eins = { type: 'gallery', images: [{ path: 'images/a.png', alt: 'A' }] }
    expect(galerieAlsEinzelbild(eins)).toMatchObject({ type: 'image', path: 'images/a.png', alt: 'A' })
    expect(galerieAlsEinzelbild({ type: 'gallery', images: [] })).toBeNull()
    expect(bildAlsGalerieBild(bild('x.png')).path).toBe('x.png')
  })
})

describe('Bild austauschen', () => {
  it('behält Breite, Ausrichtung, Text daneben, Unterschrift und Alternativtext', () => {
    const alt = bild('images/a.png', { width: '40%', align: 'rechts', text_neben: 'links', caption: 'U', marks: [{ art: 'nummer', x: 1, y: 1 }] })
    const neu = ersetzeBild(alt, 'images/neu.png')
    expect(neu).toMatchObject({ path: 'images/neu.png', width: '40%', align: 'rechts', text_neben: 'links', caption: 'U', alt: 'Alt' })
    expect('marks' in neu).toBe(false)
    expect(ersetzeBild(alt, 'images/neu.png', 'Neuer Text', true).marks).toHaveLength(1)
    expect(ersetzeBild(alt, 'images/neu.png', 'Neuer Text').alt).toBe('Neuer Text')
    expect(ersetzeBild(alt, 'images/neu.png', '  ').alt).toBe('Alt')
  })
})

describe('Stelle im Bild finden (PROJ-107)', () => {
  it('liest Bereiche streng: Zahlen begrenzt, Unbrauchbares weg, Texte gekürzt, höchstens 20', () => {
    const b = bereinigeBereiche([
      { art: 'kreis', x: -5, y: 10, x2: 500, y2: '40', richtig: true, label: '  Kühl   aggregat ', feedback: 'x'.repeat(400) },
      { art: 'dreieck', x: 1, y: 1, x2: 2, y2: 2 },
      { art: 'kreis', x: 'a', y: 1, x2: 2, y2: 2 },
      'kaputt',
      null,
    ])
    expect(b).toHaveLength(2)
    expect(b[0]).toMatchObject({ art: 'kreis', x: 0, x2: 100, y2: 40, richtig: true, label: 'Kühl aggregat' })
    expect(b[0].feedback).toHaveLength(300)
    // Unbekannte Formen werden zum Rechteck, „richtig“ gilt nur bei genau true
    expect(b[1]).toMatchObject({ art: 'rechteck', richtig: false })
    expect(bereinigeBereiche(Array.from({ length: 50 }, () => ({ x: 1, y: 1, x2: 2, y2: 2 })))).toHaveLength(BEREICHE_MAX)
    expect(bereinigeBereiche('x')).toEqual([])
  })

  it('schreibt Bereiche in den Block und erkennt, ob mindestens einer richtig ist', () => {
    const block = setzeBereiche({ type: 'hotspot', path: 'a.png' }, [neuerBereich('kreis', false), neuerBereich('rechteck', true)])
    expect(block.bereiche).toHaveLength(2)
    expect(hatRichtigenBereich(bereinigeBereiche(block.bereiche))).toBe(true)
    expect(hatRichtigenBereich([neuerBereich()])).toBe(false)
  })

  it('der Rahmen aus dem Ziehen ist in jeder Richtung geordnet und im Bild', () => {
    expect(rahmenAusZiehen(80, 70, 20, 10)).toEqual({ x: 20, y: 10, x2: 80, y2: 70 })
    expect(rahmenAusZiehen(-10, 50, 130, 60)).toEqual({ x: 0, y: 50, x2: 100, y2: 60 })
  })

  it('wandelt ein Bild in eine Aufgabe um: Bild und Alternativtext bleiben, Markierungen und Breite entfallen', () => {
    const bild = bild_('images/a.png', { alt: 'LKW', caption: 'Foto', width: '40%', marks: [{ art: 'nummer', x: 1, y: 1 }] })
    const h = bildInAufgabe(bild, 'hotspot')
    expect(h).toMatchObject({ type: 'hotspot', path: 'images/a.png', alt: 'LKW', caption: 'Foto', bereiche: [] })
    expect('marks' in h).toBe(false)
    expect('width' in h).toBe(false)
    const z = bildInAufgabe(bild, 'bildzuordnung')
    expect(z).toMatchObject({ type: 'bildzuordnung', path: 'images/a.png', alt: 'LKW' })
    expect(Array.isArray(z.punkte)).toBe(true)
  })

  it('wandelt zurück: das Bild bleibt, die Aufgabe entfällt', () => {
    const h = { type: 'hotspot', path: 'images/a.png', alt: 'LKW', caption: 'Foto', bereiche: [neuerBereich('kreis', true)] }
    expect(aufgabeInBild(h)).toEqual({ type: 'image', path: 'images/a.png', alt: 'LKW', caption: 'Foto', width: '100%' })
    expect(aufgabeHatInhalt(h)).toBe(true)
    expect(aufgabeHatInhalt({ type: 'hotspot', bereiche: [] })).toBe(false)
    expect(aufgabeHatInhalt({ type: 'bildzuordnung', punkte: [{ label: 'Zugmaschine' }] })).toBe(true)
    expect(aufgabeHatInhalt({ type: 'bildzuordnung', punkte: [{ label: ' ' }] })).toBe(false)
  })
})

function bild_(pfad: string, mehr: Record<string, unknown> = {}): Block {
  return bild(pfad, mehr)
}
