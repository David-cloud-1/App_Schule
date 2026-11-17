import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { mitSprungSkript } from './vorschau-skript'
import { liesWunsch } from './vorschau-nachrichten'

/**
 * Bild-Bedienung in der Vorschau (PROJ-104): Bild-Leiste, Anfasser zum Größenziehen, Ablegen von Dateien.
 * Das Hilfsskript läuft im Testfenster; im jsdom gibt es keine Layoutmaße, sie werden hier gesetzt.
 */

const angehaengt: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = []

function laufenLassen(zustand?: Record<string, unknown>, breite = '50%') {
  document.head.innerHTML = ''
  document.body.innerHTML =
    '<h2 data-wk="k0">Thema</h2>' +
    `<section data-wk="k0-e0"><figure class="bild bild-mitte" style="width:${breite}"><img id="bild" alt="x" src="data:image/png;base64,AA=="></figure></section>` +
    '<section data-wk="k0-e1"><p>Text</p></section>'
  const code = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]
  Element.prototype.scrollIntoView = vi.fn()
  const gesendet = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
  const original = window.addEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation((t: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
    angehaengt.push([t, f, o])
    original(t, f, o)
  })
  // Breite des Inhalts 400 px, das Bild halb so breit; jedes Element hat sonst keine Maße
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const bild = this.tagName === 'IMG'
    const w = bild ? 200 : 400
    return { top: 0, bottom: 100, left: 0, right: w, width: w, height: 100, x: 0, y: 0, toJSON() {} } as DOMRect
  })
  new Function(code)()
  if (zustand) vomEditor({ wkZustand: zustand })
  gesendet.mockClear()
  return gesendet
}

function vomEditor(daten: unknown) {
  fireEvent(window, new MessageEvent('message', { data: daten, source: window }))
}

const waehleBild = () => vomEditor({ wk: 'k0-e0', name: 'Bild' })
const sichtbar = () =>
  [...document.querySelectorAll<HTMLElement>('.wk-leiste [data-wk-aktion="bild"], .wk-leiste [data-wk-aktion="breite"]')]
    .filter((b) => !b.hidden)
    .map((b) => b.getAttribute('data-wk-bild') ?? `breite${b.getAttribute('data-wk-prozent')}`)
const bildKnopf = (a: string) => document.querySelector<HTMLElement>(`.wk-leiste [data-wk-bild="${a}"]`)!
const griff = (g: string) => document.querySelector<HTMLElement>(`.wk-gr[data-gr="${g}"]`)!
const maus = (typ: string, init: MouseEventInit) => window.dispatchEvent(new MouseEvent(typ, { bubbles: true, ...init }))

afterEach(() => {
  for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
  angehaengt.length = 0
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('Bild-Leiste', () => {
  it('zeigt bei einem Bild Austauschen, Zuschneiden, Drehen, Ausrichten (unter 100 %) und Beschriften', () => {
    laufenLassen()
    waehleBild()
    expect(sichtbar()).toEqual(['austauschen', 'zuschneiden', 'drehenLinks', 'drehenRechts', 'links', 'mitte', 'rechts', 'beschriften'])
  })

  it('bei ganzer Breite gibt es keine Ausrichtung, bei Text-Blöcken keine Bild-Knöpfe', () => {
    laufenLassen(undefined, '100%')
    waehleBild()
    expect(sichtbar()).not.toContain('links')
    vomEditor({ wk: 'k0-e1', name: 'Text' })
    expect(sichtbar()).toEqual([])
  })

  it('die Knöpfe melden ihren Wunsch mit der Marke', () => {
    const gesendet = laufenLassen()
    waehleBild()
    bildKnopf('zuschneiden').click()
    expect(gesendet).toHaveBeenCalledWith({ wkBild: 'k0-e0', aktion: 'zuschneiden' }, '*')
    bildKnopf('rechts').click()
    expect(gesendet).toHaveBeenCalledWith({ wkBild: 'k0-e0', aktion: 'rechts' }, '*')
  })

  it('am Handy: Breite über Klein/Halb/Ganz, kein Zuschneiden, keine Anfasser', () => {
    const gesendet = laufenLassen({ modus: 'bearbeiten', mobil: true })
    waehleBild()
    expect(sichtbar()).toEqual(['austauschen', 'drehenLinks', 'drehenRechts', 'breite33', 'breite50', 'breite100'])
    document.querySelector<HTMLElement>('[data-wk-prozent="100"]')!.click()
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 100 }, '*')
    expect(document.querySelector<HTMLElement>('.wk-griffe')!.hidden).toBe(true)
  })

  it('schreibgeschützt: keine Bild-Knöpfe und keine Anfasser', () => {
    laufenLassen({ modus: 'bearbeiten', lesen: true })
    waehleBild()
    expect(sichtbar()).toEqual([])
    expect(document.querySelector<HTMLElement>('.wk-griffe')!.hidden).toBe(true)
  })
})

