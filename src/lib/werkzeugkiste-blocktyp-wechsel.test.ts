import { describe, expect, it } from 'vitest'
import { beispielBlock } from '@/lib/werkzeugkiste-katalog'
import { KATALOG } from '@/lib/werkzeugkiste-katalog'
import { FAMILIEN, familieVon, planeWechsel, wechselZiele } from '@/lib/werkzeugkiste-blocktyp-wechsel'
import type { Block } from '@/lib/werkzeugkiste-editor'

/** Beispielblock, an dem etwas geändert wurde (zählt dann als eigener Inhalt) */
function eigener(typ: string): Block {
  const b = beispielBlock(typ)
  if (typeof b.question === 'string') b.question = `${b.question} (eigene)`
  else if (typeof b.text === 'string') b.text = `${b.text} (eigene)`
  else if (Array.isArray(b.cards)) (b.cards as { front: string }[])[0].front += ' (eigene)'
  else if (Array.isArray(b.items)) (b.items as string[])[0] += ' (eigene)'
  else if (Array.isArray(b.steps)) (b.steps as { text: string }[])[0].text += ' (eigene)'
  else if (Array.isArray(b.questions)) (b.questions as { question: string }[])[0].question += ' (eigene)'
  return b
}

describe('Familien', () => {
  it('jeder Typ steht im Katalog und in genau einer Familie', () => {
    const katalog = new Set(KATALOG.map((e) => e.typ))
    const alle = Object.values(FAMILIEN).flat()
    expect(new Set(alle).size).toBe(alle.length)
    for (const t of alle) expect(katalog.has(t)).toBe(true)
  })

  it('single_choice gehört zur Auswahlfrage', () => {
    expect(familieVon('single_choice')).toBe(FAMILIEN.fragen)
    expect(wechselZiele('single_choice')).toEqual(['true_false', 'single_choice_set'])
  })

  it('Typen ohne Familie haben keine Ziele', () => {
    expect(wechselZiele('crossword')).toEqual([])
    expect(familieVon('text')).toBeNull()
    expect(planeWechsel({ type: 'crossword' }, 'memory_game')).toBeNull()
  })
})

describe('alle gerichteten Wechsel', () => {
  const paare = Object.values(FAMILIEN).flatMap((f) => f.flatMap((von) => f.filter((nach) => nach !== von).map((nach) => [von, nach] as const)))

  it('es gibt 26 Paare', () => {
    expect(paare).toHaveLength(26)
  })

  it.each(paare)('%s → %s', (von, nach) => {
    const plan = planeWechsel(eigener(von), nach)
    expect(plan).not.toBeNull()
    expect(plan!.block.type).toBe(nach)
    expect(plan!.beispiel).toBe(false)
    expect(plan!.uebernommen.length).toBeGreaterThan(0)
  })

  it.each(paare)('%s → %s: unverändertes Beispiel bekommt das Beispiel des Zieltyps', (von, nach) => {
    const plan = planeWechsel(beispielBlock(von), nach)
    expect(plan!.beispiel).toBe(true)
    expect(plan!.block).toEqual(beispielBlock(nach))
    expect(plan!.verloren).toEqual([])
  })
})

