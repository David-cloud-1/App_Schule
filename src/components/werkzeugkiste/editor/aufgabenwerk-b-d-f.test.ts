import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { BAUPLAENE, LOESCH_TEXTE, eintragFuerBlock, hinweise, uebernimmAufgabe } from './aufgabenwerk/bauplan'
import { starteAufgabe, type Aufgabenbearbeiter } from './aufgabenwerk/eintritt'

/**
 * PROJ-114, Bauschritt 3: Muster B (Zeilen), D (Gruppen), F (Schritte), Memory/Kopfrechnen (C kurz)
 * und die Einzelfeld-Typen.
 */

const reihe = () => ({ type: 'reihenfolge', items: ['Auftrag annehmen', 'Ware abholen', 'Ware liefern'] })
const zuordnen = () => ({
  type: 'drag_drop',
  categories: ['Straße', 'Schiene'],
  items: [
    { text: 'Lkw', category: 'Straße' },
    { text: 'Güterzug', category: 'Schiene' },
    { text: 'Sattelzug', category: 'Straße' },
  ],
})
const trainer = () => ({
  type: 'trainer',
  runden: 3,
  gruppen: [
    { titel: 'Ablauf', reihe: ['A', 'B'], stoerer: ['X'] },
    { titel: 'Haftung', reihe: ['C', 'D'] },
  ],
})
const rechenweg = () => ({
  type: 'rechenweg',
  task: 'Berechne den Preis.',
  schritte: [
    { frage: 'Netto?', ergebnis: '400,00', einheit: '€', hinweis: 'Menge mal Preis' },
    { frage: 'Brutto?', ergebnis: '476,00' },
  ],
})

