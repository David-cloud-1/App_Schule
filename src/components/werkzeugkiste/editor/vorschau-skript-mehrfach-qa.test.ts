import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { mitSprungSkript } from './vorschau-skript'
import { liesWunsch } from './vorschau-nachrichten'

/**
 * QA PROJ-102: zusätzliche Prüfungen für das Hilfsskript (Ziehen, Tasten) und die strenge
 * Nachrichten-Prüfung. Aufbau wie in `vorschau-skript.test.ts`; die Ereignis-Abfänger des
 * Skripts werden nach jedem Test wieder entfernt.
 */

const angehaengt: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = []

function laufenLassen(zustand?: Record<string, unknown>) {
  document.head.innerHTML = ''
  document.body.innerHTML =
    '<h2 data-wk="k0">Thema</h2>' +
    '<section data-wk="k0-e0"><p id="text">Block A mit Text zum Markieren</p></section>' +
    '<section data-wk="k0-e1"><p>Block B</p></section>' +
    '<h2 data-wk="k1">Zweites Thema</h2>' +
    '<h2 data-wk="abschluss">Lernzielkontrolle</h2>'
  const code = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]
  Element.prototype.scrollIntoView = vi.fn()
  const gesendet = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
  const original = window.addEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation((t: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
    angehaengt.push([t, f, o])
    original(t, f, o)
  })
  new Function(code)()
  if (zustand) vomEditor({ wkZustand: zustand })
  gesendet.mockClear()
  return gesendet
}

function vomEditor(daten: unknown) {
  fireEvent(window, new MessageEvent('message', { data: daten, source: window }))
}

const aktion = (a: string) => document.querySelector<HTMLElement>(`.wk-leiste [data-wk-aktion="${a}"]`)!
const maus = (typ: string, init: MouseEventInit = {}) => window.dispatchEvent(new MouseEvent(typ, { bubbles: true, ...init }))
const taste = (key: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  document.body.dispatchEvent(e)
  return e
}

afterEach(() => {
  for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
  angehaengt.length = 0
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.getSelection()?.removeAllRanges()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('QA PROJ-102 – Ziehen räumt immer auf', () => {
  it('Fokusverlust (blur) beendet das Ziehen: kein Wunsch, kein Auto-Scroll-Takt läuft weiter', () => {
    vi.useFakeTimers()
    const gesendet = laufenLassen()
    const scroll = vi.fn()
    vi.stubGlobal('scrollBy', scroll)
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 1 }))
    vi.advanceTimersByTime(100)
    const vorher = scroll.mock.calls.length
    expect(vorher).toBeGreaterThan(0) // am oberen Rand scrollt es
    window.dispatchEvent(new Event('blur'))
    vi.advanceTimersByTime(500)
    expect(scroll.mock.calls.length).toBe(vorher)
    maus('pointerup')
    expect(gesendet).not.toHaveBeenCalled()
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('Moduswechsel während des Ziehens bricht ab, ohne Wunsch', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
    vomEditor({ wkZustand: { modus: 'ausprobieren' } })
    maus('pointerup')
    expect(gesendet.mock.calls.some((c) => 'wkLege' in (c[0] as object) || 'wkLegeThema' in (c[0] as object))).toBe(false)
    expect(document.querySelector('.wk-zieht')).toBeNull()
  })

  it('pointercancel bricht ab, ohne Wunsch', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
    maus('pointercancel')
    maus('pointerup')
    expect(gesendet).not.toHaveBeenCalled()
  })

  it('schreibgeschützt und am Handy startet kein Ziehen, auch wenn der (versteckte) Griff ein Ereignis bekommt', () => {
    for (const zustand of [
      { modus: 'bearbeiten', lesen: true },
      { modus: 'bearbeiten', mobil: true },
    ]) {
      const gesendet = laufenLassen(zustand)
      vomEditor({ wk: 'k0-e1', name: 'x' })
      aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
      expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
      maus('pointerup')
      expect(gesendet).not.toHaveBeenCalled()
      for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
      angehaengt.length = 0
      vi.restoreAllMocks()
    }
  })

  it('während des Ziehens gehen keine anderen Tasten an die App (nur Esc bricht ab)', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
    taste('Delete')
    taste('v', { metaKey: true })
    expect(gesendet).not.toHaveBeenCalled()
    taste('Escape')
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
  })
})