describe('Fragen', () => {
  const mc: Block = {
    type: 'multiple_choice',
    question: 'Hauptstadt?',
    answers: [
      { text: 'Berlin', correct: true, feedback: 'Genau' },
      { text: 'Bonn', correct: false },
      { text: 'Köln', correct: false },
    ],
  }

  it('Auswahlfrage → Richtig/falsch: Aussage, „richtig“ voreingestellt, Antworten verloren', () => {
    const p = planeWechsel(mc, 'true_false')!
    expect(p.block).toEqual({ type: 'true_false', question: 'Hauptstadt?', correct: true, feedback_correct: '', feedback_wrong: '' })
    expect(p.verloren).toContain('3 Antworten')
    expect(p.verloren).toContain('Rückmeldungen zu den Antworten')
    expect(p.pruefen[0]).toMatch(/voreingestellt/)
  })

  it('Richtig/falsch → Auswahlfrage: zwei Antworten mit passendem Feedback', () => {
    const p = planeWechsel({ type: 'true_false', question: 'Wasser ist nass.', correct: false, feedback_correct: 'Stimmt', feedback_wrong: 'Doch nass' }, 'multiple_choice')!
    expect(p.block.answers).toEqual([
      { text: 'Richtig', correct: false, feedback: 'Doch nass' },
      { text: 'Falsch', correct: true, feedback: 'Stimmt' },
    ])
    expect(p.verloren).toEqual([])
  })

  it('Auswahlfrage → Schnellfragen: erste richtige, falsche Antworten, Feedback verloren', () => {
    const p = planeWechsel(mc, 'single_choice_set')!
    expect(p.block.questions).toEqual([{ question: 'Hauptstadt?', correct: 'Berlin', wrong: ['Bonn', 'Köln'] }])
    expect(p.verloren).toEqual(['Rückmeldungen zu den Antworten'])
  })

  it('mehrere richtige Antworten: nur die erste bleibt, Anzahl wird genannt', () => {
    const p = planeWechsel(
      { type: 'multiple_choice', question: 'Q', answers: [{ text: 'a', correct: true }, { text: 'b', correct: true }, { text: 'c', correct: false }, { text: 'd', correct: false }] },
      'single_choice_set',
    )!
    expect(p.block.questions).toEqual([{ question: 'Q', correct: 'a', wrong: ['c', 'd'] }])
    expect(p.verloren).toContain('1 weitere richtige Antwort')
  })

  it('keine richtige Antwort: Hinweis „bitte prüfen“', () => {
    const p = planeWechsel({ type: 'multiple_choice', question: 'Q', answers: [{ text: 'a', correct: false }, { text: 'b', correct: false }] }, 'single_choice_set')!
    expect(p.pruefen.join(' ')).toMatch(/keine richtige Antwort/)
  })

  it('Schnellfragen mit 12 Fragen → Auswahlfrage: nennt 11 verlorene Fragen', () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({ question: `F${i}`, correct: 'r', wrong: ['x', 'y'] }))
    const p = planeWechsel({ type: 'single_choice_set', questions }, 'multiple_choice')!
    expect(p.verloren).toContain('11 weitere Fragen')
    expect(p.block.question).toBe('F0')
    expect(p.block.answers).toHaveLength(3)
  })

  it('single_choice wechselt wie multiple_choice', () => {
    const p = planeWechsel({ ...mc, type: 'single_choice' }, 'single_choice_set')!
    expect(p.block.type).toBe('single_choice_set')
  })

  it('unbekannte Felder werden als „Weitere Angaben“ genannt', () => {
    const p = planeWechsel({ ...mc, kommentar: 'x', stufe: 2 }, 'true_false')!
    expect(p.verloren).toContain('Weitere Angaben (2)')
  })
})

describe('Lücken & Wörter', () => {
  it('Lückentext → Wörter ziehen: erste Variante, Position bleibt', () => {
    const p = planeWechsel({ type: 'fill_blanks', text: 'Ein *CMR/Frachtbrief* gilt, der *Spediteur* haftet.', description: 'Ergänze.' }, 'drag_words')!
    expect(p.block).toEqual({ type: 'drag_words', text: 'Ein *CMR* gilt, der *Spediteur* haftet.', description: 'Ergänze.' })
    expect(p.verloren.join(' ')).toMatch(/Alternative Schreibweisen \(1 Lücke\)/)
  })

  it('Wörter ziehen → Lückentext: Tipp geht verloren', () => {
    const p = planeWechsel({ type: 'drag_words', text: 'Der *Begriff:Hinweis* gilt.' }, 'fill_blanks')!
    expect(p.block.text).toBe('Der *Begriff* gilt.')
    expect(p.verloren).toContain('1 Hinweis')
  })

  it('Lückentext mit Hinweis (beide Schreibweisen) → Wörter ziehen übernimmt den Tipp', () => {
    const a = planeWechsel({ type: 'advanced_fill_blanks', text: 'Der *Spediteur* (Beruf) fährt.' }, 'drag_words')!
    const b = planeWechsel({ type: 'advanced_fill_blanks', text: 'Der *Spediteur (Beruf)* fährt.' }, 'drag_words')!
    expect(a.block.text).toBe('Der *Spediteur:Beruf* fährt.')
    expect(b.block.text).toBe('Der *Spediteur:Beruf* fährt.')
    expect(a.uebernommen).toContain('1 Tipp')
  })

  it('Lückentext mit Hinweis → Lückentext entfernt den Hinweis auch hinter den Sternen', () => {
    const p = planeWechsel({ type: 'advanced_fill_blanks', text: 'Der *Spediteur* (Beruf) fährt.' }, 'fill_blanks')!
    expect(p.block.text).toBe('Der *Spediteur* fährt.')
    expect(p.verloren).toContain('1 Hinweis')
  })

  it('Wechsel nach „Lückentext mit Hinweis“ erzeugt keine Hinweise und sagt es', () => {
    const p = planeWechsel({ type: 'mark_words', text: 'Der *rote* Ball.' }, 'advanced_fill_blanks')!
    expect(p.block.text).toBe('Der *rote* Ball.')
    expect(p.pruefen.join(' ')).toMatch(/keinen Hinweis/)
  })

  it('Text ohne Sternchen: Hinweis', () => {
    const p = planeWechsel({ type: 'fill_blanks', text: 'Nichts markiert.' }, 'mark_words')!
    expect(p.pruefen.join(' ')).toMatch(/keine mit Sternchen/)
  })
})

