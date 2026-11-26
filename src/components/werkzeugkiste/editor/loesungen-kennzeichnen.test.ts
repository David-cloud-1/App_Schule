// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { mitSprungSkript } from './vorschau-skript'
import { LOESUNG_TYPEN } from './loesungen-kennzeichnen'

/**
 * PROJ-116: Vertrag mit dem Kern.
 *
 * Die Seite unter `__fixtures__/kern-loesungsseite.html` hat der Kern (Werkzeugkiste, `seite.baue_seite(..., marken=True)`)
 * gebaut. Sie läuft hier mit ihrem eigenen Skript (Vorrat mischen, Lücken bauen …) und dem Hilfsskript der Vorschau.
 * Neu erzeugen: `python3 scripts/werkzeugkiste/kern-loesungsseite-bauen.py <Ziel.html> <Ordner des Kerns>`.
 * Ändert der Kern die Form seines Lösungsblocks oder seiner Elemente, schlägt dieser Test fehl,
 * statt dass die Vorschau still etwas Falsches kennzeichnet.
 */

const SEITE = readFileSync(join(__dirname, '__fixtures__/kern-loesungsseite.html'), 'utf8')
const HILFSSKRIPT = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]

function lade(modus: 'bearbeiten' | 'ausprobieren' = 'bearbeiten') {
  const dom = new JSDOM(SEITE, { runScripts: 'dangerously', url: 'https://seite.test/', pretendToBeVisual: true })
  const w = dom.window as unknown as Window & { eval: (s: string) => unknown; MessageEvent: typeof MessageEvent }
  w.eval(HILFSSKRIPT)
  const sende = (daten: unknown) => w.dispatchEvent(new w.MessageEvent('message', { data: daten, source: w as unknown as MessageEventSource }))
  sende({ wkZustand: { modus, lesen: false, mobil: false, schublade: false, leer: [], aufgaben: {} } })
  return { w, d: w.document, sende }
}

/** Aufgabe Nr. n der Beispielseite (Reihenfolge siehe Fixture) */
const sec = (d: Document, nr: number) => d.querySelector<HTMLElement>(`section.aufgabe[data-nr="${nr}"]`)!
const text = (e: Element) => (e.textContent ?? '').trim()

