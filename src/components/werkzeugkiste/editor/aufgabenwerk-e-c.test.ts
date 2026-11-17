import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import {
  alsLuecke,
  entferneLuecke,
  hatHtmlReste,
  luecken,
  markWoerter,
  markierung,
  ohneHtmlReste,
  pruefeAuswahl,
  setzeZusammen,
  zerlege,
  type LueckenTyp,
} from './aufgabenwerk/luecken'
import { eintragFuerBlock, hinweise, uebernimmAufgabe, LOESCH_TEXTE } from './aufgabenwerk/bauplan'
import { TIPP_PAUSE_MS, starteAufgabe, type Aufgabenbearbeiter } from './aufgabenwerk/eintritt'
import { liesTextfeld, lueckenHtml, textStelle } from './aufgabenwerk/muster-e'
import { BAUPLAENE, type LueckenTeil } from './aufgabenwerk/bauplan'

/**
 * PROJ-114, Bauschritt 2: Muster E (Lückentexte ohne Sternchen) und Muster C (Paare).
 */

// ── Übersetzer ───────────────────────────────────────────────────────

const BEISPIELE: Array<[LueckenTyp, string]> = [
  ['fill_blanks', 'Der *Frachtführer/Frachtfuehrer* haftet nach *CMR*.'],
  ['fill_blanks', 'Ohne Lücke, aber mit 5 * 3 Sternchen.'],
  ['fill_blanks', '*a**b* und *  c  * am Rand\nzweite Zeile'],
  ['advanced_fill_blanks', 'Der *Spediteur* (Berufsbezeichnung) und *CMR*(Abkommen) sowie *Lager (Ort)* hier *X*'],
  ['advanced_fill_blanks', 'Nur *eins/zwei* \t (Tipp mit Tab)'],
  ['drag_words', 'Die *Gefährdungshaftung:§ 425 HGB* gilt, *Frachtbrief* auch.'],
  ['mark_words', 'Die *rote* Ampel und der *blauen Himmel* sind *'],
  ['mark_words', ''],
]

