import { describe, expect, it } from 'vitest'
import type { Struktur } from '@/lib/werkzeugkiste-editor'
import { direktBearbeitbar, einfachText, inselnVon, schreibWert, setzeSchreibWert, uebernimmSchreibtext, SCHREIB_MAX } from './schreiben'
import { liesWunsch } from './vorschau-nachrichten'

const struktur = (): Struktur => ({
  cover: { title: 'Titel', subtitle: 'Untertitel' },
  chapters: [
    {
      title: 'Thema A',
      elements: [
        { type: 'text', content: '<p>Hallo <strong>Welt</strong></p>' },
        { type: 'image', path: 'images/a.png', caption: 'Bild A' },
        { type: 'multiple_choice', question: 'Frage?' },
      ],
    },
  ],
})

describe('Schreiben: Werte lesen und setzen', () => {
  it('liest Lehrtext, Überschrift, Deckblatt und Bildunterschrift', () => {
    const s = struktur()
    expect(schreibWert({ art: 'block', thema: 0, block: 0 }, 'text', s)).toBe('<p>Hallo <strong>Welt</strong></p>')
    expect(schreibWert({ art: 'thema', thema: 0 }, 'kapitel', s)).toBe('Thema A')
    expect(schreibWert({ art: 'deckblatt' }, 'titel', s)).toBe('Titel')
    expect(schreibWert({ art: 'deckblatt' }, 'untertitel', s)).toBe('Untertitel')
    expect(schreibWert({ art: 'block', thema: 0, block: 1 }, 'unterschrift', s)).toBe('Bild A')
  })

  it('Aufgaben und falsche Kombinationen lassen sich nicht direkt bearbeiten (E2)', () => {
    const s = struktur()
    expect(schreibWert({ art: 'block', thema: 0, block: 2 }, 'text', s)).toBeNull()
    expect(schreibWert({ art: 'block', thema: 0, block: 0 }, 'unterschrift', s)).toBeNull()
    expect(schreibWert({ art: 'thema', thema: 0 }, 'titel', s)).toBeNull()
    expect(schreibWert(null, 'text', s)).toBeNull()
    expect(schreibWert({ art: 'block', thema: 5, block: 0 }, 'text', s)).toBeNull()
  })

  it('setzt den Wert unveränderlich und lässt alles andere unberührt', () => {
    const s = struktur()
    const neu = setzeSchreibWert({ art: 'block', thema: 0, block: 0 }, 'text', s, '<p>Neu</p>')
    expect(neu.chapters[0].elements[0].content).toBe('<p>Neu</p>')
    expect(s.chapters[0].elements[0].content).toBe('<p>Hallo <strong>Welt</strong></p>')
    expect(neu.chapters[0].elements[1]).toBe(s.chapters[0].elements[1])
    expect(setzeSchreibWert({ art: 'thema', thema: 0 }, 'kapitel', s, 'Thema B').chapters[0].title).toBe('Thema B')
    expect(setzeSchreibWert({ art: 'deckblatt' }, 'titel', s, 'T2').cover.title).toBe('T2')
  })

  it('gleicher Wert ergibt dieselbe Struktur (kein Verlaufseintrag)', () => {
    const s = struktur()
    expect(setzeSchreibWert({ art: 'thema', thema: 0 }, 'kapitel', s, 'Thema A')).toBe(s)
  })

  it('eine geleerte Bildunterschrift fällt weg', () => {
    const neu = setzeSchreibWert({ art: 'block', thema: 0, block: 1 }, 'unterschrift', struktur(), '')
    expect('caption' in neu.chapters[0].elements[1] && neu.chapters[0].elements[1].caption !== undefined).toBe(false)
  })

  it('einfacher Text: eine Zeile, begrenzt', () => {
    expect(einfachText('  Zwei \n Zeilen\t hier ')).toBe('Zwei Zeilen hier')
    expect(einfachText('x'.repeat(1000))).toHaveLength(300)
  })
})