describe('Bauplan: Muster B, D, F', () => {
  it('weist den Typen ihre Muster zu', () => {
    expect(BAUPLAENE.reihenfolge.muster).toBe('B')
    expect(BAUPLAENE.drag_drop.muster).toBe('D')
    expect(BAUPLAENE.trainer.muster).toBe('D')
    expect(BAUPLAENE.rechenweg.muster).toBe('F')
    expect(BAUPLAENE.freitext.muster).toBe('Einzel')
  })

  it('rechnet den angeklickten Eintrag auf den gespeicherten um (leere werden vom Kern weggelassen)', () => {
    const b = { type: 'reihenfolge', items: ['A', '', 'C'] }
    expect(eintragFuerBlock(b, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 2 })
    // Anzahl stimmt nicht mit dem Block überein: ohne Eintrag
    expect(eintragFuerBlock(b, { art: 'eintrag', nr: 1 }, 3)).toBeNull()
    const kat = { type: 'drag_drop', categories: ['K1', '', 'K2'], items: [] }
    expect(eintragFuerBlock(kat, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 2 })
    const rw = { type: 'rechenweg', task: 'T', steps: [{ question: 'a', result: '1' }, { question: '', result: '2' }, { question: 'c', result: '3' }] }
    expect(eintragFuerBlock(rw, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 2 })
    // Typen ohne Finder (Trainer, Memory): nie ein falscher Eintrag
    expect(eintragFuerBlock(trainer(), { art: 'eintrag', nr: 0 }, 2)).toBeNull()
  })

  it('übernimmt Zeilen, Einträge, Zahlen und Gruppen – und weist Ungültiges ab', () => {
    const r = uebernimmAufgabe(reihe(), { ...reihe(), items: ['Neu', 'Zwei\u0007', 'Drei'], boese: 'x' })
    expect(r.ok && r.block.items).toEqual(['Neu', 'Zwei', 'Drei'])
    expect(r.ok && 'boese' in r.block).toBe(false)
    expect(uebernimmAufgabe(reihe(), { ...reihe(), items: 'kein Feld' }).ok).toBe(false)

    const f = uebernimmAufgabe(rechenweg(), {
      ...rechenweg(),
      schritte: [{ frage: 'Neu?', ergebnis: '1', einheit: '', hinweis: 'h', fremd: 'weg' }, { frage: 'B', ergebnis: '2' }],
    })
    expect(f.ok && (f.block.schritte as Record<string, unknown>[])[0]).toEqual({ frage: 'Neu?', ergebnis: '1', einheit: '', hinweis: 'h' })
    // Optionale Felder, die nie da waren, werden nicht angelegt
    expect(f.ok && Object.keys((f.block.schritte as Record<string, unknown>[])[1])).toEqual(['frage', 'ergebnis'])

    const z = uebernimmAufgabe({ type: 'freitext', question: 'F', solution: 'L' }, { type: 'freitext', question: 'F', solution: 'L', min_zeichen: 80, rows: '' })
    expect(z.ok && z.block).toEqual({ type: 'freitext', question: 'F', solution: 'L', min_zeichen: 80 })
    expect(uebernimmAufgabe({ type: 'freitext', question: 'F', solution: 'L' }, { type: 'freitext', question: 'F', solution: 'L', rows: 'abc' }).ok).toBe(false)
  })

  it('bleibt beim gleichwertigen Feldnamen (task statt question, pairs statt cards)', () => {
    const r = uebernimmAufgabe({ type: 'freitext', task: 'Alt', solution: 'L' }, { type: 'freitext', task: 'Neu', solution: 'L' })
    expect(r.ok && r.block).toEqual({ type: 'freitext', task: 'Neu', solution: 'L' })
    const m = uebernimmAufgabe(
      { type: 'memory_game', pairs: [{ a: 'x', b: 'y' }] },
      { type: 'memory_game', pairs: [{ a: 'x2', b: 'y' }] },
    )
    expect(m.ok && m.block.pairs).toEqual([{ a: 'x2', b: 'y' }])
    expect(m.ok && 'cards' in m.block).toBe(false)
  })

  it('Kopfrechnen: ganze Zahlen werden als Zahl gespeichert, anderes bleibt Text', () => {
    const r = uebernimmAufgabe(
      { type: 'arithmetic_quiz', questions: [{ question: '1+1', answer: 2 }] },
      { type: 'arithmetic_quiz', questions: [{ question: '1+1', answer: '12' }, { question: 'Hälfte von 5', answer: '2,5' }] },
    )
    expect(r.ok && (r.block.questions as Record<string, unknown>[]).map((q) => q.answer)).toEqual([12, '2,5'])
  })

  it('meldet, was fehlt', () => {
    expect(hinweise({ type: 'reihenfolge', items: ['A'] }).map((h) => h.text)).toContain('Mindestens 3 Schritte nötig.')
    expect(hinweise({ type: 'calculation_example', formula: '', steps: [] }).map((h) => h.text).join()).toMatch(/Formel oder Rechenschritte/)
    expect(hinweise({ type: 'drag_drop', categories: ['A', 'A'], items: [{ text: 'x', category: 'B' }, { text: 'y', category: 'A' }] }).map((h) => h.text)).toEqual(
      expect.arrayContaining(['Zwei Kategorien heißen gleich.', 'Ein Begriff gehört noch zu keiner Kategorie.']),
    )
    expect(hinweise({ type: 'trainer', gruppen: [{ titel: '', reihe: ['A'] }, { titel: 'B', reihe: ['C', 'D'] }] }).map((h) => h.text)).toEqual(
      expect.arrayContaining(['Gruppe 1: Titel fehlt.', 'Gruppe 1: mindestens 2 Einträge nötig.']),
    )
    expect(hinweise({ type: 'freitext', question: 'F', solution: 'L', rows: 99 }).map((h) => h.text).join()).toMatch(/Höhe \(Zeilen\)/)
  })

  it('jeder Typ hat Texte für den Löschen-Toast', () => {
    expect(LOESCH_TEXTE['loeschen-kategorie']).toMatch(/Kategorie/)
    expect(LOESCH_TEXTE['loeschen-schritt']).toBe('Schritt gelöscht')
    expect(LOESCH_TEXTE['loeschen-trainer-stoerer']).toBe('Störer gelöscht')
  })
})

// ── Werk ─────────────────────────────────────────────────────────────

let ziel: HTMLElement
let gemeldet: Record<string, unknown>[]
let werk: Aufgabenbearbeiter

function starte(block: Record<string, unknown>, eintrag: Parameters<typeof starteAufgabe>[0]['eintrag'] = null) {
  document.body.innerHTML = '<section class="inhalt" data-wk="k0-e3"><p class="frage">Alt</p></section>'
  ziel = document.querySelector('section')!
  gemeldet = []
  werk = starteAufgabe({ ziel, block: block as never, marke: 'k0-e3', typName: 'Typ', eintrag, melde: (n) => gemeldet.push(n) })
  return werk
}
// Jede Gruppe muss die Nachrichten-Prüfung der App bestehen (kleine Buchstaben, Ziffern, _ und -)
const aenderungen = () => {
  const l = gemeldet.filter((n) => n.wkAufgabeAenderung)
  for (const n of l) expect(String(n.gruppe)).toMatch(/^[a-z0-9_-]{1,60}$/)
  return l
}
const letzterBlock = () => aenderungen().at(-1)!.block as Record<string, unknown>
const eingabe = (el: Element, wert: string) => {
  ;(el as HTMLInputElement).value = wert
  fireEvent.input(el)
}