describe('Lückentext-Übersetzer', () => {
  it('Rundreise: zerlegen und zusammensetzen ergibt immer denselben Text', () => {
    for (const [typ, text] of BEISPIELE) expect(setzeZusammen(typ, zerlege(typ, text)), `${typ}: ${text}`).toBe(text)
  })

  it('liest Wort, weitere Schreibweisen und Tipp wie der Kern', () => {
    expect(luecken(zerlege('fill_blanks', BEISPIELE[0][1])).map((l) => [l.wort, l.varianten])).toEqual([
      ['Frachtführer', ['Frachtfuehrer']],
      ['CMR', []],
    ])
    expect(luecken(zerlege('advanced_fill_blanks', BEISPIELE[3][1])).map((l) => [l.wort, l.tipp])).toEqual([
      ['Spediteur', 'Berufsbezeichnung'],
      ['CMR', 'Abkommen'],
      ['Lager', 'Ort'],
      ['X', ''],
    ])
    expect(luecken(zerlege('drag_words', BEISPIELE[5][1])).map((l) => [l.wort, l.tipp])).toEqual([
      ['Gefährdungshaftung', '§ 425 HGB'],
      ['Frachtbrief', ''],
    ])
  })

  it('schreibt geänderte Lücken in der Schreibweise des Typs (ohne Steuerzeichen im Inhalt)', () => {
    expect(markierung('fill_blanks', { wort: 'CMR', varianten: ['C.M.R.', 'Frachtbrief/x'], tipp: '' })).toBe('*CMR/C.M.R./Frachtbriefx*')
    expect(markierung('advanced_fill_blanks', { wort: 'Spediteur', varianten: [], tipp: 'Beruf (kurz)' })).toBe('*Spediteur* (Beruf kurz)')
    expect(markierung('drag_words', { wort: 'Haftung:x', varianten: [], tipp: '§ 425' })).toBe('*Haftungx:§ 425*')
    expect(markierung('mark_words', { wort: 'ro*te', varianten: [], tipp: '' })).toBe('*rote*')
  })

  it('Auswahl: Satz- und Leerzeichen am Rand bleiben draußen; über Lücken und Zeilen geht es nicht', () => {
    const st = zerlege('fill_blanks', 'Der Frachtführer, haftet *CMR* nicht\nhier')
    const p = pruefeAuswahl('fill_blanks', st, 3, 18)
    expect(p).toMatchObject({ ok: true, stueck: 0, start: 4, ende: 16 })
    expect(pruefeAuswahl('fill_blanks', st, 20, 28)).toEqual({ ok: false, grund: 'Die Auswahl enthält schon eine Lücke.' })
    expect(pruefeAuswahl('fill_blanks', st, 27, 36)).toEqual({ ok: false, grund: 'Bitte nur innerhalb einer Zeile auswählen.' })
    expect(pruefeAuswahl('fill_blanks', st, 16, 18)).toEqual({ ok: false, grund: 'Bitte ein Wort auswählen.' })
    if (!p.ok) return
    const r = alsLuecke(st, p)
    expect(setzeZusammen('fill_blanks', r.stuecke)).toBe('Der *Frachtführer*, haftet *CMR* nicht\nhier')
    expect(r.index).toBe(0)
  })

  it('Wörter markieren nimmt immer ganze Wörter', () => {
    const st = zerlege('mark_words', 'Die Ladungssicherung ist wichtig.')
    const p = pruefeAuswahl('mark_words', st, 6, 10)
    expect(p.ok && setzeZusammen('mark_words', alsLuecke(st, p).stuecke)).toBe('Die *Ladungssicherung* ist wichtig.')
  })

  it('gleiches Wort mehrfach: nur die gewählte Stelle wird zur Lücke', () => {
    const st = zerlege('fill_blanks', 'CMR und CMR')
    const p = pruefeAuswahl('fill_blanks', st, 8, 11)
    expect(p.ok && setzeZusammen('fill_blanks', alsLuecke(st, p).stuecke)).toBe('CMR und *CMR*')
  })

  it('Lücke entfernen lässt das Wort als Text stehen', () => {
    const st = zerlege('drag_words', 'A *b:Tipp* c *d*')
    expect(setzeZusammen('drag_words', entferneLuecke(st, 0))).toBe('A b c *d*')
  })

  it('erkennt HTML-Reste und Wörter wie der Kern', () => {
    expect(hatHtmlReste('<p>Hallo</p><p>Welt</p>')).toBe(true)
    expect(ohneHtmlReste('<p>Hallo</p><p>Welt</p>')).toBe('Hallo\nWelt')
    expect(markWoerter('Die *rote* Ampel *und blau*')).toEqual([null, 0, null, 1])
  })
})

// ── Bauplan für E und C ──────────────────────────────────────────────