describe('Lösungen in „Bearbeiten“ (Vertrag mit dem Kern)', () => {
  it('die Beispielseite hat alle Aufgaben und den Lösungsblock', () => {
    const { d } = lade()
    expect(d.querySelectorAll('section.aufgabe').length).toBe(12)
    expect(LOESUNG_TYPEN.length).toBeGreaterThan(10)
  })

  it('Einfachauswahl: nur die richtige Antwort trägt das Kennzeichen', () => {
    const { d } = lade()
    const antworten = [...sec(d, 1).querySelectorAll('.antwort')]
    expect(antworten.map((a) => a.classList.contains('wk-lk-ok'))).toEqual([false, true, false])
    expect(text(antworten[1])).toBe('Frachtführer')
    expect(antworten[1].getAttribute('title')).toBe('Lösung')
  })

  it('Richtig/Falsch: „Wahr“ bzw. „Falsch“ je nach Lösung', () => {
    const { d } = lade()
    const [wahr3, falsch3] = [...sec(d, 3).querySelectorAll('.antwort')]
    expect(text(wahr3)).toBe('Wahr')
    expect(wahr3.classList.contains('wk-lk-ok')).toBe(true)
    expect(falsch3.classList.contains('wk-lk-ok')).toBe(false)
    const [wahr4, falsch4] = [...sec(d, 4).querySelectorAll('.antwort')]
    expect(wahr4.classList.contains('wk-lk-ok')).toBe(false)
    expect(falsch4.classList.contains('wk-lk-ok')).toBe(true)
  })

  it('Lückentext: das Feld zeigt sein Wort, bei Varianten die erste plus „…“', () => {
    const { d } = lade()
    const felder = [...sec(d, 5).querySelectorAll<HTMLInputElement>('input.luecke')]
    expect(felder.map((f) => f.placeholder)).toEqual(['Frachtführer …', 'Schäden'])
    expect(felder[0].title).toBe('Lösung: Frachtführer / Carrier')
    expect([...sec(d, 6).querySelectorAll<HTMLInputElement>('input.luecke')].map((f) => f.placeholder)).toEqual(['Spediteur', 'Lager'])
  })

  it('Wörter ziehen: Lücken zeigen ihr Wort, Zusatzwörter sind als „passt nirgends“ gekennzeichnet', () => {
    const { d } = lade()
    const s = sec(d, 7)
    expect([...s.querySelectorAll('button.luecke')].map((g) => g.getAttribute('data-wk-loes'))).toEqual(['Ware', 'Lager'])
    const chips = [...s.querySelectorAll('.vorrat .chip')]
    const zusatz = chips.filter((c) => c.classList.contains('wk-lk-zusatz')).map(text)
    expect(zusatz.sort()).toEqual(['Auto', 'Haus'])
    expect(chips.length).toBe(4)
  })

  it('Wörter markieren: genau die Lösungswörter', () => {
    const { d } = lade()
    const markiert = [...sec(d, 8).querySelectorAll('.wort.wk-lk-wort')].map(text)
    expect(markiert).toEqual(['rote', 'blauen'])
  })

  it('Reihenfolge: jedes Kärtchen trägt seine richtige Position', () => {
    const { d } = lade()
    const chips = [...sec(d, 9).querySelectorAll('.vorrat .chip')]
    const nachPosition = Object.fromEntries(chips.map((c) => [text(c), c.getAttribute('data-wk-pos')]))
    expect(nachPosition).toEqual({ Auftrag: '1', Abholung: '2', Zustellung: '3' })
  })

  it('Zuordnen: jeder Begriff trägt den Namen seiner Kategorie', () => {
    const { d } = lade()
    const chips = [...sec(d, 10).querySelectorAll('.vorrat .chip')]
    const kat = Object.fromEntries(chips.map((c) => [text(c), c.getAttribute('data-wk-kat')]))
    expect(kat).toEqual({ Regal: 'Lager', LKW: 'Transport', Palette: 'Lager' })
  })

  it('Frageserie: die richtige Antwort jeder Teilfrage (die Seite mischt, gefunden wird sie über ihren Text)', () => {
    const { d } = lade()
    const ok = [...sec(d, 11).querySelectorAll('.antwort.wk-lk-ok')].map(text)
    expect(ok).toEqual(['richtig1'])
  })

  it('Kapitelquiz: Auswahl, Richtig/Falsch und Lücken je Frage', () => {
    const { d } = lade()
    const s = sec(d, 12)
    const [q0, q1, q2] = [...s.querySelectorAll('.quizfrage')]
    expect([...q0.querySelectorAll('.antwort')].map((a) => a.classList.contains('wk-lk-ok'))).toEqual([false, true])
    // Richtig/Falsch mit Lösung „falsch“ (data-i 0)
    expect(text(q1.querySelector('.antwort.wk-lk-ok')!)).toBe('Falsch')
    expect((q2.querySelector('input.luecke') as HTMLInputElement).placeholder).toBe('Wort')
  })

  it('Ausprobieren: nichts bleibt zurück, auch nicht nach Hin- und Herwechseln', () => {
    const { d, sende } = lade()
    const vorher = d.body.innerHTML
    expect(d.querySelectorAll('.wk-lk').length).toBeGreaterThan(15)
    sende({ wkZustand: { modus: 'ausprobieren', lesen: false, mobil: false, schublade: false, leer: [], aufgaben: {} } })
    expect(d.querySelectorAll('.wk-lk').length).toBe(0)
    expect(d.querySelectorAll('[data-wk-pos],[data-wk-kat],[data-wk-loes]').length).toBe(0)
    expect([...d.querySelectorAll<HTMLInputElement>('input.luecke')].every((f) => f.placeholder === '')).toBe(true)
    expect([...d.querySelectorAll('[title="Lösung"]')].length).toBe(0)
    sende({ wkZustand: { modus: 'bearbeiten', lesen: false, mobil: false, schublade: false, leer: [], aufgaben: {} } })
    expect(d.body.innerHTML).toBe(vorher)
  })

  it('startet die Seite gleich in „Ausprobieren“, gibt es kein Kennzeichen', () => {
    const { d } = lade('ausprobieren')
    expect(d.querySelectorAll('.wk-lk').length).toBe(0)
  })

  it('die Kennzeichen ändern keinen Text der Aufgaben', () => {
    const { d, sende } = lade()
    const mit = [...d.querySelectorAll('section.aufgabe')].map(text)
    sende({ wkZustand: { modus: 'ausprobieren', lesen: false, mobil: false, schublade: false, leer: [], aufgaben: {} } })
    const ohne = [...d.querySelectorAll('section.aufgabe')].map(text)
    expect(mit).toEqual(ohne)
  })

  it('ohne Lösungsblock (fremde oder alte Seite) passiert nichts und nichts geht kaputt', () => {
    const dom = new JSDOM('<body><section class="aufgabe" data-typ="multiple_choice" data-nr="1"><button class="antwort" data-i="0">A</button></section></body>', {
      runScripts: 'dangerously',
      url: 'https://seite.test/',
    })
    const w = dom.window as unknown as Window & { eval: (s: string) => unknown; MessageEvent: typeof MessageEvent }
    w.eval(HILFSSKRIPT)
    w.dispatchEvent(new w.MessageEvent('message', { data: { wkZustand: { modus: 'bearbeiten' } }, source: w as unknown as MessageEventSource }))
    expect(w.document.querySelectorAll('.wk-lk').length).toBe(0)
  })
})

describe('Lösungen: nie nach außen', () => {
  it('die gebaute Seite des Kerns enthält weder das Hilfsskript noch ein Kennzeichen', () => {
    expect(SEITE).not.toContain('wk-lk')
    expect(SEITE).not.toContain('lkZeichne')
  })

  it('Kennzeichen entstehen nur durch das Hilfsskript der Vorschau', () => {
    expect(HILFSSKRIPT).toContain('lkZeichne')
    expect(HILFSSKRIPT).toContain('modus!=="bearbeiten"')
  })
})