describe('Aufgabenwerk: Muster B (Zeilen)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })
  const zeilen = () => Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="items"] textarea'))

  it('zeigt nummerierte Zeilen, Fokus in der angeklickten', () => {
    starte(reihe(), { art: 'eintrag', nr: 1 })
    expect(zeilen().map((z) => z.value)).toEqual(['Auftrag annehmen', 'Ware abholen', 'Ware liefern'])
    expect(document.activeElement).toBe(zeilen()[1])
    expect(ziel.querySelectorAll('.wk-aw-nr')).toHaveLength(3)
  })

  it('Enter legt eine neue Zeile an, Rücktaste in leerer Zeile löscht (mit Mindestzahl)', () => {
    starte(reihe())
    fireEvent.keyDown(zeilen()[2], { key: 'Enter' })
    expect(zeilen()).toHaveLength(4)
    expect(document.activeElement).toBe(zeilen()[3])
    fireEvent.keyDown(zeilen()[3], { key: 'Backspace' })
    expect(zeilen()).toHaveLength(3)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-schritt')
    // Mindestens drei: Rücktaste in leerer Zeile löscht nicht mehr
    zeilen()[2].value = ''
    fireEvent.keyDown(zeilen()[2], { key: 'Backspace' })
    expect(zeilen()).toHaveLength(3)
    fireEvent.click(ziel.querySelector('[aria-label="Schritt 1 löschen"]')!)
    expect(ziel.querySelector('[role="alert"]')?.textContent).toMatch(/Mindestens 3 Schritte nötig/)
  })

  it('Tippen meldet nach kurzer Pause; Einfügen mehrerer Zeilen macht mehrere Einträge', () => {
    starte(reihe())
    eingabe(zeilen()[0], 'Neu')
    expect(aenderungen()).toHaveLength(0)
    vi.advanceTimersByTime(700)
    expect((letzterBlock().items as string[])[0]).toBe('Neu')
    fireEvent.paste(zeilen()[2], { clipboardData: { getData: () => '- Rechnung\n- Zahlung' } })
    expect(letzterBlock().items).toEqual(['Neu', 'Ware abholen', 'Ware liefern', 'Rechnung', 'Zahlung'])
  })

  it('Alt+Pfeil sortiert um', () => {
    starte(reihe())
    fireEvent.keyDown(zeilen()[0], { key: 'ArrowDown', altKey: true })
    expect(letzterBlock().items).toEqual(['Ware abholen', 'Auftrag annehmen', 'Ware liefern'])
  })

  it('Wörtersuche: Wörter als Objekte werden zu Text, wie im Formular', () => {
    starte({ type: 'find_words', woerter: [{ word: 'CMR' }, { word: 'HGB' }, 'ADSP'] })
    expect(zeilen().length).toBe(0)
    expect(Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="woerter"] textarea')).map((z) => z.value)).toEqual(['CMR', 'HGB', 'ADSP'])
    fireEvent.click(ziel.querySelector('.wk-aw-neu')!)
    expect((letzterBlock().woerter as string[]).length).toBe(4)
    expect('words' in letzterBlock()).toBe(false)
  })

  it('Zahlfeld (Freitext): nur Ziffern, leer entfernt das Feld', () => {
    starte({ type: 'freitext', task: 'F', solution: 'L', rows: 4 })
    const f = ziel.querySelector<HTMLInputElement>('[data-aw-fokus="zahl-min_zeichen"]')!
    eingabe(f, '8a0')
    vi.advanceTimersByTime(700)
    expect(f.value).toBe('80')
    expect(letzterBlock().min_zeichen).toBe(80)
    eingabe(f, '')
    vi.advanceTimersByTime(700)
    expect('min_zeichen' in letzterBlock()).toBe(false)
    // Frage steht unter ihrem gültigen Namen „task“
    expect(ziel.querySelector<HTMLTextAreaElement>('[data-aw-fokus="task"]')!.value).toBe('F')
  })
})