describe('Bauplan: Lückentexte und Paare', () => {
  it('Klick auf eine Lücke bzw. ein Wort wird auf die Lücke im Block umgerechnet', () => {
    const fb = { type: 'fill_blanks', text: 'Der *A* und *B*' }
    expect(eintragFuerBlock(fb, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 1 })
    expect(eintragFuerBlock(fb, { art: 'eintrag', nr: 1 }, 3)).toBeNull()
    const mw = { type: 'mark_words', text: 'Die *rote* Ampel' }
    expect(eintragFuerBlock(mw, { art: 'eintrag', nr: 1 }, 3)).toEqual({ art: 'eintrag', nr: 0 })
    // Ein Wort, das keine Lösung ist: Aufgabe öffnet ohne Eintrag
    expect(eintragFuerBlock(mw, { art: 'eintrag', nr: 2 }, 3)).toBeNull()
  })

  it('Begriffe zum Aufklappen: der Kern lässt unvollständige weg – die Nummer wird umgerechnet', () => {
    const acc = { type: 'accordion', items: [{ term: 'A', definition: 'a' }, { term: 'B', definition: ' ' }, { term: 'C', definition: 'c' }] }
    expect(eintragFuerBlock(acc, { art: 'eintrag', nr: 1 }, 2)).toEqual({ art: 'eintrag', nr: 2 })
    expect(eintragFuerBlock(acc, { art: 'eintrag', nr: 1 }, 3)).toBeNull()
  })

  it('übernimmt Paare und Lückentext; leere Arbeitsanweisung fällt weg', () => {
    const orig = { type: 'crossword', description: 'Alt', words: [{ word: 'CMR', clue: 'x', extra: 1 }], fremd: true }
    const r = uebernimmAufgabe(orig, { type: 'crossword', description: '  ', words: [{ word: 'CMR', clue: 'Abkommen', extra: 2, neu: 'x' }, { word: 'HGB', clue: 'Gesetz' }] })
    expect(r.ok && r.block).toEqual({ type: 'crossword', fremd: true, words: [{ word: 'CMR', clue: 'Abkommen', extra: 2 }, { word: 'HGB', clue: 'Gesetz' }] })
    const l = uebernimmAufgabe({ type: 'mark_words', text: 'a' }, { type: 'mark_words', text: 'Die *rote* Ampel' })
    expect(l.ok && l.block.text).toBe('Die *rote* Ampel')
    expect(uebernimmAufgabe({ type: 'mark_words', text: 'a' }, { type: 'mark_words', text: 'x'.repeat(20_001) }).ok).toBe(false)
  })

  it('Hinweise: keine Lücken, einzelnes Sternchen, HTML-Reste', () => {
    expect(hinweise({ type: 'fill_blanks', text: 'Ohne Lücke' }).map((h) => h.text)).toEqual(['Noch keine Lücken: Wort auswählen und „Als Lücke“ klicken.'])
    expect(hinweise({ type: 'mark_words', text: '<p>Die *rote* * Ampel</p>' }).map((h) => h.wo)).toEqual(['text-stern', 'text-html'])
  })

  it('kennt Lösch-Texte für alle Listen', () => {
    expect(LOESCH_TEXTE).toMatchObject({ 'loeschen-antwort': 'Antwort gelöscht', 'loeschen-begriff': 'Begriff gelöscht', 'loeschen-karte': 'Karte gelöscht', 'loeschen-wort': 'Wort gelöscht' })
  })
})

// ── Textfeld lesen und Stellen zählen ────────────────────────────────

describe('Muster E: Textfeld', () => {
  const teil = BAUPLAENE.fill_blanks.teile[1] as LueckenTeil
  it('schreibt Lücken als nicht editierbare Marken und liest sie unverändert zurück', () => {
    const st = zerlege('fill_blanks', 'A <b> *x/y* c\nd')
    const el = document.createElement('div')
    el.innerHTML = lueckenHtml(teil, st)
    expect(el.querySelector('[data-luecke="0"]')?.getAttribute('contenteditable')).toBe('false')
    expect(el.querySelector('b')).toBeNull()
    expect(setzeZusammen('fill_blanks', liesTextfeld(el, st))).toBe('A <b> *x/y* c\nd')
    // Getippt: Text vor der Lücke geändert, Browser-Absatz dazu
    el.firstChild!.textContent = 'Neu '
    const div = document.createElement('div')
    div.textContent = 'Zeile'
    el.appendChild(div)
    expect(setzeZusammen('fill_blanks', liesTextfeld(el, st))).toBe('Neu *x/y* c\nd\nZeile')
  })

  it('zählt Stellen im Klartext (Lücken zählen nicht, Umbrüche einmal)', () => {
    const el = document.createElement('div')
    el.innerHTML = lueckenHtml(teil, zerlege('fill_blanks', 'Ab *x* cd'))
    const text2 = el.childNodes[2] as Text
    expect(textStelle(el, el.firstChild!, 1)).toBe(1)
    expect(textStelle(el, text2, 2)).toBe(5)
    expect(textStelle(el, el, 2)).toBe(3)
  })
})

// ── Werk: Muster E ───────────────────────────────────────────────────

let ziel: HTMLElement
let gemeldet: Record<string, unknown>[]
let werk: Aufgabenbearbeiter

function starte(block: Record<string, unknown>, eintrag: Parameters<typeof starteAufgabe>[0]['eintrag'] = null) {
  document.body.innerHTML = '<section class="inhalt" data-wk="k0-e2"><p class="frage">Alt</p></section>'
  ziel = document.querySelector('section')!
  gemeldet = []
  werk = starteAufgabe({ ziel, block: block as never, marke: 'k0-e2', typName: 'Typ', eintrag, melde: (n) => gemeldet.push(n) })
  return werk
}
const aenderungen = () => gemeldet.filter((n) => n.wkAufgabeAenderung)
const letzterBlock = () => aenderungen().at(-1)!.block as Record<string, unknown>
const feld = () => ziel.querySelector<HTMLElement>('.wk-aw-lt')!
const marken = () => Array.from(feld().querySelectorAll('[data-luecke]')).map((m) => m.textContent)

