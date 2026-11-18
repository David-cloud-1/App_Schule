import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { starteAufgabe, type Aufgabenbearbeiter } from './aufgabenwerk/eintritt'
import { absaetzeAusHtml, absaetzeZuHtml, textFeldWert } from './aufgabenwerk/teile'

/**
 * PROJ-114, Funde aus dem Browser-Durchgang (2026-11-18):
 * - weitere Textfelder (Musterlösung, Ergebnis, Ausgangssituation) ohne sichtbare Beschriftung und fett
 * - Ausgangssituation der Fallakte zeigte rohe <p>-Tags
 */

describe('Absätze statt <p>-Tags', () => {
  it('liest reine Absätze als Text mit Leerzeile und schreibt sie zurück', () => {
    expect(absaetzeAusHtml('<p>Montag &amp; Dienstag</p>\n<p>Zweiter</p>')).toBe('Montag & Dienstag\n\nZweiter')
    expect(absaetzeZuHtml('Montag & Dienstag\n\nZweiter')).toBe('<p>Montag &amp; Dienstag</p><p>Zweiter</p>')
    expect(absaetzeZuHtml('  \n\n ')).toBe('')
    // Getippte Tags werden zu Text, nicht zu HTML
    expect(absaetzeZuHtml('a <b>x</b>')).toBe('<p>a &lt;b&gt;x&lt;/b&gt;</p>')
  })

  it('lässt alles andere unverändert (einfacher Text, weitere Tags)', () => {
    expect(absaetzeAusHtml('Nur Text')).toBeNull()
    expect(absaetzeAusHtml('<p>a <strong>b</strong></p>')).toBeNull()
    expect(textFeldWert('Nur Text').speichere('x ')).toBe('x ')
  })

  it('behält getippte Leerzeichen am Ende, solange sie gespeichert denselben Stand ergeben', () => {
    const roh = absaetzeZuHtml('Hallo ')
    expect(textFeldWert(roh, 'Hallo ').anzeige).toBe('Hallo ')
    // Passt der getippte Stand nicht mehr (z. B. nach Rückgängig), zählt der gespeicherte
    expect(textFeldWert('<p>Anders</p>', 'Hallo ').anzeige).toBe('Anders')
  })
})

let ziel: HTMLElement
let gemeldet: Record<string, unknown>[]
let werk: Aufgabenbearbeiter

function starte(block: Record<string, unknown>) {
  document.body.innerHTML = '<section class="inhalt" data-wk="k0-e3"><p class="frage">Alt</p></section>'
  ziel = document.querySelector('section')!
  gemeldet = []
  werk = starteAufgabe({ ziel, block: block as never, marke: 'k0-e3', typName: 'Typ', eintrag: null, melde: (n) => gemeldet.push(n) })
}
const letzterBlock = () => gemeldet.filter((n) => n.wkAufgabeAenderung).at(-1)!.block as Record<string, unknown>
const feld = (name: string) => ziel.querySelector<HTMLTextAreaElement>(`[data-aw-fokus="${name}"]`)!

describe('Aufgabenwerk: Haupt- und Nebenfelder', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('Offene Frage: Frage fett, Musterlösung mit sichtbarer Beschriftung', () => {
    starte({ type: 'freitext', question: 'Warum?', solution: 'Darum.' })
    expect(feld('question').classList.contains('frage')).toBe(true)
    const loesung = feld('solution')
    expect(loesung.classList.contains('frage')).toBe(false)
    expect(ziel.querySelector(`label[for="${loesung.id}"]`)?.textContent).toBe('Musterlösung')
  })

  it('Rechenaufgabe: Ergebnis beschriftet', () => {
    starte({ type: 'calculation_exercise', task: 'Rechne.', result: '2,00' })
    expect(ziel.querySelector(`label[for="${feld('result').id}"]`)?.textContent).toBe('Ergebnis')
  })

  it('Arbeitsanweisung bleibt wie bisher, ohne Beschriftung', () => {
    starte({ type: 'fill_blanks', description: 'Ergänze.', text: 'Eine *Woche* hat sieben Tage.' })
    expect(feld('description').classList.contains('frage')).toBe(true)
    expect(ziel.querySelector('.wk-aw-neben')).toBeNull()
  })

  it('Fallakte: Ausgangssituation ohne Tags, Tippen speichert wieder Absätze', () => {
    starte({
      type: 'fallakte',
      titel: 'Fall 1',
      situation: '<p>Montagmorgen.</p><p>Der Kunde ruft an.</p>',
      schritte: [
        { frage: 'F1', antworten: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
        { frage: 'F2', antworten: [{ text: 'c', correct: true }, { text: 'd', correct: false }] },
      ],
    })
    expect(feld('titel').classList.contains('frage')).toBe(true)
    const s = feld('situation')
    expect(s.value).toBe('Montagmorgen.\n\nDer Kunde ruft an.')
    expect(ziel.querySelector(`label[for="${s.id}"]`)?.textContent).toBe('Ausgangssituation')
    s.value = 'Montagmorgen. \n\nDer Kunde ruft an.'
    fireEvent.input(s)
    // Das Leerzeichen am Ende bleibt im Feld stehen
    expect(feld('situation').value).toBe('Montagmorgen. \n\nDer Kunde ruft an.')
    vi.advanceTimersByTime(700)
    expect(letzterBlock().situation).toBe('<p>Montagmorgen.</p><p>Der Kunde ruft an.</p>')
  })
})