const MIT_INSEL = '<p>Vorher</p><table style="border:1px solid red"><tr><td>A</td></tr></table><p>Nachher</p>'

describe('Schreiben: Inseln und Reinigung', () => {
  it('erkennt geschützte Inseln', () => {
    expect(inselnVon(MIT_INSEL)).toHaveLength(1)
    expect(inselnVon('<p>nur Text</p>')).toHaveLength(0)
  })

  it('einfacher Text und Boxen lassen sich direkt bearbeiten', () => {
    expect(direktBearbeitbar('<p>Text</p><div class="merke"><p>Box</p></div>')).toBe(true)
  })

  it('eine unveränderte Insel kommt unverändert durch', () => {
    const r = uebernimmSchreibtext(MIT_INSEL, MIT_INSEL.replace('Vorher', 'Davor'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.html).toContain('border:1px solid red')
  })

  it('eine veränderte oder erfundene Insel wird abgelehnt', () => {
    expect(uebernimmSchreibtext(MIT_INSEL, MIT_INSEL.replace('<td>A</td>', '<td>B</td>')).ok).toBe(false)
    expect(uebernimmSchreibtext('<p>x</p>', '<p>x</p><table style="x"><tr><td>1</td></tr></table>').ok).toBe(false)
  })

  it('eine Insel darf nicht verdoppelt werden', () => {
    expect(uebernimmSchreibtext(MIT_INSEL, MIT_INSEL + MIT_INSEL).ok).toBe(false)
  })

  it('entfernt Skripte, Ereignisse und javascript:-Links, die neu hinzukamen', () => {
    const r = uebernimmSchreibtext('<p>x</p>', '<p onclick="böse()">x</p><script>alert(1)</script><a href="javascript:alert(1)">l</a>')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.html).not.toMatch(/script|onclick|javascript:/i)
      expect(r.html).toContain('x')
    }
  })

  it('lehnt zu lange und falsche Typen ab', () => {
    expect(uebernimmSchreibtext('', 'x'.repeat(SCHREIB_MAX + 1)).ok).toBe(false)
    expect(uebernimmSchreibtext('', 42).ok).toBe(false)
  })
})

describe('Schreiben: Nachrichten der Seite', () => {
  it('liest Start-, Zwischen-, End- und Abbruch-Wünsche', () => {
    expect(liesWunsch({ wkSchreibe: 'k0-e1', teil: 'text' })).toEqual({ art: 'schreibe', marke: 'k0-e1', teil: 'text' })
    expect(liesWunsch({ wkSchreibZwischen: 'k0', teil: 'kapitel', html: 'Neu' })).toEqual({ art: 'schreibZwischen', marke: 'k0', teil: 'kapitel', html: 'Neu' })
    expect(liesWunsch({ wkSchreibEnde: 'deckblatt', teil: 'titel', html: 'T' })).toEqual({ art: 'schreibEnde', marke: 'deckblatt', teil: 'titel', html: 'T' })
    expect(liesWunsch({ wkSchreibAbbruch: 'k0-e1' })).toEqual({ art: 'schreibAbbruch', marke: 'k0-e1' })
  })

  it('verwirft falsche Marke, unbekannten Teil, fehlenden oder zu langen Text', () => {
    expect(liesWunsch({ wkSchreibe: 'x1', teil: 'text' })).toBeNull()
    expect(liesWunsch({ wkSchreibe: 'k0-e1', teil: 'aufgabe' })).toBeNull()
    expect(liesWunsch({ wkSchreibEnde: 'k0-e1', teil: 'text' })).toBeNull()
    expect(liesWunsch({ wkSchreibEnde: 'k0-e1', teil: 'text', html: 'x'.repeat(SCHREIB_MAX + 1) })).toBeNull()
    expect(liesWunsch({ wkSchreibZwischen: 'k0-e1', teil: 'text', html: 5 })).toBeNull()
  })
})