describe('Aufgabenwerk: Muster D (Gruppen)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })
  const kasten = () => Array.from(ziel.querySelectorAll('.wk-aw-fach:not(.wk-aw-fach-ohne)'))
  const begriffe = () => Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('.wk-aw-begriff textarea')).map((t) => t.value)

  it('Zuordnen: ein Kasten je Kategorie mit seinen Begriffen; Klick auf Kategorie setzt den Fokus', () => {
    starte(zuordnen(), { art: 'eintrag', nr: 1 })
    expect(kasten()).toHaveLength(2)
    expect(Array.from(kasten()[0].querySelectorAll('textarea')).map((t) => t.value)).toEqual(['Lkw', 'Sattelzug'])
    expect(Array.from(kasten()[1].querySelectorAll('textarea')).map((t) => t.value)).toEqual(['Güterzug'])
    expect((document.activeElement as HTMLInputElement).value).toBe('Schiene')
  })

  it('Zuordnen: Kategorie umbenennen nimmt ihre Begriffe mit', () => {
    starte(zuordnen())
    eingabe(ziel.querySelector('[data-aw-fokus="kat-0"]')!, 'Straßenverkehr')
    vi.advanceTimersByTime(700)
    const b = letzterBlock()
    expect(b.categories).toEqual(['Straßenverkehr', 'Schiene'])
    expect((b.items as Record<string, string>[]).map((i) => i.category)).toEqual(['Straßenverkehr', 'Schiene', 'Straßenverkehr'])
    // Leeren und neu tippen verliert die Begriffe nicht
    eingabe(ziel.querySelector('[data-aw-fokus="kat-0"]')!, '')
    eingabe(ziel.querySelector('[data-aw-fokus="kat-0"]')!, 'Straße 2')
    vi.advanceTimersByTime(700)
    expect((letzterBlock().items as Record<string, string>[]).filter((i) => i.category === 'Straße 2')).toHaveLength(2)
  })

  it('Zuordnen: „+ Begriff“, Verschieben nach …, Löschen', () => {
    starte(zuordnen())
    fireEvent.click(kasten()[1].querySelector('.wk-aw-neu')!)
    // Der neue Begriff steht hinter dem letzten Begriff seines Kastens
    expect((letzterBlock().items as Record<string, string>[])[2]).toEqual({ text: '', category: 'Schiene' })
    expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement)
    const wahl = ziel.querySelector<HTMLSelectElement>('[aria-label="Begriff 1 verschieben nach …"]')!
    wahl.value = '1'
    fireEvent.change(wahl)
    expect((letzterBlock().items as Record<string, string>[])[0].category).toBe('Schiene')
    fireEvent.click(ziel.querySelector('[aria-label="Begriff 3 löschen"]')!)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-begriff')
    expect(begriffe()).toHaveLength(3)
    expect((letzterBlock().items as Record<string, string>[]).some((i) => i.text === '')).toBe(false)
  })

  it('Zuordnen: Kategorie löschen nimmt ihre Begriffe mit; Mindestzahl erklärt', () => {
    starte({ ...zuordnen(), categories: ['Straße', 'Schiene', 'Luft'] })
    fireEvent.click(ziel.querySelector('[aria-label="Kategorie 1 samt Begriffen löschen"]')!)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-kategorie')
    const b = letzterBlock()
    expect(b.categories).toEqual(['Schiene', 'Luft'])
    expect((b.items as Record<string, string>[]).map((i) => i.text)).toEqual(['Güterzug'])
    fireEvent.click(ziel.querySelector('[aria-label="Kategorie 1 samt Begriffen löschen"]')!)
    expect(ziel.querySelector('[role="alert"]')?.textContent).toMatch(/Mindestens 2 Kategorien/)
  })

  it('Zuordnen: Begriff ohne bekannte Kategorie steht in „Ohne Kategorie“', () => {
    starte({ ...zuordnen(), items: [...zuordnen().items, { text: 'Schiff', category: 'Wasser' }] })
    const ohne = ziel.querySelector('.wk-aw-fach-ohne')!
    expect(Array.from(ohne.querySelectorAll('textarea')).map((t) => t.value)).toEqual(['Schiff'])
    expect(ziel.textContent).toMatch(/gehört noch zu keiner Kategorie/)
  })

  it('Trainer: Kasten je Gruppe mit Titel, Hinweis, Einträgen und Störern', () => {
    starte(trainer())
    expect(ziel.querySelectorAll('.wk-aw-gruppen > ol > li')).toHaveLength(2)
    expect(ziel.querySelector<HTMLInputElement>('[data-aw-fokus="gt-0"]')!.value).toBe('Ablauf')
    const e = Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="gruppen-0-reihe"] textarea')).map((t) => t.value)
    expect(e).toEqual(['A', 'B'])
    expect(Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="gruppen-0-stoerer"] textarea')).map((t) => t.value)).toEqual(['X'])
    expect(ziel.querySelector<HTMLInputElement>('[data-aw-fokus="zahl-runden"]')!.value).toBe('3')
  })

  it('Trainer: Eintrag ändern und Störer löschen schreibt in die richtige Gruppe', () => {
    starte(trainer())
    eingabe(ziel.querySelector('[data-aw-liste="gruppen-0-reihe"] textarea')!, 'A neu')
    vi.advanceTimersByTime(700)
    expect(((letzterBlock().gruppen as Record<string, unknown>[])[0].reihe as string[])[0]).toBe('A neu')
    fireEvent.click(ziel.querySelector('[data-aw-liste="gruppen-0-stoerer"] [aria-label="Störer 1 löschen"]')!)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-trainer-stoerer')
    expect((letzterBlock().gruppen as Record<string, unknown>[])[0].stoerer).toEqual([])
    expect((letzterBlock().gruppen as Record<string, unknown>[])[1].reihe).toEqual(['C', 'D'])
  })

  it('Trainer: neue Gruppe bringt zwei leere Einträge mit; Mindestzahl der Einträge erklärt', () => {
    starte(trainer())
    fireEvent.click(ziel.querySelector('.wk-aw-gruppen > .wk-aw-neu')!)
    const g = (letzterBlock().gruppen as Record<string, unknown>[])[2]
    expect(g.reihe).toEqual(['', ''])
    fireEvent.click(ziel.querySelector('[data-aw-liste="gruppen-0-reihe"] [aria-label="Eintrag 1 löschen"]')!)
    expect(ziel.textContent).toMatch(/Mindestens 2 Einträge nötig/)
  })
})