describe('Karten', () => {
  const dialog: Block = { type: 'dialog_cards', title: 'Begriffe', cards: [{ front: 'A', back: '<p>Erklärung</p>' }, { front: 'B', back: 'b' }] }

  it('Umdrehen → Tippen: Formatierung entfällt, Titel geht verloren', () => {
    const p = planeWechsel(dialog, 'flashcards')!
    expect(p.block.cards).toEqual([{ front: 'A', back: 'Erklärung' }, { front: 'B', back: 'b' }])
    expect(p.verloren).toContain('Titel')
    expect(p.pruefen.join(' ')).toMatch(/Formatierung/)
  })

  it('Umdrehen mit 2 Karten → Memory: Warnung vor Mindestzahl', () => {
    const p = planeWechsel(dialog, 'memory_game')!
    expect(p.pruefen.join(' ')).toMatch(/mindestens 3 Paare/)
  })

  it('Memory mit 12 Paaren: Hinweis auf die Grenze von 10', () => {
    const cards = Array.from({ length: 12 }, (_, i) => ({ front: `v${i}`, back: `h${i}` }))
    const p = planeWechsel({ type: 'memory_game', description: 'Paare', cards }, 'flashcards')!
    const q = planeWechsel({ type: 'flashcards', description: 'Paare', cards }, 'memory_game')!
    expect(p.block.cards).toHaveLength(12)
    expect(q.pruefen.join(' ')).toMatch(/höchstens 10 Paare/)
    expect(p.uebernommen).toContain('Arbeitsauftrag')
  })

  it('Memory mit Alias-Feldern (pairs, a/b) wird gelesen', () => {
    const p = planeWechsel({ type: 'memory_game', pairs: [{ a: 'x', b: 'y' }, { a: 'u', b: 'v' }, { a: 'k', b: 'l' }] }, 'dialog_cards')!
    expect(p.block.cards).toEqual([{ front: 'x', back: 'y' }, { front: 'u', back: 'v' }, { front: 'k', back: 'l' }])
    expect(p.block).not.toHaveProperty('pairs')
  })

  it('Tippen → Umdrehen: Antwortliste wird Text, Arbeitsauftrag geht verloren', () => {
    const p = planeWechsel({ type: 'flashcards', description: 'Tipp', cards: [{ front: 'Woche', back: ['7', 'sieben'] }, { front: 'Jahr', back: '12' }] }, 'dialog_cards')!
    expect(p.block).toEqual({ type: 'dialog_cards', cards: [{ front: 'Woche', back: '7/sieben' }, { front: 'Jahr', back: '12' }] })
    expect(p.verloren).toContain('Arbeitsauftrag')
    expect(p.pruefen.join(' ')).toMatch(/Mehrere akzeptierte Antworten/)
  })
})

describe('Reihenfolgen', () => {
  it('Bilder ordnen → Reihenfolge: Bilder gehen verloren, leere Schritte heißen „Schritt N“', () => {
    const p = planeWechsel(
      { type: 'image_sequencing', description: 'Ordne', steps: [{ text: 'Eins', path: 'images/a.png' }, { text: '', path: 'images/b.png' }, { text: 'Drei' }] },
      'reihenfolge',
    )!
    expect(p.block).toEqual({ type: 'reihenfolge', description: 'Ordne', items: ['Eins', 'Schritt 2', 'Drei'] })
    expect(p.verloren).toContain('2 Bilder')
    expect(p.pruefen.join(' ')).toMatch(/Schritt N/)
  })

  it('Reihenfolge → Bilder ordnen: Texte bleiben, Arbeitsauftrag bleibt', () => {
    const p = planeWechsel({ type: 'reihenfolge', description: 'Ordne', items: ['A', 'B', 'C'] }, 'image_sequencing')!
    expect(p.block).toEqual({ type: 'image_sequencing', description: 'Ordne', steps: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] })
    expect(p.verloren).toEqual([])
  })

  it('weniger als drei Schritte: Hinweis', () => {
    const p = planeWechsel({ type: 'reihenfolge', items: ['A', 'B'] }, 'image_sequencing')!
    expect(p.pruefen.join(' ')).toMatch(/mindestens 3 Schritte/)
  })
})