describe('QA PROJ-102 – Tasten in der Vorschau', () => {
  it('Alt+Pfeil wird mit alt=true weitergegeben (Verschieben um eine Stelle)', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    taste('ArrowDown', { altKey: true })
    expect(gesendet).toHaveBeenCalledWith({ wkTaste: 'ArrowDown', mod: false, shift: false, alt: true }, '*')
  })

  // BUG-1: In der App (baukasten-editor.tsx) bleibt ⌘/Strg+C bei markiertem Text normales Kopieren.
  // Das Hilfsskript prüft das nicht: Mit gewähltem Block wird ⌘/Strg+C abgefangen (preventDefault) und
  // als Block-Kopie an die App gemeldet – markierter Text in der Vorschau lässt sich nicht kopieren.
  it('BUG-1 (behoben): ⌘/Strg+C mit markiertem Text in der Vorschau bleibt normales Kopieren', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    window.getSelection()!.selectAllChildren(document.getElementById('text')!)
    expect(window.getSelection()!.toString()).not.toBe('')
    const e = taste('c', { metaKey: true })
    expect(gesendet).not.toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('QA PROJ-102 – liesWunsch bleibt streng', () => {
  it('neue Wünsche lehnen falsche Marken, Typen und Zusätze ab', () => {
    for (const n of [
      { wkMehr: 'k0', wie: 'umschalten' }, // Thema nie in der Mehrfachauswahl
      { wkMehr: 'deckblatt', wie: 'bereich' },
      { wkMehr: 'abschluss', wie: 'bereich' },
      { wkMehr: 'k0-e0', wie: 'alles' },
      { wkMehr: 'k0-e0' },
      { wkMehr: ['k0-e0'], wie: 'umschalten' },
      { wkLege: 'k0', wo: 'nach' }, // vor/nach nur an Blöcken
      { wkLege: 'k0-e0', wo: 'anfang' }, // anfang nur an Themen
      { wkLege: 'abschluss', wo: 'vor' },
      { wkLege: 'deckblatt', wo: 'anfang' },
      { wkLege: 'k0-e0', wo: 'innen' },
      { wkLege: 'k0-e0;alert(1)', wo: 'nach' },
      { wkLegeThema: 'k0-e1' },
      { wkLegeThema: 'deckblatt' },
      { wkLegeThema: 'abschluss-summary' },
      { wkLegeThema: 'k' + '9'.repeat(20) },
      { wkKopiere: 'k0' },
      { wkKopiere: 'abschluss' },
      { wkKopiere: 'k0-e' + '1'.repeat(60) },
      { wkTaste: 'C', mod: true }, // nur Kleinbuchstaben aus der Liste
      { wkTaste: 'a', mod: true }, // „alles auswählen“ ist nicht vereinbart
    ]) {
      expect(liesWunsch(n), JSON.stringify(n)).toBeNull()
    }
  })

  it('Zusatzfelder werden nicht durchgereicht (nur Marke und feste Werte)', () => {
    const w = liesWunsch({ wkLege: 'k1-e2', wo: 'vor', bloecke: [{ type: 'text', content: '<script>' }] })
    expect(w).toEqual({ art: 'lege', marke: 'k1-e2', wo: 'vor' })
    const k = liesWunsch({ wkKopiere: 'k0-e0', inhalt: 'fremd' })
    expect(k).toEqual({ art: 'kopiere', marke: 'k0-e0' })
    // mod/shift/alt nur bei echtem true
    expect(liesWunsch({ wkTaste: 'x', mod: 'true', alt: 1 })).toEqual({ art: 'taste', taste: { key: 'x', mod: false, shift: false, alt: false } })
  })
})
