import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { AUFGABENWERK_CODE, AUFGABENWERK_STAND } from './aufgabenwerk/aufgabenwerk-bundle.generated'
import { AW_FARBEN } from './aufgabenwerk/design'
import { TIPP_PAUSE_MS, starteAufgabe, zeilenAusEinfuegen, type Aufgabenbearbeiter } from './aufgabenwerk/eintritt'
import { AUFGABENWERK_TYPEN, BAUPLAENE, eintragFuerBlock, hinweise, liesEintrag, uebernimmAufgabe } from './aufgabenwerk/bauplan'
import { liesWunsch } from './vorschau-nachrichten'
import { mitSprungSkript } from './vorschau-skript'

/**
 * Aufgabenwerk (PROJ-114, Bauschritt 1): Aufgaben an Ort und Stelle bearbeiten – Muster A
 * (Einfach-/Mehrfachauswahl, Richtig/Falsch). Getestet werden Bauplan, Werk (im Testfenster),
 * Nachrichten und das Seiten-Skript.
 */

const wurzel = path.resolve(__dirname, '../../../..')
const QUELLEN = [
  'src/components/werkzeugkiste/editor/aufgabenwerk/eintritt.ts',
  'src/components/werkzeugkiste/editor/aufgabenwerk/design.ts',
  'src/components/werkzeugkiste/editor/aufgabenwerk/bauplan.ts',
]