describe('Größe ziehen', () => {
  it('zeigt Anfasser an den Ecken und Kanten des gewählten Bildes', () => {
    laufenLassen()
    waehleBild()
    expect(document.querySelector<HTMLElement>('.wk-griffe')!.hidden).toBe(false)
    expect(document.querySelectorAll('.wk-gr')).toHaveLength(6)
  })

  it('zeigt die Breite live und meldet beim Loslassen genau einen Wunsch (eingerastet)', () => {
    const gesendet = laufenLassen()
    waehleBild()
    griff('e').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200 }))
    // Mittig ausgerichtet: 34 px nach rechts = 68 px mehr Breite = 67 % → rastet bei 66 % ein
    maus('pointermove', { clientX: 234 })
    expect(document.querySelector<HTMLElement>('.wk-bl')!.textContent).toContain('66 %')
    expect(document.querySelector<HTMLElement>('figure.bild')!.style.width).toBe('66%')
    expect(gesendet).not.toHaveBeenCalled()
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledTimes(1)
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 66 }, '*')
  })

  it('mit Alt rastet nichts ein', () => {
    const gesendet = laufenLassen()
    waehleBild()
    griff('se').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200 }))
    maus('pointermove', { clientX: 234, altKey: true })
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 67 }, '*')
  })

  it('die linke Kante verkleinert beim Ziehen nach rechts; die Breite bleibt zwischen 20 und 100 %', () => {
    const gesendet = laufenLassen()
    waehleBild()
    griff('w').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100 }))
    maus('pointermove', { clientX: 900 })
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 20 }, '*')
  })

  it('ohne Änderung wird nichts gemeldet; Esc-artiger Abbruch stellt die Breite wieder her', () => {
    const gesendet = laufenLassen()
    waehleBild()
    griff('e').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200 }))
    maus('pointerup', {})
    expect(gesendet).not.toHaveBeenCalled()
    griff('e').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200 }))
    maus('pointermove', { clientX: 260 })
    window.dispatchEvent(new Event('pointercancel'))
    expect(document.querySelector<HTMLElement>('figure.bild')!.style.width).toBe('50%')
    expect(gesendet).not.toHaveBeenCalled()
  })

  it('Doppelklick setzt auf ganze Breite, Pfeiltasten gehen eine Stufe weiter', () => {
    const gesendet = laufenLassen()
    waehleBild()
    griff('se').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 100 }, '*')
    griff('e').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 66 }, '*')
    griff('e').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    expect(gesendet).toHaveBeenCalledWith({ wkBreite: 'k0-e0', prozent: 33 }, '*')
  })
})

describe('Datei auf die Seite ziehen', () => {
  it('zeigt die Einfügestelle zwischen Blöcken und meldet sie', () => {
    const gesendet = laufenLassen()
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const lagen: Record<string, [number, number]> = { k0: [0, 20], 'k0-e0': [20, 100], 'k0-e1': [100, 200] }
      const [top, bottom] = lagen[this.getAttribute('data-wk') ?? ''] ?? [0, 0]
      return { top, bottom, left: 0, right: 400, width: 400, height: bottom - top, x: 0, y: top, toJSON() {} } as DOMRect
    })
    document.elementFromPoint = vi.fn(() => document.querySelector('[data-wk="k0-e1"] p'))
    vomEditor({ wkDropZeiger: { x: 10, y: 190 } })
    expect(gesendet).toHaveBeenCalledWith({ wkDropZiel: 'k0-e1', wo: 'nach' }, '*')
    expect(document.querySelector<HTMLElement>('.wk-linie')!.hidden).toBe(false)
  })

  it('über einem vorhandenen Bild: „Bild ersetzen“ statt Linie', () => {
    const gesendet = laufenLassen()
    document.elementFromPoint = vi.fn(() => document.getElementById('bild'))
    vomEditor({ wkDropZeiger: { x: 10, y: 10 } })
    expect(gesendet).toHaveBeenCalledWith({ wkDropZiel: 'k0-e0', wo: 'auf' }, '*')
    expect(document.querySelector('[data-wk="k0-e0"]')!.classList.contains('wk-dropauf')).toBe(true)
    expect(document.querySelector<HTMLElement>('.wk-linie')!.hidden).toBe(true)
  })

  it('beim Wegziehen verschwindet alles und es gibt kein Ziel', () => {
    const gesendet = laufenLassen()
    document.elementFromPoint = vi.fn(() => document.getElementById('bild'))
    vomEditor({ wkDropZeiger: { x: 10, y: 10 } })
    vomEditor({ wkDropZeiger: null })
    expect(gesendet).toHaveBeenLastCalledWith({ wkDropZiel: null }, '*')
    expect(document.querySelector('.wk-dropauf')).toBeNull()
  })
})

describe('Wünsche der Seite (liesWunsch)', () => {
  it('liest Breite, Bild-Aktion und Ablegeziel', () => {
    expect(liesWunsch({ wkBreite: 'k0-e1', prozent: 50 })).toEqual({ art: 'breite', marke: 'k0-e1', prozent: 50 })
    expect(liesWunsch({ wkBild: 'k2-e0', aktion: 'drehenLinks' })).toEqual({ art: 'bildAktion', marke: 'k2-e0', aktion: 'drehenLinks' })
    expect(liesWunsch({ wkDropZiel: 'k0-e3', wo: 'auf' })).toEqual({ art: 'dropZiel', marke: 'k0-e3', wo: 'auf' })
    expect(liesWunsch({ wkDropZiel: 'k1', wo: 'anfang' })).toEqual({ art: 'dropZiel', marke: 'k1', wo: 'anfang' })
    expect(liesWunsch({ wkDropZiel: null })).toEqual({ art: 'dropZiel', marke: null, wo: null })
  })

  it('verwirft Ungültiges', () => {
    for (const n of [
      { wkBreite: 'k0', prozent: 50 },
      { wkBreite: 'k0-e0', prozent: 0 },
      { wkBreite: 'k0-e0', prozent: 150 },
      { wkBreite: 'k0-e0', prozent: 'x' },
      { wkBreite: 'abschluss', prozent: 50 },
      { wkBild: 'k0-e0', aktion: 'loeschen' },
      { wkBild: 'k0', aktion: 'austauschen' },
      { wkDropZiel: 'k0-e0', wo: 'anfang' },
      { wkDropZiel: 'k0', wo: 'auf' },
      { wkDropZiel: 'k0-e0' },
      { wkDropZiel: 'xyz', wo: 'nach' },
    ]) {
      expect(liesWunsch(n), JSON.stringify(n)).toBeNull()
    }
  })
})
