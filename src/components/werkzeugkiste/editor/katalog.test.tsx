import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { KatalogDialog, OHNE_BILDER, gesperrtGrund } from './katalog-dialog'
import { KatalogSkizze, SKIZZEN_TYPEN } from './katalog-skizzen'
import { FORMULARE, KapiteltestFormular } from './editor-formulare'
import { alsZeit, ausZeit, feldName } from './editor-formulare-katalog'
import { KATALOG, beispielBlock, katalogEintrag } from '@/lib/werkzeugkiste-katalog'
import { TYP_NAMEN, type Block } from '@/lib/werkzeugkiste-editor'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = () => {}

const letzter = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)!

function katalog(props: Partial<Parameters<typeof KatalogDialog>[0]> = {}) {
  const onWaehle = vi.fn()
  const onOpenChange = vi.fn()
  render(<KatalogDialog offen onOpenChange={onOpenChange} onWaehle={onWaehle} bilder={3} {...props} />)
  return { onWaehle, onOpenChange }
}

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('Katalog-Fenster (PROJ-90)', () => {
  it('zeigt sieben Gruppen und 33 Einträge mit „Gut für“', () => {
    katalog()
    expect(screen.getByRole('heading', { name: 'Block hinzufügen' })).toBeInTheDocument()
    for (const g of ['Lesen & Nachschlagen', 'Abfragen', 'Lücken & Wörter', 'Zuordnen & Ordnen', 'Rechnen', 'Spiele & Rätsel', 'Selbstcheck & Wiederholen']) {
      expect(screen.getByRole('heading', { name: g })).toBeInTheDocument()
    }
    const eintraege = document.querySelectorAll('[data-katalog-eintrag]')
    expect(eintraege).toHaveLength(33)
    expect(screen.getAllByText('Gut für:')).toHaveLength(33)
    expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument()
  })

  it('setzt den Fokus ins Suchfeld und filtert beim Tippen', () => {
    katalog()
    const suche = screen.getByLabelText('Aufgabentyp suchen')
    expect(suche).toHaveFocus()
    fireEvent.change(suche, { target: { value: 'kreuzwort' } })
    const eintraege = document.querySelectorAll('[data-katalog-eintrag]')
    expect([...eintraege].map((e) => e.getAttribute('data-katalog-eintrag'))).toEqual(['crossword'])
    expect(screen.queryByRole('heading', { name: 'Abfragen' })).not.toBeInTheDocument()
  })

  it('zeigt ohne Treffer einen Leerzustand mit „Suche löschen“', () => {
    katalog()
    fireEvent.change(screen.getByLabelText('Aufgabentyp suchen'), { target: { value: 'zzzz' } })
    expect(screen.getByText('Kein Aufgabentyp passt zu „zzzz“.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Suche löschen/ }))
    expect(document.querySelectorAll('[data-katalog-eintrag]')).toHaveLength(33)
  })

  it('fügt per Klick sofort ein', () => {
    const { onWaehle } = katalog()
    fireEvent.click(document.querySelector('[data-katalog-eintrag="memory_game"]')!)
    expect(onWaehle).toHaveBeenCalledWith('memory_game')
  })

  it('wandert mit Pfeiltasten durch die Einträge', () => {
    katalog()
    fireEvent.keyDown(screen.getByLabelText('Aufgabentyp suchen'), { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-katalog-eintrag')).toBe('text')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-katalog-eintrag')).toBe('image')
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement?.getAttribute('data-katalog-eintrag')).toBe('selbsteinschaetzung')
  })

  it('zeigt „Zuletzt verwendet“ oben und blendet es bei der Suche aus', () => {
    window.localStorage.setItem('wk-katalog-zuletzt', JSON.stringify(['fallakte', 'text']))
    katalog()
    const zuletzt = screen.getByRole('heading', { name: 'Zuletzt verwendet' }).parentElement!
    expect([...zuletzt.querySelectorAll('[data-katalog-eintrag]')].map((e) => e.getAttribute('data-katalog-eintrag'))).toEqual(['fallakte', 'text'])
    // Kennungen bleiben eindeutig, obwohl „Fallakte“ zweimal steht
    const ids = [...document.querySelectorAll('[id^="katalog-"]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    fireEvent.change(screen.getByLabelText('Aufgabentyp suchen'), { target: { value: 'fall' } })
    expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument()
  })

  it('graut Bild-Typen ohne Bilder aus und fügt sie nicht ein', () => {
    const { onWaehle } = katalog({ bilder: 0 })
    const bild = document.querySelector('[data-katalog-eintrag="image"]')!
    expect(bild).toHaveAttribute('aria-disabled', 'true')
    expect(within(bild as HTMLElement).getByText(OHNE_BILDER)).toBeInTheDocument()
    fireEvent.click(bild)
    expect(onWaehle).not.toHaveBeenCalled()
    // Bilder ordnen bleibt wählbar (Bilder je Schritt sind optional)
    expect(document.querySelector('[data-katalog-eintrag="image_sequencing"]')).not.toHaveAttribute('aria-disabled')
  })

  it('nennt den Grund beim Laden und bei Fehlern', () => {
    const bild = katalogEintrag('bildzuordnung')!
    expect(gesperrtGrund(bild, 'laedt')).toMatch(/geladen/)
    expect(gesperrtGrund(bild, 'fehler')).toMatch(/nicht geladen/)
    expect(gesperrtGrund(bild, 2)).toBeNull()
    expect(gesperrtGrund(katalogEintrag('text')!, 0)).toBeNull()
  })

  it('zeigt im Kapiteltest nur die drei erlaubten Typen mit Begründung', () => {
    katalog({ erlaubt: ['multiple_choice', 'true_false', 'fill_blanks'] })
    expect(screen.getByRole('heading', { name: 'Frage hinzufügen' })).toBeInTheDocument()
    expect(screen.getByText('Im Kapiteltest sind nur diese Fragetypen möglich.')).toBeInTheDocument()
    expect([...document.querySelectorAll('[data-katalog-eintrag]')].map((e) => e.getAttribute('data-katalog-eintrag'))).toEqual([
      'multiple_choice',
      'true_false',
      'fill_blanks',
    ])
  })

  it('markiert ausgewertete Typen', () => {
    katalog()
    expect(within(document.querySelector('[data-katalog-eintrag="crossword"]') as HTMLElement).getByText('wird ausgewertet')).toBeInTheDocument()
    expect(within(document.querySelector('[data-katalog-eintrag="text"]') as HTMLElement).queryByText('wird ausgewertet')).not.toBeInTheDocument()
  })
})

describe('Skizzen', () => {
  it('gibt es für jeden Katalog-Typ', () => {
    expect(SKIZZEN_TYPEN.sort()).toEqual(KATALOG.map((e) => e.typ).sort())
  })

  it('ist Schmuck ohne alt und Bild mit alt', () => {
    const { container } = render(
      <>
        <KatalogSkizze typ="crossword" alt="" />
        <KatalogSkizze typ="crossword" alt="Kreuzworträtsel" />
      </>,
    )
    const [a, b] = container.querySelectorAll('svg')
    expect(a).toHaveAttribute('aria-hidden', 'true')
    expect(b).toHaveAttribute('role', 'img')
    expect(b).toHaveAttribute('aria-label', 'Kreuzworträtsel')
  })
})

describe('Formulare für alle Typen (PROJ-90)', () => {
  it('öffnen jeden Beispielinhalt ohne Fehler', () => {
    for (const typ of Object.keys(TYP_NAMEN).filter((t) => t !== 'text')) {
      const F = FORMULARE[typ]
      const { unmount } = render(<F block={beispielBlock(typ)} onChange={() => {}} />)
      unmount()
    }
  })

  it('behalten unbekannte Felder und den vorhandenen Feldnamen (steps statt schritte)', () => {
    const onChange = vi.fn()
    const block: Block = {
      type: 'rechenweg',
      question: 'Alte Aufgabe',
      steps: [
        { question: 'A?', result: '1' },
        { question: 'B?', result: '2' },
      ],
      neuesFeld: 'bleibt',
    }
    render(<FORMULARE.rechenweg block={block} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/Aufgabe mit allen/), { target: { value: 'Neue Aufgabe' } })
    expect(letzter(onChange)[0]).toMatchObject({ question: 'Neue Aufgabe', neuesFeld: 'bleibt' })
    expect(letzter(onChange)[0]).not.toHaveProperty('task')
    fireEvent.change(screen.getByLabelText(/^Schritt 1: Frage/), { target: { value: 'A neu?' } })
    const neu = letzter(onChange)[0]
    expect(neu.steps[0]).toEqual({ question: 'A neu?', result: '1' })
    expect(neu).not.toHaveProperty('schritte')
  })

  it('Zuordnen: Kategorie per Auswahl, nur vorhandene Kategorien', () => {
    const onChange = vi.fn()
    render(<FORMULARE.drag_drop block={beispielBlock('drag_drop')} onChange={onChange} />)
    fireEvent.change(screen.getAllByLabelText(/^Begriff 1/)[0], { target: { value: 'Birne' } })
    expect(letzter(onChange)[0].items[0]).toEqual({ text: 'Birne', category: 'Obst' })
  })

  it('Kopfrechnen speichert ganze Zahlen als Zahl', () => {
    const onChange = vi.fn()
    render(<FORMULARE.arithmetic_quiz block={beispielBlock('arithmetic_quiz')} onChange={onChange} />)
    fireEvent.change(screen.getAllByLabelText(/^Ergebnis/)[0], { target: { value: '21' } })
    expect(letzter(onChange)[0].questions[0].answer).toBe(21)
    fireEvent.change(screen.getAllByLabelText(/^Ergebnis/)[0], { target: { value: '2,5' } })
    expect(letzter(onChange)[0].questions[0].answer).toBe('2,5')
  })

  it('Lernkarten zum Tippen: Antwortliste bleibt Liste', () => {
    const onChange = vi.fn()
    render(<FORMULARE.flashcards block={{ type: 'flashcards', cards: [{ front: 'F', back: ['A', 'B'] }, { front: 'G', back: 'C' }] }} onChange={onChange} />)
    const felder = screen.getAllByLabelText(/^Richtige Antworten/)
    expect(felder[0]).toHaveValue('A / B')
    fireEvent.change(felder[0], { target: { value: 'A / B / D' } })
    expect(letzter(onChange)[0].cards[0].back).toEqual(['A', 'B', 'D'])
  })

  it('Video: Zeitpunkt als mm:ss', () => {
    expect(alsZeit(75)).toBe('1:15')
    expect(alsZeit(undefined)).toBe('')
    expect(ausZeit('1:15')).toBe(75)
    expect(ausZeit('90')).toBe(90)
    expect(ausZeit('abc')).toBe('abc')
  })

  it('Bildzuordnung: Punkte über Prozentfelder, Werte außerhalb werden gemeldet', () => {
    const onChange = vi.fn()
    render(
      <FORMULARE.bildzuordnung
        block={{ type: 'bildzuordnung', path: 'images/a.png', alt: 'x', points: [{ label: 'A', x: 120, y: 10 }] }}
        onChange={onChange}
      />,
    )
    expect(screen.getByText('Dieser Punkt liegt außerhalb des Bildes.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Links (%)'), { target: { value: '40' } })
    expect(letzter(onChange)[0].points).toEqual([{ label: 'A', x: 40, y: 10 }])
    expect(letzter(onChange)[0]).not.toHaveProperty('punkte')
  })

  it('feldName nimmt den vorhandenen Namen, sonst den ersten', () => {
    expect(feldName({ steps: [] }, ['schritte', 'steps'])).toBe('steps')
    expect(feldName({}, ['schritte', 'steps'])).toBe('schritte')
    expect(feldName({ schritte: null, steps: [1] }, ['schritte', 'steps'])).toBe('steps')
  })
})

describe('Kapiteltest über den Katalog (E6)', () => {
  it('„Frage hinzufügen“ öffnet den gefilterten Katalog und hängt eine Beispielfrage an', () => {
    const onChange = vi.fn()
    const block = { type: 'question_set', pass_percentage: 70, questions: [beispielBlock('true_false')] }
    render(<KapiteltestFormular block={block} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Frage hinzufügen/ }))
    expect(screen.getByText('Im Kapiteltest sind nur diese Fragetypen möglich.')).toBeInTheDocument()
    fireEvent.click(document.querySelector('[data-katalog-eintrag="fill_blanks"]')!)
    const neu = letzter(onChange)[0]
    expect(neu.questions).toHaveLength(2)
    expect(neu.questions[1]).toEqual(beispielBlock('fill_blanks'))
  })

  it('zeigt nicht erlaubte Fragen als „wird übersprungen“', () => {
    render(<KapiteltestFormular block={{ type: 'question_set', questions: [beispielBlock('crossword')] }} onChange={() => {}} />)
    expect(screen.getByText(/Nicht im Kapiteltest möglich – wird übersprungen/)).toBeInTheDocument()
  })
})