describe('Aufgabenwerk: gebautes Bündel', () => {
  it('passt zu den Quellen (sonst: npm run aufgabenwerk:bauen)', () => {
    const h = createHash('sha256')
    for (const q of QUELLEN) h.update(q).update(readFileSync(path.join(wurzel, q)))
    expect(AUFGABENWERK_STAND).toBe(h.digest('hex').slice(0, 16))
  })

  it('bleibt klein und lädt nichts von außen', () => {
    expect(AUFGABENWERK_CODE.length).toBeLessThan(120_000)
    expect(AUFGABENWERK_CODE).not.toMatch(/import\(["']https?:|<script\s+src=/i)
  })

  it('meldet sich im Fenster an', () => {
    window.__wkAufgabenwerk = undefined
    new Function(AUFGABENWERK_CODE)()
    expect(typeof (window as Window).__wkAufgabenwerk?.starte).toBe('function')
  })
})

// ── Kontrast ──────────────────────────────────────────────────────────

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const kontrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

describe('Aufgabenwerk: Farben', () => {
  it('Text erreicht 4,5 : 1 auf seinen Gründen', () => {
    const F = AW_FARBEN
    for (const [t, g] of [
      [F.blauText, F.grund],
      [F.blauText, F.feldGrund],
      [F.schildText, F.blau],
      [F.orange, F.orangeGrund],
      [F.rot, F.grund],
      [F.leise, F.grund],
      [F.gruen, F.grund],
    ]) {
      expect(kontrast(t, g), `${t} auf ${g}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

// ── Bauplan ───────────────────────────────────────────────────────────

const mc = () => ({
  type: 'multiple_choice',
  question: 'Wer haftet?',
  extra: 'bleibt',
  answers: [
    { text: 'Frachtführer', correct: true, feedback: 'Genau', quelle: 'S. 3' },
    { text: 'Absender', correct: false, feedback: '' },
    { text: 'Empfänger', correct: false, feedback: '' },
  ],
})

describe('Bauplan', () => {
  it('kennt in Bauschritt 1 genau Auswahl und Richtig/Falsch', () => {
    expect([...AUFGABENWERK_TYPEN].sort()).toEqual(['multiple_choice', 'single_choice', 'true_false'])
    for (const t of AUFGABENWERK_TYPEN) expect(BAUPLAENE[t].muster).toBe('A')
  })

  it('übernimmt nur Bauplan-Felder; unbekannte Felder kommen aus dem Original', () => {
    const r = uebernimmAufgabe(mc(), { ...mc(), question: 'Neu\u0007', extra: 'GEÄNDERT', boese: '<script>' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.block.question).toBe('Neu')
    expect(r.block.extra).toBe('bleibt')
    expect(r.block).not.toHaveProperty('boese')
  })

  it('behält bekannte Zusatzfelder der Antworten, nimmt aber keine neuen an', () => {
    const v = mc()
    v.answers[1] = { ...v.answers[1], quelle: 'S. 4', fremd: 'x' } as never
    const r = uebernimmAufgabe(mc(), v)
    expect(r.ok && (r.block.answers as Record<string, unknown>[])[1]).toEqual({ text: 'Absender', correct: false, feedback: '', quelle: 'S. 4' })
  })

  it('lehnt falschen Typ, zu viele Antworten und zu lange Texte ab', () => {
    expect(uebernimmAufgabe(mc(), { ...mc(), type: 'true_false' }).ok).toBe(false)
    expect(uebernimmAufgabe(mc(), { ...mc(), answers: Array.from({ length: 11 }, () => ({ text: 'a' })) }).ok).toBe(false)
    expect(uebernimmAufgabe(mc(), { ...mc(), question: 'x'.repeat(6000) }).ok).toBe(false)
    expect(uebernimmAufgabe({ type: 'accordion' }, { type: 'accordion' }).ok).toBe(false)
  })

  it('Richtig/Falsch: Wahrheitswert Pflicht, leere Rückmeldung fällt weg', () => {
    const tf = { type: 'true_false', question: 'A', correct: true, feedback_correct: 'gut', feedback_wrong: 'x' }
    const r = uebernimmAufgabe(tf, { ...tf, correct: false, feedback_wrong: '' })
    expect(r.ok && r.block).toEqual({ type: 'true_false', question: 'A', correct: false, feedback_correct: 'gut' })
    expect(uebernimmAufgabe(tf, { ...tf, correct: 'ja' }).ok).toBe(false)
  })

  it('öffnet einen Eintrag nur, wenn die gezählte Anzahl zum Block passt', () => {
    expect(eintragFuerBlock(mc(), { art: 'antwort', nr: 2 }, 3)).toEqual({ art: 'antwort', nr: 2 })
    expect(eintragFuerBlock(mc(), { art: 'antwort', nr: 2 }, 4)).toBeNull()
    expect(eintragFuerBlock(mc(), { art: 'antwort', nr: 5 }, 3)).toBeNull()
    expect(eintragFuerBlock(mc(), { art: 'frage' }, null)).toEqual({ art: 'frage' })
    expect(eintragFuerBlock({ type: 'true_false' }, { art: 'antwort', nr: 1 }, 2)).toEqual({ art: 'antwort', nr: 1 })
    expect(eintragFuerBlock({ type: 'accordion' }, { art: 'frage' }, null)).toBeNull()
    expect(liesEintrag({ art: 'antwort', nr: -1 })).toBeNull()
    expect(liesEintrag({ art: 'x' })).toBeNull()
  })

  it('nennt fehlende Frage und fehlende richtige Antwort am Ort', () => {
    const b = { ...mc(), question: ' ', answers: mc().answers.map((a) => ({ ...a, correct: false })) }
    expect(hinweise(b).map((h) => h.text)).toEqual(['Frage fehlt.', 'Klick auf den Kreis vor der richtigen Antwort.'])
  })

  it('macht aus eingefügten Listen einzelne Zeilen ohne Aufzählungszeichen', () => {
    expect(zeilenAusEinfuegen('• Eins\n2) Zwei\n\n- Drei\n  a. Vier')).toEqual(['Eins', 'Zwei', 'Drei', 'Vier'])
  })
})

// ── Werk im Testfenster ──────────────────────────────────────────────

let ziel: HTMLElement
let gemeldet: Record<string, unknown>[]
let werk: Aufgabenbearbeiter

function starte(block: Record<string, unknown> = mc(), eintrag: Parameters<typeof starteAufgabe>[0]['eintrag'] = null) {
  document.body.innerHTML =
    '<section class="aufgabe" data-typ="multiple_choice" data-wk="k0-e1"><div class="kopfzeile"><span class="marke">Aufgabe 2</span></div>' +
    '<p class="frage">Wer haftet?</p><div class="antworten"><button class="antwort">Frachtführer</button></div><div class="rueckmeldung"></div></section>'
  ziel = document.querySelector('section')!
  gemeldet = []
  werk = starteAufgabe({ ziel, block: block as never, marke: 'k0-e1', typName: 'Einfachauswahl', eintrag, melde: (n) => gemeldet.push(n) })
  return werk
}
const felder = () => Array.from(ziel.querySelectorAll<HTMLTextAreaElement>('textarea.antwort'))
const kreise = () => Array.from(ziel.querySelectorAll<HTMLButtonElement>('.wk-aw-kreis'))
const aenderungen = () => gemeldet.filter((n) => n.wkAufgabeAenderung)
const letzterBlock = () => aenderungen().at(-1)!.block as Record<string, unknown>
const knopf = (label: string) => ziel.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
function tippe(el: HTMLTextAreaElement | HTMLInputElement, wert: string) {
  el.value = wert
  fireEvent.input(el)
}

describe('Aufgabenwerk: Muster A (Auswahl)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('zeigt die Aufgabe als Felder, mit Schild, Kopfzeile, Fußleiste; Fokus auf der Frage', () => {
    starte()
    expect(ziel.classList.contains('wk-aufgabenzone')).toBe(true)
    expect(ziel.querySelector('.wk-aw-schild')?.textContent).toBe('Bearbeiten')
    expect(ziel.querySelector('.kopfzeile .marke')?.textContent).toBe('Aufgabe 2')
    expect((ziel.querySelector('textarea.frage') as HTMLTextAreaElement).value).toBe('Wer haftet?')
    expect(felder().map((f) => f.value)).toEqual(['Frachtführer', 'Absender', 'Empfänger'])
    expect(kreise().map((k) => k.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(ziel.querySelector('.wk-aw-typ')?.textContent).toBe('Einfachauswahl')
    expect(document.activeElement).toBe(ziel.querySelector('textarea.frage'))
    expect(document.getElementById('wk-aw-ansage')?.textContent).toMatch(/Aufgabe 2 wird bearbeitet/)
  })

  it('setzt den Fokus auf die angeklickte Antwort', () => {
    starte(mc(), { art: 'antwort', nr: 2 })
    expect(document.activeElement).toBe(felder()[2])
  })

  it('Klick auf den Kreis macht die Antwort richtig – sofort gemeldet', () => {
    starte()
    fireEvent.click(kreise()[1])
    expect(aenderungen()).toHaveLength(1)
    expect(aenderungen()[0]).toMatchObject({ wkAufgabeAenderung: 'k0-e1', gruppe: 'richtig' })
    expect((letzterBlock().answers as { correct: boolean }[]).map((a) => a.correct)).toEqual([false, true, false])
    expect(kreise()[1].getAttribute('aria-checked')).toBe('true')
  })

  it('Tippen wird erst nach der Pause gemeldet, als eine Gruppe je Feld', () => {
    starte()
    tippe(felder()[1], 'Abs')
    tippe(felder()[1], 'Absenderin')
    expect(aenderungen()).toHaveLength(0)
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect(aenderungen()).toHaveLength(1)
    expect(aenderungen()[0].gruppe).toBe('antwort-1-text')
    expect((letzterBlock().answers as { text: string }[])[1].text).toBe('Absenderin')
  })

  it('eine Aktion schickt vorher den getippten Stand mit eigener Gruppe', () => {
    starte()
    tippe(ziel.querySelector('textarea.frage')!, 'Wer haftet nach HGB?')
    fireEvent.click(kreise()[2])
    expect(aenderungen().map((a) => a.gruppe)).toEqual(['text-question', 'richtig'])
  })

  it('„Antwort hinzufügen“ legt eine leere Antwort an und gibt ihr den Fokus', () => {
    starte()
    fireEvent.click(ziel.querySelector('.wk-aw-neu')!)
    expect(felder()).toHaveLength(4)
    expect(document.activeElement).toBe(felder()[3])
    expect(aenderungen()[0].gruppe).toBe('neu-antwort')
  })

  it('Enter springt zur nächsten Antwort, in der letzten legt es eine an', () => {
    starte()
    fireEvent.keyDown(felder()[0], { key: 'Enter' })
    expect(document.activeElement).toBe(felder()[1])
    fireEvent.keyDown(felder()[2], { key: 'Enter' })
    expect(felder()).toHaveLength(4)
    expect(document.activeElement).toBe(felder()[3])
  })

  it('Löschen wirkt sofort (Gruppe für den Toast), Rücktaste in leerer Zeile löscht', () => {
    starte()
    fireEvent.click(knopf('Antwort 3 löschen'))
    expect(felder()).toHaveLength(2)
    expect(aenderungen()[0].gruppe).toBe('loeschen-antwort')
  })

  it('an der Mindestzahl wird nicht gelöscht, sondern erklärt', () => {
    const b = mc()
    b.answers = b.answers.slice(0, 2)
    starte(b)
    fireEvent.click(knopf('Antwort 2 löschen'))
    expect(felder()).toHaveLength(2)
    expect(aenderungen()).toHaveLength(0)
    expect(ziel.querySelector('[role="alert"]')?.textContent).toMatch(/Mindestens 2 Antworten/)
  })

  it('Alt + Pfeil verschiebt die Antwort, der Fokus wandert mit', () => {
    starte()
    fireEvent.keyDown(felder()[0], { key: 'ArrowDown', altKey: true })
    expect(felder().map((f) => f.value)).toEqual(['Absender', 'Frachtführer', 'Empfänger'])
    expect(aenderungen()[0].gruppe).toBe('umsortieren')
    expect(document.activeElement).toBe(felder()[1])
  })

  it('Einfügen mehrerer Zeilen ergibt mehrere Antworten', () => {
    starte()
    fireEvent.click(ziel.querySelector('.wk-aw-neu')!)
    const leer = felder()[3]
    fireEvent.paste(leer, { clipboardData: { getData: () => '• Spediteur\n• Lagerhalter' } })
    expect(felder().map((f) => f.value)).toEqual(['Frachtführer', 'Absender', 'Empfänger', 'Spediteur', 'Lagerhalter'])
  })

  it('Sprechblase öffnet die Rückmeldung; vorhandene ist markiert', () => {
    starte()
    const blase = knopf('Rückmeldung zu Antwort 1 (vorhanden)')
    expect(blase.dataset.voll).toBe('true')
    fireEvent.click(blase)
    const f = ziel.querySelector<HTMLInputElement>('.wk-aw-rueck')!
    expect(f.value).toBe('Genau')
    expect(document.activeElement).toBe(f)
    tippe(f, 'Genau – § 425 HGB')
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect((letzterBlock().answers as { feedback: string }[])[0].feedback).toBe('Genau – § 425 HGB')
  })

  it('fehlende richtige Antwort steht am Ort', () => {
    const b = mc()
    b.answers[0].correct = false
    starte(b)
    expect(ziel.textContent).toMatch(/Klick auf den Kreis vor der richtigen Antwort/)
  })

  it('setze() zeigt den neuen Stand der App (Rückgängig), ohne etwas zu melden', () => {
    starte()
    const b = mc()
    b.answers = b.answers.slice(0, 2)
    werk.setze(b as never)
    expect(felder()).toHaveLength(2)
    expect(aenderungen()).toHaveLength(0)
  })

  it('„Fertig“ meldet das Ende und zeigt die Schülersicht bis zum Neubau', () => {
    starte()
    tippe(felder()[1], 'Absenderin')
    fireEvent.click(ziel.querySelector('.wk-aw-fertig')!)
    expect(aenderungen()).toHaveLength(1)
    expect(gemeldet.at(-1)).toEqual({ wkAufgabeEnde: 'k0-e1' })
    expect(werk.fertig).toBe(true)
    expect(ziel.classList.contains('wk-aufgabenzone')).toBe(false)
    expect(Array.from(ziel.querySelectorAll('.antwort')).map((a) => a.textContent)).toEqual(['Frachtführer', 'Absenderin', 'Empfänger'])
    expect(ziel.querySelector('textarea')).toBeNull()
  })

  it('Esc beendet; ohne Änderung steht wieder die gebaute Fassung', () => {
    starte()
    const vorher = '<p class="frage">Wer haftet?</p>'
    fireEvent.keyDown(ziel.querySelector('textarea.frage')!, { key: 'Escape' })
    expect(gemeldet).toEqual([{ wkAufgabeEnde: 'k0-e1' }])
    expect(ziel.innerHTML).toContain(vorher)
  })

  it('ab() verwirft ohne Meldung', () => {
    starte()
    tippe(felder()[0], 'x')
    werk.ab()
    vi.advanceTimersByTime(TIPP_PAUSE_MS)
    expect(gemeldet).toEqual([])
    expect(ziel.querySelector('textarea')).toBeNull()
  })

  it('⋯ bietet Typ wechseln, Rohfassung, Duplizieren, Löschen (rot, unten) und meldet die Wahl', () => {
    starte()
    fireEvent.click(knopf('Weitere Aktionen'))
    const punkte = Array.from(ziel.querySelectorAll<HTMLButtonElement>('.wk-aw-menue button'))
    expect(punkte.map((p) => p.textContent)).toEqual(['Typ wechseln …', 'Rohfassung bearbeiten', 'Block duplizieren', 'Block löschen'])
    expect(punkte[3].classList.contains('wk-aw-gefahr')).toBe(true)
    fireEvent.click(punkte[1])
    expect(gemeldet.at(-1)).toEqual({ wkAufgabeAktion: 'k0-e1', aktion: 'roh' })
  })
})

describe('Aufgabenwerk: Richtig/Falsch', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Klick auf „Falsch“ dreht die Lösung; die Rückmeldungen bleiben an ihrer Antwort', () => {
    starte({ type: 'true_false', question: 'CMR gilt national.', correct: 'wahr', feedback_correct: 'R', feedback_wrong: 'F' })
    expect(kreise().map((k) => k.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    fireEvent.click(kreise()[1])
    expect(letzterBlock()).toMatchObject({ correct: false, feedback_correct: 'F', feedback_wrong: 'R' })
  })
})

// ── Nachrichten ──────────────────────────────────────────────────────

describe('Nachrichten der Aufgabe', () => {
  it('liest Öffnen, Änderung, Ende, Abbruch und Aktion streng', () => {
    expect(liesWunsch({ wkAufgabe: 'k0-e1', eintrag: { art: 'antwort', nr: 1 }, anzahl: 3 })).toEqual({
      art: 'aufgabe',
      marke: 'k0-e1',
      eintrag: { art: 'antwort', nr: 1 },
      anzahl: 3,
    })
    expect(liesWunsch({ wkAufgabe: 'k0', eintrag: null })).toBeNull()
    expect(liesWunsch({ wkAufgabe: 'k0-e1', eintrag: { art: 'böse' }, anzahl: 1.5 })).toEqual({ art: 'aufgabe', marke: 'k0-e1', eintrag: null, anzahl: null })
    expect(liesWunsch({ wkAufgabeAenderung: 'k0-e1', block: { type: 'x' }, gruppe: 'richtig' })).toMatchObject({ art: 'aufgabeAenderung' })
    expect(liesWunsch({ wkAufgabeAenderung: 'k0-e1', block: { type: 'x' }, gruppe: 'Böse Gruppe' })).toBeNull()
    expect(liesWunsch({ wkAufgabeAenderung: 'k0-e1', block: [], gruppe: 'a' })).toBeNull()
    expect(liesWunsch({ wkAufgabeAenderung: 'k0-e1', block: { t: 'x'.repeat(200_001) }, gruppe: 'a' })).toBeNull()
    expect(liesWunsch({ wkAufgabeEnde: 'k0-e1' })).toEqual({ art: 'aufgabeEnde', marke: 'k0-e1' })
    expect(liesWunsch({ wkAufgabeAbbruch: 'k0-e1' })).toEqual({ art: 'aufgabeAbbruch', marke: 'k0-e1' })
    expect(liesWunsch({ wkAufgabeAktion: 'k0-e1', aktion: 'loeschen' })).toEqual({ art: 'aufgabeAktion', marke: 'k0-e1', aktion: 'loeschen' })
    expect(liesWunsch({ wkAufgabeAktion: 'k0-e1', aktion: 'alles' })).toBeNull()
  })
})

// ── Seiten-Skript ────────────────────────────────────────────────────

describe('Seiten-Skript: Klick auf eine Aufgabe', () => {
  const angehaengt: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = []
  afterEach(() => {
    for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
    angehaengt.length = 0
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  function seite(zustand: Record<string, unknown> = { modus: 'bearbeiten' }) {
    document.body.innerHTML =
      '<h2 data-wk="k0">Thema</h2>' +
      '<section class="aufgabe" data-typ="multiple_choice" data-wk="k0-e0"><div class="kopfzeile"><span class="marke">Aufgabe 1</span></div>' +
      '<p class="frage" id="frage">Wer?</p><div class="antworten"><button class="antwort">A</button><button class="antwort" id="b">B</button></div></section>' +
      '<section class="aufgabe" data-typ="reihenfolge" data-wk="k0-e1"><p class="frage" id="andere">Ordne</p></section>' +
      '<section class="inhalt" data-wk="k0-e2"><p id="text">Text</p></section>'
    const code = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]
    Element.prototype.scrollIntoView = vi.fn()
    const gesendet = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const original = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation((t: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
      angehaengt.push([t, f, o])
      original(t, f, o)
    })
    new Function(code)()
    fireEvent(window, new MessageEvent('message', { data: { wkZustand: zustand }, source: window }))
    gesendet.mockClear()
    return gesendet
  }
  const klick = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
  const nachrichten = (g: ReturnType<typeof seite>) => g.mock.calls.map((c) => c[0])

  it('meldet Antwort samt gezählter Anzahl, die Frage, und sonst die ganze Aufgabe', () => {
    const g = seite()
    klick(document.getElementById('b')!)
    klick(document.getElementById('frage')!)
    klick(document.querySelector('.kopfzeile')!)
    expect(nachrichten(g)).toEqual([
      { wkAufgabe: 'k0-e0', eintrag: { art: 'antwort', nr: 1 }, anzahl: 2 },
      { wkAufgabe: 'k0-e0', eintrag: { art: 'frage' }, anzahl: null },
      { wkAufgabe: 'k0-e0', eintrag: null, anzahl: null },
    ])
  })

  it('andere Typen und Lehrtext wählen wie bisher', () => {
    const g = seite()
    klick(document.getElementById('andere')!)
    klick(document.getElementById('text')!)
    expect(nachrichten(g)).toEqual([{ wkWaehle: 'k0-e1' }, { wkWaehle: 'k0-e2' }])
  })

  it('im Schreibschutz wählt ein Klick nur aus', () => {
    const g2 = seite({ modus: 'bearbeiten', lesen: true })
    klick(document.getElementById('b')!)
    expect(nachrichten(g2)).toEqual([{ wkWaehle: 'k0-e0' }])
  })

  it('startet das Werk in der Seite und gibt Klicks darin frei; Klick daneben beendet', () => {
    const g = seite()
    new Function(AUFGABENWERK_CODE)()
    fireEvent(
      window,
      new MessageEvent('message', {
        data: { wkAufgabeStart: { marke: 'k0-e0', block: { type: 'multiple_choice', question: 'Wer?', answers: [{ text: 'A', correct: true }, { text: 'B' }] }, typName: 'Einfachauswahl', eintrag: null } },
        source: window,
      }),
    )
    const sec = document.querySelector('[data-wk="k0-e0"]')!
    expect(sec.classList.contains('wk-aufgabenzone')).toBe(true)
    expect(document.body.classList.contains('wk-aufgabe')).toBe(true)
    g.mockClear()
    klick(sec.querySelectorAll('.wk-aw-kreis')[1])
    expect(nachrichten(g)[0]).toMatchObject({ wkAufgabeAenderung: 'k0-e0', gruppe: 'richtig' })
    g.mockClear()
    klick(document.getElementById('text')!)
    expect(nachrichten(g)).toEqual([{ wkAufgabeEnde: 'k0-e0' }])
    expect(document.body.classList.contains('wk-aufgabe')).toBe(false)
  })

  it('Klick auf eine andere Aufgabe beendet die offene und wechselt direkt', () => {
    const g = seite()
    new Function(AUFGABENWERK_CODE)()
    fireEvent(
      window,
      new MessageEvent('message', {
        data: { wkAufgabeStart: { marke: 'k0-e0', block: { type: 'multiple_choice', question: 'Wer?', answers: [{ text: 'A', correct: true }, { text: 'B' }] }, typName: 'x', eintrag: null } },
        source: window,
      }),
    )
    // zweite Aufgabe mit Bauplan anlegen
    const zweite = document.querySelector('[data-wk="k0-e1"]')!
    zweite.setAttribute('data-typ', 'true_false')
    g.mockClear()
    klick(document.getElementById('andere')!)
    expect(nachrichten(g)).toEqual([{ wkAufgabeEnde: 'k0-e0' }, { wkAufgabe: 'k0-e1', eintrag: { art: 'frage' }, anzahl: null }])
  })
})