describe('Aufgabenwerk: Muster F und C kurz (Einträge mit mehreren Feldern)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })
  const feld = (i: number, k: number) => ziel.querySelector<HTMLTextAreaElement>(`[data-aw-fokus="ef-${i}-${k}"]`)!

  it('Rechenweg: Frage, Ergebnis und Einheit in einer Zeile; Hinweis hinter dem Fragezeichen', () => {
    starte(rechenweg(), { art: 'eintrag', nr: 1 })
    expect(feld(0, 0).value).toBe('Netto?')
    expect(feld(0, 1).value).toBe('400,00')
    expect(feld(0, 2).value).toBe('€')
    expect(document.activeElement).toBe(feld(1, 0))
    expect(ziel.querySelector('.wk-aw-extra')).toBeNull()
    const knopf = ziel.querySelector<HTMLElement>('[aria-label^="Hinweis, falls es klemmt zu Schritt 1"]')!
    expect(knopf.getAttribute('data-voll')).toBe('true')
    fireEvent.click(knopf)
    expect(ziel.querySelector<HTMLTextAreaElement>('[data-aw-fokus="ex-0-0"]')!.value).toBe('Menge mal Preis')
    expect(document.activeElement).toBe(ziel.querySelector('[data-aw-fokus="ex-0-0"]'))
  })

  it('Tippen im Feld ändert nur dieses Feld; Enter springt zum nächsten Feld, dann zum nächsten Schritt', () => {
    starte(rechenweg())
    eingabe(feld(1, 1), '500,00')
    vi.advanceTimersByTime(700)
    expect((letzterBlock().schritte as Record<string, unknown>[])[1]).toEqual({ frage: 'Brutto?', ergebnis: '500,00' })
    fireEvent.keyDown(feld(0, 0), { key: 'Enter' })
    expect(document.activeElement).toBe(feld(0, 1))
    fireEvent.keyDown(feld(0, 2), { key: 'Enter' })
    expect(document.activeElement).toBe(feld(1, 0))
    fireEvent.keyDown(feld(1, 2), { key: 'Enter' })
    expect(ziel.querySelectorAll('[data-aw-liste="schritte"] > li')).toHaveLength(3)
  })

  it('Löschen sofort, Mindestzahl erklärt, Alt+Pfeil sortiert', () => {
    starte({ ...rechenweg(), schritte: [...rechenweg().schritte, { frage: 'Rabatt?', ergebnis: '5' }] })
    fireEvent.keyDown(feld(2, 0), { key: 'ArrowUp', altKey: true })
    expect((letzterBlock().schritte as Record<string, string>[]).map((s) => s.frage)).toEqual(['Netto?', 'Rabatt?', 'Brutto?'])
    fireEvent.click(ziel.querySelector('[aria-label="Schritt 3 löschen"]')!)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-rechenweg-schritt')
    fireEvent.click(ziel.querySelector('[aria-label="Schritt 2 löschen"]')!)
    expect(ziel.querySelector('[role="alert"]')?.textContent).toMatch(/Mindestens 2 Schritte nötig/)
  })

  it('Fehlende Pflichtfelder werden am Ort genannt', () => {
    starte({ ...rechenweg(), schritte: [{ frage: 'A', ergebnis: '' }, { frage: 'B', ergebnis: '2' }] })
    expect(ziel.textContent).toMatch(/Schritt 1: Ergebnis fehlt/)
  })

  it('Memory: bleibt bei den vorhandenen Feldnamen (pairs, a, b)', () => {
    starte({ type: 'memory_game', pairs: [{ a: 'CMR', b: 'Straße' }, { a: 'CIM', b: 'Schiene' }, { a: 'MÜ', b: 'Luft' }] })
    expect(feld(0, 0).value).toBe('CMR')
    eingabe(feld(0, 1), 'Straßenverkehr')
    vi.advanceTimersByTime(700)
    expect((letzterBlock().pairs as Record<string, string>[])[0]).toEqual({ a: 'CMR', b: 'Straßenverkehr' })
    fireEvent.click(ziel.querySelector('.wk-aw-neu')!)
    expect((letzterBlock().pairs as unknown[]).length).toBe(4)
    expect('cards' in letzterBlock()).toBe(false)
  })

  it('Kopfrechnen: Ergebnis als Zahl; Anweisung gibt es nicht', () => {
    starte({ type: 'arithmetic_quiz', questions: [{ question: '1+1', answer: 2 }] })
    eingabe(feld(0, 1), '3')
    vi.advanceTimersByTime(700)
    expect((letzterBlock().questions as Record<string, unknown>[])[0].answer).toBe(3)
  })

  it('Selbsteinschätzung: Aussagen als reine Texte öffnen sich als Einträge', () => {
    starte({ type: 'selbsteinschaetzung', items: ['Ich kann den CMR erklären.', { text: 'Ich kenne die ADSp.', help: 'Skript S. 4' }] })
    expect(feld(0, 0).value).toBe('Ich kann den CMR erklären.')
    expect(feld(1, 0).value).toBe('Ich kenne die ADSp.')
  })

  it('Rechenbeispiel: Zeilen für die Schritte, Formel und Ergebnis als Texte', () => {
    starte({ type: 'calculation_example', formula: 'A = a × b', steps: ['3 × 4', '= 12'], result: '12' })
    expect(ziel.querySelector<HTMLTextAreaElement>('[data-aw-fokus="formula"]')!.value).toBe('A = a × b')
    expect(Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="steps"] textarea')).map((t) => t.value)).toEqual(['3 × 4', '= 12'])
    // Schritte dürfen ganz fehlen
    fireEvent.click(ziel.querySelector('[aria-label="Schritt 1 löschen"]')!)
    fireEvent.click(ziel.querySelector('[aria-label="Schritt 1 löschen"]')!)
    expect(letzterBlock().steps).toEqual([])
  })
})