function waehle(knoten: Node, von: number, bis: number, knotenBis: Node = knoten) {
  const r = document.createRange()
  r.setStart(knoten, von)
  r.setEnd(knotenBis, bis)
  const sel = getSelection()!
  sel.removeAllRanges()
  sel.addRange(r)
  document.dispatchEvent(new Event('selectionchange'))
}

describe('Aufgabenwerk: Muster E (Lückentexte)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('zeigt Arbeitsanweisung (Standard als Platzhalter) und den Text mit grünen Lücken, ohne Sternchen', () => {
    starte({ type: 'fill_blanks', text: 'Der *Frachtführer/Frachtfuehrer* haftet.' })
    const anw = ziel.querySelector<HTMLTextAreaElement>('textarea.frage')!
    expect(anw.value).toBe('')
    expect(anw.placeholder).toBe('Ergänze die fehlenden Wörter.')
    expect(marken()).toEqual(['Frachtführer'])
    expect(feld().textContent).not.toContain('*')
    expect(feld().getAttribute('contenteditable')).toBe('true')
  })

  it('Wort auswählen → „Als Lücke“ macht eine Lücke; gemeldet wird die Sternchen-Schreibweise', () => {
    starte({ type: 'fill_blanks', text: 'Der Spediteur haftet.' })
    waehle(feld().firstChild!, 3, 14)
    const knopf = ziel.querySelector<HTMLButtonElement>('.wk-aw-schwebe button')!
    expect(knopf.textContent).toBe('Als Lücke')
    expect(knopf.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(knopf)
    expect(aenderungen().at(-1)).toMatchObject({ gruppe: 'luecke-neu' })
    expect(letzterBlock().text).toBe('Der *Spediteur* haftet.')
    expect(marken()).toEqual(['Spediteur'])
  })

  it('Auswahl über eine Lücke: Knopf gesperrt, mit Grund', () => {
    starte({ type: 'fill_blanks', text: 'Der *Spediteur* haftet.' })
    waehle(feld().firstChild!, 0, 3, feld().lastChild!)
    const knopf = ziel.querySelector<HTMLButtonElement>('.wk-aw-schwebe button')!
    expect(knopf.getAttribute('aria-disabled')).toBe('true')
    expect(ziel.querySelector('.wk-aw-schwebe-grund')?.textContent).toBe('Die Auswahl enthält schon eine Lücke.')
    fireEvent.click(knopf)
    expect(aenderungen()).toHaveLength(0)
  })

  it('Enter macht aus der Auswahl eine Lücke', () => {
    starte({ type: 'mark_words', text: 'Die rote Ampel.' })
    waehle(feld().firstChild!, 4, 8)
    fireEvent.keyDown(feld(), { key: 'Enter' })
    expect(letzterBlock().text).toBe('Die *rote* Ampel.')
  })

  it('Tippen im Text: gemeldet nach der Pause, Lücken bleiben unverändert', () => {
    starte({ type: 'advanced_fill_blanks', text: 'Der *Spediteur*(Beruf) haftet.' })
    feld().lastChild!.textContent = ' haftet immer.'
    fireEvent.input(feld())
    expect(aenderungen()).toHaveLength(0)
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect(letzterBlock().text).toBe('Der *Spediteur*(Beruf) haftet immer.')
    expect(aenderungen().at(-1)!.gruppe).toBe('luecken-text')
  })

  it('Klick auf eine Lücke öffnet das Fenster: Wort, weitere Schreibweisen; Entfernen lässt das Wort stehen', () => {
    starte({ type: 'fill_blanks', text: 'Der *CMR/C.M.R.* gilt.' })
    fireEvent.click(feld().querySelector('[data-luecke="0"]')!)
    const fenster = ziel.querySelector('[role="dialog"]')!
    expect(fenster.getAttribute('aria-label')).toBe('Lücke 1')
    const [wort, varianten] = Array.from(fenster.querySelectorAll<HTMLInputElement>('input'))
    expect(document.activeElement).toBe(wort)
    expect(varianten.value).toBe('C.M.R.')
    expect(fenster.textContent).not.toContain('Tipp')
    wort.value = 'CMR-Abkommen'
    fireEvent.input(wort)
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect(letzterBlock().text).toBe('Der *CMR-Abkommen/C.M.R.* gilt.')
    expect(marken()).toEqual(['CMR-Abkommen'])
    fireEvent.click(Array.from(ziel.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((b) => b.textContent === 'Lücke entfernen')!)
    expect(letzterBlock().text).toBe('Der CMR-Abkommen gilt.')
    expect(ziel.querySelector('[role="dialog"]')).toBeNull()
  })

  it('leeres Wort im Fenster wird nicht übernommen, sondern erklärt', () => {
    starte({ type: 'drag_words', text: 'A *b:Tipp* c' })
    fireEvent.click(feld().querySelector('[data-luecke="0"]')!)
    const [wort, tipp] = Array.from(ziel.querySelectorAll<HTMLInputElement>('[role="dialog"] input'))
    expect(tipp.value).toBe('Tipp')
    wort.value = ' '
    fireEvent.input(wort)
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect(aenderungen()).toHaveLength(0)
    expect(ziel.querySelector('[role="dialog"] [role="alert"]')?.textContent).toMatch(/darf nicht leer sein/)
  })

  it('Esc im Fenster schließt nur das Fenster, nicht die Aufgabe', () => {
    starte({ type: 'fill_blanks', text: 'A *b* c' })
    fireEvent.click(feld().querySelector('[data-luecke="0"]')!)
    fireEvent.keyDown(ziel.querySelector('[role="dialog"] input')!, { key: 'Escape' })
    expect(ziel.querySelector('[role="dialog"]')).toBeNull()
    expect(werk.fertig).toBe(false)
  })

  it('angeklickte Lücke öffnet direkt ihr Fenster', () => {
    starte({ type: 'fill_blanks', text: 'A *b* c *d*' }, { art: 'eintrag', nr: 1 })
    expect(ziel.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Lücke 2')
  })

  it('Wörter ziehen: die Wörter zum Ziehen entstehen von selbst', () => {
    starte({ type: 'drag_words', text: 'A *Frachtbrief:Papier* und *CMR*' })
    expect(Array.from(ziel.querySelectorAll('.wk-aw-vorrat .chip')).map((c) => c.textContent)).toEqual(['Frachtbrief', 'CMR'])
  })

  it('HTML-Reste: Hinweis mit „Entfernen“', () => {
    starte({ type: 'fill_blanks', text: '<p>Der *A*</p><p>B</p>' })
    const knopf = Array.from(ziel.querySelectorAll<HTMLButtonElement>('.wk-aw-hinweis button')).find((b) => b.textContent === 'Entfernen')!
    fireEvent.click(knopf)
    expect(letzterBlock().text).toBe('Der *A*\nB')
    expect(feld().textContent).not.toContain('<p>')
  })

  it('neuer Stand von der App schreibt den Text neu', () => {
    starte({ type: 'fill_blanks', text: 'A *b* c' })
    werk.setze({ type: 'fill_blanks', text: 'X *y* *z*' } as never)
    expect(marken()).toEqual(['y', 'z'])
  })

  it('beim Öffnen wird nichts verändert, auch bei ungewöhnlicher Schreibweise', () => {
    starte({ type: 'advanced_fill_blanks', text: '5 * 3 = *15*(Ergebnis)' })
    fireEvent.click(ziel.querySelector('.wk-aw-fertig')!)
    expect(aenderungen()).toHaveLength(0)
    expect(ziel.innerHTML).toContain('Alt')
  })
})

// ── Werk: Muster C ───────────────────────────────────────────────────

const acc = () => ({
  type: 'accordion',
  items: [
    { term: 'Stückgut', definition: 'Einzeln verladen' },
    { term: 'Schüttgut', definition: '' },
  ],
})

describe('Aufgabenwerk: Muster C (Paare)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    werk?.ab()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })
  const begriffe = () => Array.from(ziel.querySelectorAll<HTMLInputElement>('.wk-aw-k-begriff'))
  const erklaerung = () => ziel.querySelector<HTMLTextAreaElement>('.wk-aw-k-text textarea')

  it('lang: Aufklapp-Leiste wie in der Schülersicht; nur der Eintrag mit Fokus ist offen, fehlende Erklärung orange', () => {
    starte(acc())
    expect(begriffe().map((b) => b.value)).toEqual(['Stückgut', 'Schüttgut'])
    expect(document.activeElement).toBe(begriffe()[0])
    expect(ziel.querySelectorAll('.wk-aw-k-text')).toHaveLength(1)
    expect(erklaerung()!.value).toBe('Einzeln verladen')
    const fehlt = ziel.querySelectorAll('.wk-aw-k-fehlt')
    expect(fehlt).toHaveLength(1)
    expect(fehlt[0].textContent).toContain('Erklärung fehlt')
  })

  it('angeklickter Eintrag ist aufgeklappt, Fokus in der Erklärung; nur einer offen', () => {
    starte(acc(), { art: 'eintrag', nr: 0 })
    expect(document.activeElement).toBe(erklaerung())
    expect(erklaerung()!.value).toBe('Einzeln verladen')
    fireEvent.focus(begriffe()[1])
    expect(ziel.querySelectorAll('.wk-aw-k-text')).toHaveLength(1)
    expect(erklaerung()!.value).toBe('')
  })

  it('Enter im Begriff springt in die Erklärung, Enter in der Erklärung zum nächsten bzw. neuen Begriff', () => {
    starte(acc())
    fireEvent.keyDown(begriffe()[1], { key: 'Enter' })
    expect(document.activeElement).toBe(erklaerung())
    erklaerung()!.value = 'Lose verladen'
    fireEvent.input(erklaerung()!)
    fireEvent.keyDown(erklaerung()!, { key: 'Enter' })
    expect(begriffe()).toHaveLength(3)
    expect(document.activeElement).toBe(begriffe()[2])
    expect((letzterBlock().items as Record<string, string>[])[1].definition).toBe('Lose verladen')
  })

  it('Löschen sofort (Gruppe für den Toast); Mindestzahl erklärt', () => {
    starte(acc())
    fireEvent.click(ziel.querySelector('[aria-label="Begriff 2 löschen"]')!)
    expect(aenderungen().at(-1)!.gruppe).toBe('loeschen-begriff')
    fireEvent.click(ziel.querySelector('[aria-label="Begriff 1 löschen"]')!)
    expect(begriffe()).toHaveLength(1)
    expect(ziel.querySelector('[role="alert"]')?.textContent).toMatch(/Mindestens 1 Begriff nötig/)
  })

  it('Einfügen einer Liste ergibt mehrere Begriffe; Alt+Pfeil sortiert', () => {
    starte(acc())
    fireEvent.click(ziel.querySelector('.wk-aw-neu')!)
    fireEvent.paste(begriffe()[2], { clipboardData: { getData: () => '- Gefahrgut\n- Kühlgut' } })
    expect(begriffe().map((b) => b.value)).toEqual(['Stückgut', 'Schüttgut', 'Gefahrgut', 'Kühlgut'])
    fireEvent.keyDown(begriffe()[3], { key: 'ArrowUp', altKey: true })
    expect(begriffe().map((b) => b.value)).toEqual(['Stückgut', 'Schüttgut', 'Kühlgut', 'Gefahrgut'])
  })

  it('Karten: Überschrift als Zeile, Vorder- und Rückseite', () => {
    starte({ type: 'dialog_cards', cards: [{ front: 'CMR', back: 'Abkommen' }] }, { art: 'eintrag', nr: 0 })
    expect(ziel.querySelector<HTMLTextAreaElement>('textarea.frage')!.placeholder).toBe('Überschrift (optional)')
    expect(erklaerung()!.value).toBe('Abkommen')
  })

  it('kurz (Kreuzworträtsel): beide Teile nebeneinander in einer Zeile', () => {
    starte({ type: 'crossword', words: [{ word: 'CMR', clue: 'Abkommen' }, { word: 'HGB', clue: 'Gesetz' }] })
    const zeile = ziel.querySelector('.wk-aw-paar')!
    expect(Array.from(zeile.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.wk-aw-paar-felder .wk-aw-feld')).map((f) => f.value)).toEqual(['CMR', 'Abkommen'])
    expect(ziel.querySelector<HTMLTextAreaElement>('textarea.frage')!.placeholder).toBe('Kreuzworträtsel')
  })
})
