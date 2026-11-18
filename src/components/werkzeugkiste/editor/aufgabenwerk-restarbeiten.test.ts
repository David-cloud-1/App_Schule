import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { uebernimmAufgabe } from './aufgabenwerk/bauplan'
import { starteAufgabe, type Aufgabenbearbeiter } from './aufgabenwerk/eintritt'

/** PROJ-114, Restarbeiten: Ziehen zwischen Kästen, Kapiteltest-Lückentext ohne Sternchen, BUG-10 */

let ziel: HTMLElement
let gemeldet: Record<string, unknown>[]
let werk: Aufgabenbearbeiter

function starte(block: Record<string, unknown>) {
  document.body.innerHTML = '<section class="inhalt" data-wk="k0-e3"><p class="frage">Alt</p></section>'
  ziel = document.querySelector('section')!
  gemeldet = []
  werk = starteAufgabe({ ziel, block: block as never, marke: 'k0-e3', typName: 'Typ', eintrag: null, melde: (n) => gemeldet.push(n) })
}

describe('Zuordnen: Begriff in einen anderen Kasten ziehen', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('Loslassen über dem zweiten Kasten setzt die Kategorie des Begriffs', () => {
    starte({
      type: 'drag_drop',
      categories: ['Straße', 'Schiene'],
      items: [{ text: 'Lkw', category: 'Straße' }, { text: 'Güterzug', category: 'Schiene' }],
    })
    const griff = ziel.querySelector<HTMLElement>('.wk-aw-begriff .wk-aw-griff')!
    const zweiterKasten = ziel.querySelector('[data-aw-kat="1"]')!
    document.elementFromPoint = () => zweiterKasten
    fireEvent.pointerDown(griff, { pointerId: 1, button: 0 })
    fireEvent.pointerUp(griff, { pointerId: 1, clientX: 5, clientY: 5 })
    vi.advanceTimersByTime(700)
    const stand = gemeldet.filter((n) => n.wkAufgabeAenderung).pop()!.block as { items: { text: string; category: string }[] }
    expect(stand.items.find((i) => i.text === 'Lkw')!.category).toBe('Schiene')
  })

  it('Loslassen außerhalb aller Kästen ändert nichts', () => {
    starte({ type: 'drag_drop', categories: ['A', 'B'], items: [{ text: 'x', category: 'A' }] })
    const griff = ziel.querySelector<HTMLElement>('.wk-aw-begriff .wk-aw-griff')!
    document.elementFromPoint = () => document.body
    fireEvent.pointerDown(griff, { pointerId: 1, button: 0 })
    fireEvent.pointerUp(griff, { pointerId: 1, clientX: 5, clientY: 5 })
    vi.advanceTimersByTime(700)
    expect(gemeldet.filter((n) => n.wkAufgabeAenderung)).toHaveLength(0)
  })
})

describe('Kapiteltest: Lückentext ohne Sternchen', () => {
  afterEach(() => {
    werk?.ab()
    document.body.innerHTML = ''
  })
  it('zeigt die Lücke als Marke und lässt den gespeicherten Text unverändert', () => {
    starte({ type: 'question_set', pass_percentage: 70, questions: [{ type: 'fill_blanks', text: 'Der *Frachtführer* haftet.' }] })
    const feld = ziel.querySelector<HTMLElement>('[data-aw-karte="0"] .wk-aw-lt')!
    expect(feld).not.toBeNull()
    expect(feld.querySelector('[data-luecke="0"]')?.textContent).toContain('Frachtführer')
    expect(feld.textContent).not.toContain('*')
  })
})