// ── Bauschritt 4: Unterlisten, Bedingungen, Listen-Felder ────────────

describe('Aufgabenwerk: Schnellfragen, Zusammenfassung, Tippkarten', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })
  const schnell = () => ({
    type: 'single_choice_set',
    questions: [
      { question: 'Wer stellt den Frachtbrief aus?', correct: 'Absender', wrong: ['Empfänger', 'Fahrer'] },
      { question: 'Was ist CMR?', correct: 'Abkommen', wrong: ['Gesetz', 'Fahrzeug'] },
    ],
  })

  it('Schnellfragen: Frage und richtige Antwort in der Zeile, falsche Antworten darunter', () => {
    starte(schnell(), { art: 'eintrag', nr: 1 })
    expect(ziel.querySelector<HTMLTextAreaElement>('[data-aw-fokus="ef-1-0"]')!.value).toBe('Was ist CMR?')
    expect(document.activeElement).toBe(ziel.querySelector('[data-aw-fokus="ef-1-0"]'))
    expect(Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="questions-0-wrong"] textarea')).map((t) => t.value)).toEqual(['Empfänger', 'Fahrer'])
  })

  it('Schnellfragen: falsche Antwort ändern/löschen wirkt auf die richtige Frage; Mindestzahl erklärt', () => {
    starte(schnell())
    eingabe(ziel.querySelector('[data-aw-liste="questions-1-wrong"] textarea')!, 'Vertrag')
    vi.advanceTimersByTime(700)
    const q = letzterBlock().questions as Record<string, unknown>[]
    expect(q[1].wrong).toEqual(['Vertrag', 'Fahrzeug'])
    expect(q[0].wrong).toEqual(['Empfänger', 'Fahrer'])
    fireEvent.click(ziel.querySelector('[data-aw-liste="questions-0-wrong"] [aria-label="Falsche Antwort 1 löschen"]')!)
    expect(ziel.textContent).toMatch(/Mindestens 2 Falsche Antworten nötig/)
  })

  it('Schnellfragen: neue Frage bringt zwei leere falsche Antworten mit; Enter im Ergebnis springt in die Liste', () => {
    starte(schnell())
    fireEvent.click(ziel.querySelector('.wk-aw-eintraege > .wk-aw-neu')!)
    expect((letzterBlock().questions as Record<string, unknown>[])[2].wrong).toEqual(['', ''])
    fireEvent.keyDown(ziel.querySelector('[data-aw-fokus="ef-0-1"]')!, { key: 'Enter' })
    expect(document.activeElement).toBe(ziel.querySelector('[data-aw-liste="questions-0-wrong"] textarea'))
  })

  it('Schnellfragen: Übernahme prüft die Unterliste', () => {
    const r = uebernimmAufgabe(schnell(), { ...schnell(), questions: [{ question: 'F', correct: 'R', wrong: ['a', 'b\u0007'], fremd: 'x' }] })
    expect(r.ok && r.block.questions).toEqual([{ question: 'F', correct: 'R', wrong: ['a', 'b'] }])
    expect(uebernimmAufgabe(schnell(), { ...schnell(), questions: [{ question: 'F', correct: 'R', wrong: 'x' }] }).ok).toBe(false)
    expect(hinweise({ type: 'single_choice_set', questions: [{ question: 'F', correct: 'R', wrong: ['a'] }] }).map((h) => h.text)).toContain('Frage 1: mindestens 2 falsche antworten nötig.')
  })

  it('Zusammenfassung: Fragen-Form und Aussagen-Form öffnen sich je nach Block', () => {
    starte({ type: 'summary', questions: [{ correct: 'Richtig', distractors: ['A', 'B'] }] })
    expect(ziel.querySelector('[data-aw-liste="questions"]')).not.toBeNull()
    expect(ziel.querySelector('[data-aw-liste="statements"]')).toBeNull()
    werk.ab()
    starte({ type: 'summary', statements: ['Eins', 'Zwei'] })
    expect(ziel.querySelector('[data-aw-liste="questions"]')).toBeNull()
    expect(Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('[data-aw-liste="statements"] textarea')).map((t) => t.value)).toEqual(['Eins', 'Zwei'])
    expect(eintragFuerBlock({ type: 'summary', statements: ['A', ' ', 'C'] }, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 2 })
  })

  it('Tippkarten: Antworten als Liste bleiben eine Liste', () => {
    starte({ type: 'flashcards', cards: [{ front: 'CMR?', back: ['CMR', 'CMR-Frachtbrief'] }, { front: 'HGB?', back: 'Handelsgesetzbuch' }] })
    const f = (i: number) => ziel.querySelector<HTMLTextAreaElement>(`[data-aw-fokus="ef-${i}-1"]`)!
    expect(f(0).value).toBe('CMR / CMR-Frachtbrief')
    eingabe(f(0), 'CMR / Frachtbrief / CIM')
    eingabe(f(1), 'HGB')
    vi.advanceTimersByTime(700)
    const c = letzterBlock().cards as Record<string, unknown>[]
    expect(c[0].back).toEqual(['CMR', 'Frachtbrief', 'CIM'])
    expect(c[1].back).toBe('HGB')
  })
})
