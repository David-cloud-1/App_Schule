import { describe, it, expect } from 'vitest'
import { insertLink, normalizeLinkUrl, toggleList, wrapSelection } from './forum-editor'

describe('wrapSelection', () => {
  it('umschließt den markierten Text', () => {
    expect(wrapSelection({ value: 'Das ist wichtig.', start: 8, end: 15 }, '**', 'fett')).toEqual({
      value: 'Das ist **wichtig**.',
      start: 10,
      end: 17,
    })
  })

  it('setzt ohne Markierung einen Platzhalter und markiert ihn', () => {
    expect(wrapSelection({ value: 'Hallo ', start: 6, end: 6 }, '*', 'kursiv')).toEqual({
      value: 'Hallo *kursiv*',
      start: 7,
      end: 13,
    })
  })

  it('nimmt eine vorhandene Formatierung wieder zurück', () => {
    expect(wrapSelection({ value: '**fett**', start: 0, end: 8 }, '**', 'fett')).toEqual({
      value: 'fett',
      start: 0,
      end: 4,
    })
  })
})

describe('toggleList', () => {
  it('macht jede berührte Zeile zum Aufzählungspunkt', () => {
    const r = toggleList({ value: 'Einleitung\nerstens\nzweitens\nSchluss', start: 12, end: 24 })
    expect(r.value).toBe('Einleitung\n- erstens\n- zweitens\nSchluss')
  })

  it('nimmt die Aufzählung zurück, wenn alle Zeilen schon Punkte sind', () => {
    expect(toggleList({ value: '- a\n- b', start: 0, end: 7 }).value).toBe('a\nb')
  })

  it('verdoppelt vorhandene Punkte nicht', () => {
    expect(toggleList({ value: '- a\nb', start: 0, end: 5 }).value).toBe('- a\n- b')
  })

  it('funktioniert in einem leeren Feld', () => {
    expect(toggleList({ value: '', start: 0, end: 0 }).value).toBe('- ')
  })
})

describe('insertLink', () => {
  it('nutzt die Markierung als Linktext', () => {
    expect(insertLink({ value: 'Siehe Skript hier', start: 6, end: 12 }, 'https://a.de').value).toBe(
      'Siehe [Skript](https://a.de) hier',
    )
  })

  it('setzt „Linktext“ ohne Markierung', () => {
    expect(insertLink({ value: '', start: 0, end: 0 }, 'https://a.de').value).toBe('[Linktext](https://a.de)')
  })
})

describe('normalizeLinkUrl', () => {
  it('ergänzt https:// und akzeptiert Web- und Mail-Adressen', () => {
    expect(normalizeLinkUrl('www.ihk.de')).toBe('https://www.ihk.de')
    expect(normalizeLinkUrl(' http://a.de/x ')).toBe('http://a.de/x')
    expect(normalizeLinkUrl('mailto:a@b.de')).toBe('mailto:a@b.de')
  })

  it('lehnt gefährliche oder kaputte Ziele ab', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeLinkUrl('data:text/html,<b>x</b>')).toBeNull()
    expect(normalizeLinkUrl('')).toBeNull()
    expect(normalizeLinkUrl('zwei wörter')).toBeNull()
  })
})