describe('BUG-10: Bestand bleibt, wie er gespeichert ist', () => {
  const video = (time: unknown) => ({
    type: 'interactive_video',
    url: 'https://www.youtube.com/watch?v=1',
    questions: [{ time, question: 'Was?', answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] }],
  })
  it('Ein als Text gespeicherter Zeitpunkt blockiert die Änderung nicht und bleibt Text', () => {
    const alt = video('75')
    const r = uebernimmAufgabe(alt as never, { ...alt, questions: [{ ...alt.questions[0], question: 'Neu?' }] })
    expect(r.ok).toBe(true)
    expect(r.ok && (r.block.questions as Record<string, unknown>[])[0].time).toBe('75')
  })
  it('Ein ungültiger neuer Zeitpunkt wird weiter abgewiesen', () => {
    const alt = video(90)
    expect(uebernimmAufgabe(alt as never, { ...alt, questions: [{ ...alt.questions[0], time: '-5' }] }).ok).toBe(false)
  })
})

describe('QA-Korrekturen (BUG-13, BUG-14, BUG-15)', () => {
  const zwei = () => ({
    type: 'question_set',
    pass_percentage: 70,
    questions: [
      { type: 'fill_blanks', text: 'Erster *Text* hier.' },
      { type: 'fill_blanks', text: 'Zweiter *Satz* dort.' },
    ],
  })
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('BUG-13: Nach dem Löschen der ersten Frage zeigt Karte 1 den Text der zweiten – Tippen mischt nichts', () => {
    starte(zwei())
    fireEvent.click(ziel.querySelector<HTMLElement>('[data-aw-karte="0"] .wk-aw-weg')!)
    vi.advanceTimersByTime(700)
    const feld = ziel.querySelector<HTMLElement>('[data-aw-karte="0"] .wk-aw-lt')!
    expect(feld.textContent).toBe('Zweiter Satz dort.')
    feld.appendChild(document.createTextNode('!'))
    fireEvent.input(feld)
    vi.advanceTimersByTime(700)
    const stand = gemeldet.filter((n) => n.wkAufgabeAenderung).pop()!.block as { questions: { text: string }[] }
    expect(stand.questions).toEqual([{ type: 'fill_blanks', text: 'Zweiter *Satz* dort.!' }])
  })

  it('BUG-13: Nach dem Tauschen zeigen beide Karten ihren eigenen Text', () => {
    starte(zwei())
    fireEvent.keyDown(ziel.querySelector<HTMLElement>('[data-aw-karte="0"] .wk-aw-griff')!, { key: 'ArrowDown', altKey: true })
    vi.advanceTimersByTime(700)
    expect(ziel.querySelector('[data-aw-karte="0"] .wk-aw-lt')!.textContent).toBe('Zweiter Satz dort.')
    expect(ziel.querySelector('[data-aw-karte="1"] .wk-aw-lt')!.textContent).toBe('Erster Text hier.')
  })

  it('BUG-14: Eine neue Lückentext-Frage bekommt den Fokus im Textfeld', () => {
    starte({ type: 'question_set', pass_percentage: 70, questions: [{ type: 'true_false', question: 'X', correct: true }] })
    const knopf = [...ziel.querySelectorAll<HTMLButtonElement>('.wk-aw-neu')].find((b) => b.textContent?.includes('Lückentext'))!
    fireEvent.click(knopf)
    expect(document.activeElement?.classList.contains('wk-aw-lt')).toBe(true)
  })

  it('BUG-15: Ohne Wechselziel fehlt „Aufgabentyp ändern“ im Menü', () => {
    document.body.innerHTML = '<section data-wk="k0-e3"><p>Alt</p></section>'
    const z = document.querySelector('section')!
    werk = starteAufgabe({ ziel: z, block: { type: 'drag_drop', categories: ['A', 'B'], items: [] } as never, marke: 'k0-e3', typName: 'T', eintrag: null, typWechsel: false, melde: () => {} })
    fireEvent.click([...z.querySelectorAll<HTMLButtonElement>('.wk-el-k')].find((b) => b.textContent === 'Mehr …')!)
    const eintraege = [...z.querySelectorAll('.wk-aw-menue button')].map((b) => b.textContent)
    expect(eintraege).toEqual(['Quelltext bearbeiten'])
  })
})
