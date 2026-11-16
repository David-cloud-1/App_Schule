import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { LEISTE_FARBEN, mitSprungSkript } from './vorschau-skript'
import { SCHNELLE_TYPEN, auswahlAusMarke, liesWunsch } from './vorschau-nachrichten'

/**
 * Hilfsskript der Editor-Vorschau (PROJ-101). Es läuft hier im Testfenster; damit
 * seine Ereignis-Abfänger nicht in die nächsten Tests hineinwirken, werden sie danach entfernt.
 */

const angehaengt: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = []

function laufenLassen(zustand?: Record<string, unknown>, leeren = true) {
  document.head.innerHTML = ''
  document.body.innerHTML =
    '<div class="navi">Kopf</div>' +
    '<h2 data-wk="k0">Thema</h2>' +
    '<section data-wk="k0-e0"><p id="text">Block A</p></section>' +
    '<section data-wk="k0-e1"><button id="aufgabe">Prüfen</button><input id="eingabe"></section>' +
    '<h2 data-wk="k1">Zweites Thema</h2>' +
    '<h2 data-wk="abschluss">Lernzielkontrolle</h2>' +
    '<div data-wk="abschluss-summary"><span id="teil">Teil</span></div>' +
    '<div data-wk="k9;x"><span id="fremd">Fremd</span></div><p id="leer">Zwischenraum</p>'
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
  if (leeren) gesendet.mockClear()
  return gesendet
}

function vomEditor(daten: unknown, source: MessageEventSource | null = window) {
  fireEvent(window, new MessageEvent('message', { data: daten, source }))
}

function klick(el: Element, detail = 1) {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true, detail })
  el.dispatchEvent(e)
  return e
}

const id = (n: string) => document.getElementById(n)!
const aktion = (a: string) => document.querySelector<HTMLElement>(`.wk-leiste [data-wk-aktion="${a}"]`)!

afterEach(() => {
  for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
  angehaengt.length = 0
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('Hilfsskript: Aufbau', () => {
  it('kommt vor </body>, prüft den Absender, nimmt nur sichere Marken an und läuft nur in der Vorschau', () => {
    const html = mitSprungSkript('<html><body><p>x</p></body></html>')
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</body>'))
    expect(html).toContain('e.source!==parent')
    expect(html).toContain('replace(/[^a-z0-9_-]/gi,"")')
    expect(html).not.toContain('allow-same-origin')
    expect(mitSprungSkript('<p>ohne body</p>')).toContain('<script>')
  })

  it('startet im Modus Bearbeiten, meldet „bereit“ und blendet den Seitenkopf aus', () => {
    const gesendet = laufenLassen(undefined, false)
    expect(gesendet).toHaveBeenCalledWith({ wkBereit: true }, '*')
    expect(document.body.classList.contains('wk-bearbeiten')).toBe(true)
    expect(document.head.querySelector('style')!.textContent).toContain('.navi{display:none!important}')
  })

  it('lässt den Druck frei von allen Bedienelementen und Rahmen', () => {
    laufenLassen()
    const css = document.head.querySelector('style')!.textContent!
    expect(css).toContain('@media print{.wk-ui{display:none!important}.wk-aktiv,.wk-hover{outline:none!important}}')
  })

  it('die Farben der Leiste haben Kontrast ≥ 4,5 : 1', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const kontrast = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    const F = LEISTE_FARBEN
    expect(kontrast(F.text, F.grund)).toBeGreaterThanOrEqual(4.5)
    expect(kontrast(F.textTyp, F.grund)).toBeGreaterThanOrEqual(4.5)
    expect(kontrast(F.gefahr, F.gefahrGrund)).toBeGreaterThanOrEqual(4.5)
    expect(kontrast(F.plusText, F.plusGrund)).toBeGreaterThanOrEqual(4.5)
    expect(kontrast(F.leerText, F.leerGrund)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('Modus Bearbeiten: Auswählen und Einfrieren', () => {
  it('ein Klick auf einen Block wählt ihn aus, ein Doppelklick öffnet das Formular', () => {
    const gesendet = laufenLassen()
    klick(id('text'))
    expect(gesendet).toHaveBeenCalledWith({ wkWaehle: 'k0-e0' }, '*')
    klick(id('text'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkBearbeite: 'k0-e0' }, '*')
  })

  it('Teile der Lernzielkontrolle wählen die Lernzielkontrolle', () => {
    const gesendet = laufenLassen()
    klick(id('teil'))
    expect(gesendet).toHaveBeenCalledWith({ wkWaehle: 'abschluss' }, '*')
  })

  it('ein Klick neben alle Blöcke oder auf eine fremde Marke hebt die Auswahl auf', () => {
    const gesendet = laufenLassen()
    klick(id('leer'))
    klick(id('fremd'))
    expect(gesendet).toHaveBeenCalledTimes(2)
    expect(gesendet).toHaveBeenNthCalledWith(1, { wkAbwaehle: true }, '*')
    expect(gesendet).toHaveBeenNthCalledWith(2, { wkAbwaehle: true }, '*')
  })

  it('friert Aufgaben ein: Klicks, Maus, Eingaben und Ziehen erreichen sie nicht', () => {
    laufenLassen()
    const aufgabe = vi.fn()
    for (const art of ['click', 'mousedown', 'pointerdown', 'dblclick', 'dragstart', 'keypress', 'input']) id('aufgabe').addEventListener(art, aufgabe)
    const e = klick(id('aufgabe'))
    expect(e.defaultPrevented).toBe(true)
    for (const art of ['mousedown', 'pointerdown', 'dblclick', 'dragstart', 'keypress', 'input'])
      id('aufgabe').dispatchEvent(new Event(art, { bubbles: true, cancelable: true }))
    expect(aufgabe).not.toHaveBeenCalled()
  })

  it('Touch bleibt scrollbar (keine Verhinderung), erreicht die Aufgabe aber nicht', () => {
    laufenLassen()
    const aufgabe = vi.fn()
    id('aufgabe').addEventListener('touchstart', aufgabe)
    const e = new Event('touchstart', { bubbles: true, cancelable: true })
    id('aufgabe').dispatchEvent(e)
    expect(aufgabe).not.toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(false)
  })

  it('nimmt Eingabefeldern den Fokus und lässt Tippen nicht durch', () => {
    laufenLassen()
    id('eingabe').focus()
    expect(document.activeElement).not.toBe(id('eingabe'))
    const taste = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    id('eingabe').dispatchEvent(taste)
    expect(taste.defaultPrevented).toBe(true)
  })

  it('im Modus Ausprobieren verhält sich die Seite wie für Schüler: nichts wird abgefangen, nichts gemeldet', () => {
    const gesendet = laufenLassen({ modus: 'ausprobieren' })
    const aufgabe = vi.fn()
    id('aufgabe').addEventListener('click', aufgabe)
    const e = klick(id('aufgabe'))
    klick(id('text'))
    expect(aufgabe).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBe(false)
    expect(gesendet).not.toHaveBeenCalled()
    expect(document.body.classList.contains('wk-bearbeiten')).toBe(false)
    // Zurück: wieder eingefroren
    vomEditor({ wkZustand: { modus: 'bearbeiten' } })
    expect(document.body.classList.contains('wk-bearbeiten')).toBe(true)
    klick(id('aufgabe'))
    expect(aufgabe).toHaveBeenCalledTimes(1)
  })
})

describe('Modus Bearbeiten: Rahmen und Leiste', () => {
  it('hebt die gewählte Stelle hervor und zeigt die Leiste mit dem Typ-Namen; nimmt nur Nachrichten vom Elternfenster an', () => {
    laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'Lückentext' })
    expect(document.querySelector('.wk-aktiv')?.getAttribute('data-wk')).toBe('k0-e1')
    const leiste = document.querySelector<HTMLElement>('.wk-leiste')!
    expect(leiste.hidden).toBe(false)
    expect(leiste.querySelector('.wk-typ')!.textContent).toBe('Lückentext')
    vomEditor({ wk: 'k0-e0' }, null) // fremder Absender
    expect(document.querySelector('.wk-aktiv')?.getAttribute('data-wk')).toBe('k0-e1')
    vomEditor({ wk: null })
    expect(document.querySelector('.wk-aktiv')).toBeNull()
    expect(leiste.hidden).toBe(true)
  })

  it('an einem Block: alle Aktionen; am Thema: „Block“; an der Lernzielkontrolle: nur „Bearbeiten“', () => {
    laufenLassen()
    const sichtbar = () =>
      [...document.querySelectorAll<HTMLElement>('.wk-leiste [data-wk-aktion]')].filter((b) => !b.hidden).map((b) => b.getAttribute('data-wk-aktion'))
    vomEditor({ wk: 'k0-e1', name: 'x' })
    expect(sichtbar()).toEqual(['griff', 'bearbeite', 'einfuegen', 'dupliziere', 'menue', 'loesche'])
    expect(aktion('einfuegen').textContent).toBe('Darunter')
    vomEditor({ wk: 'k0', name: 'Thema' })
    // Am Thema geht auch Löschen (die App fragt per Dialog nach)
    expect(sichtbar()).toEqual(['griff', 'bearbeite', 'einfuegen', 'loesche'])
    expect(aktion('einfuegen').textContent).toBe('Block')
    expect(aktion('loesche').getAttribute('aria-label')).toBe('Thema löschen')
    vomEditor({ wk: 'abschluss', name: 'Lernzielkontrolle' })
    expect(sichtbar()).toEqual(['bearbeite'])
  })

  it('PROJ-111: Ist das Formular offen, fehlt „Bearbeiten“ in der Leiste (am Desktop); am Handy bleibt es', () => {
    const sichtbar = () =>
      [...document.querySelectorAll<HTMLElement>('.wk-leiste [data-wk-aktion]')].filter((b) => !b.hidden).map((b) => b.getAttribute('data-wk-aktion'))
    laufenLassen({ modus: 'bearbeiten', schublade: true })
    vomEditor({ wk: 'k0-e1', name: 'x' })
    expect(sichtbar()).toEqual(['griff', 'einfuegen', 'dupliziere', 'menue', 'loesche'])
    vomEditor({ wkZustand: { modus: 'bearbeiten', schublade: false } })
    expect(sichtbar()).toContain('bearbeite')
    vomEditor({ wkZustand: { modus: 'bearbeiten', schublade: true, mobil: true } })
    expect(sichtbar()).toContain('bearbeite')
  })

  it('Handy: die feste Leiste bekommt Platz am Seitenende (Klasse wk-mobil)', () => {
    laufenLassen({ modus: 'bearbeiten', mobil: true })
    expect(document.body.classList.contains('wk-mobil')).toBe(true)
    vomEditor({ wkZustand: { modus: 'bearbeiten', mobil: false } })
    expect(document.body.classList.contains('wk-mobil')).toBe(false)
  })

  it('schreibgeschützt: nur „Bearbeiten“ (zum Ansehen), nichts Verändernes', () => {
    laufenLassen({ modus: 'bearbeiten', lesen: true })
    vomEditor({ wk: 'k0-e1', name: 'x' })
    const sichtbar = [...document.querySelectorAll<HTMLElement>('.wk-leiste [data-wk-aktion]')].filter((b) => !b.hidden).map((b) => b.getAttribute('data-wk-aktion'))
    expect(sichtbar).toEqual(['bearbeite'])
  })

  it('die Knöpfe der Leiste melden ihren Wunsch mit der Marke des gewählten Blocks', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    klick(aktion('bearbeite'))
    klick(aktion('einfuegen'))
    klick(aktion('dupliziere'))
    klick(aktion('loesche'))
    expect(gesendet).toHaveBeenCalledWith({ wkBearbeite: 'k0-e1' }, '*')
    expect(gesendet).toHaveBeenCalledWith({ wkEinfuegen: 'k0-e1' }, '*')
    expect(gesendet).toHaveBeenCalledWith({ wkDupliziere: 'k0-e1' }, '*')
    expect(gesendet).toHaveBeenCalledWith({ wkLoesche: 'k0-e1' }, '*')
    klick(aktion('menue'))
    expect(gesendet).toHaveBeenCalledWith(expect.objectContaining({ wkMenue: 'k0-e1', x: expect.any(Number), y: expect.any(Number) }), '*')
  })

  it('am Handy sitzt die Leiste fest am unteren Rand', () => {
    laufenLassen({ modus: 'bearbeiten', mobil: true })
    vomEditor({ wk: 'k0-e1', name: 'x' })
    expect(document.querySelector('.wk-leiste')!.classList.contains('wk-leiste-unten')).toBe(true)
  })

  it('scrollt nur zur Stelle, wenn der Klick nicht aus der Seite kam', () => {
    laufenLassen()
    // jsdom hat keine Layoutmaße: Der Block liegt „im Bild“
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 200, left: 0, right: 300, width: 300, height: 100, x: 0, y: 100, toJSON() {} } as DOMRect)
    vomEditor({ wk: 'k0-e1', name: 'x', still: true })
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })
})

describe('Modus Bearbeiten: Leerzustand und Einfügestellen', () => {
  it('ein leeres Thema zeigt Vorschläge; ein Klick meldet Typ und Thema', () => {
    const gesendet = laufenLassen({ modus: 'bearbeiten', leer: [1] })
    const leer = document.querySelector('.wk-leer')!
    expect(leer.previousElementSibling?.getAttribute('data-wk')).toBe('k1')
    expect(leer.textContent).toContain('Dieses Thema ist noch leer.')
    const typen = [...leer.querySelectorAll('[data-wk-aktion="schnell"]')].map((b) => b.getAttribute('data-wk-typ'))
    expect(typen).toEqual([...SCHNELLE_TYPEN])
    expect([...leer.querySelectorAll('[data-wk-aktion="schnell"]')].map((b) => b.textContent)).toEqual([
      'Lehrtext',
      'Bild',
      'Auswahlfrage',
      'Lückentext',
      'Zuordnen',
      'Begriffe zum Aufklappen',
    ])
    klick(leer.querySelector('[data-wk-typ="fill_blanks"]')!)
    expect(gesendet).toHaveBeenCalledWith({ wkSchnell: 'k1', typ: 'fill_blanks' }, '*')
    klick(leer.querySelector('[data-wk-aktion="einfuegen"]')!)
    expect(gesendet).toHaveBeenCalledWith({ wkEinfuegen: 'k1' }, '*')
  })

  it('verschwindet wieder, wenn das Thema nicht mehr leer ist, und im Modus Ausprobieren', () => {
    laufenLassen({ modus: 'bearbeiten', leer: [1] })
    expect(document.querySelectorAll('.wk-leer')).toHaveLength(1)
    vomEditor({ wkZustand: { modus: 'bearbeiten', leer: [] } })
    expect(document.querySelectorAll('.wk-leer')).toHaveLength(0)
    vomEditor({ wkZustand: { modus: 'ausprobieren', leer: [1] } })
    // Die Elemente stehen noch im Dokument, sind aber ohne `wk-bearbeiten` per Stil ausgeblendet
    expect(document.body.classList.contains('wk-bearbeiten')).toBe(false)
    expect(document.head.querySelector('style')!.textContent).toContain('body:not(.wk-bearbeiten) .wk-ui{display:none!important}')
  })

  it('am Ende der Themen steht „+ Block“, am Ende des letzten Themas auch „+ Thema“', () => {
    const gesendet = laufenLassen({ modus: 'bearbeiten', leer: [] })
    const enden = [...document.querySelectorAll('.wk-ende')]
    expect(enden).toHaveLength(2)
    // Thema 0: hinter dem letzten Block
    expect(enden[0].querySelector('[data-wk-aktion="einfuegen"]')!.getAttribute('data-wk-marke')).toBe('k0-e1')
    expect(enden[0].querySelector('[data-wk-aktion="thema"]')).toBeNull()
    // Thema 1 (letztes): ohne Blöcke → Marke des Themas; dazu „+ Thema“
    expect(enden[1].querySelector('[data-wk-aktion="einfuegen"]')!.getAttribute('data-wk-marke')).toBe('k1')
    klick(enden[1].querySelector('[data-wk-aktion="thema"]')!)
    expect(gesendet).toHaveBeenCalledWith({ wkThemaNeu: true }, '*')
  })

  it('beim Darüberfahren am Blockrand erscheint die Einfügelinie mit der Marke des Blocks darüber', () => {
    const gesendet = laufenLassen()
    // jsdom hat keine Layoutmaße: Alle Ränder liegen bei 0, der Zeiger auch
    id('text').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
    const plus = document.querySelector<HTMLElement>('.wk-plus')!
    expect(plus.hidden).toBe(false)
    expect(plus.querySelector('[data-wk-aktion="einfuegen"]')!.getAttribute('data-wk-marke')).toBe('k0-e0')
    klick(plus.querySelector('[data-wk-aktion="einfuegen"]')!)
    expect(gesendet).toHaveBeenCalledWith({ wkEinfuegen: 'k0-e0' }, '*')
  })
})

describe('Tastatur', () => {
  const taste = (key: string, init: KeyboardEventInit = {}, ziel: Element = document.body) => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    ziel.dispatchEvent(e)
    return e
  }

  it('gibt Pfeile, Enter, Entf und Esc nur weiter, wenn etwas gewählt ist (Esc immer)', () => {
    const gesendet = laufenLassen()
    taste('ArrowDown')
    taste('Delete')
    expect(gesendet).not.toHaveBeenCalled()
    taste('Escape')
    expect(gesendet).toHaveBeenCalledWith({ wkTaste: 'Escape', mod: false, shift: false, alt: false }, '*')
    gesendet.mockClear()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    taste('ArrowDown')
    taste('Enter')
    taste('Delete')
    expect(gesendet.mock.calls.map((c) => (c[0] as { wkTaste: string }).wkTaste)).toEqual(['ArrowDown', 'Enter', 'Delete'])
  })

  it('gibt ⌘/Strg + D, E, Z und Alt+Umschalt+B weiter, aber keine anderen Kürzel', () => {
    const gesendet = laufenLassen()
    taste('d', { ctrlKey: true })
    taste('e', { metaKey: true })
    taste('z', { ctrlKey: true, shiftKey: true })
    taste('B', { altKey: true, shiftKey: true, code: 'KeyB' })
    expect(gesendet.mock.calls.map((c) => c[0])).toEqual([
      { wkTaste: 'd', mod: true, shift: false, alt: false },
      { wkTaste: 'e', mod: true, shift: false, alt: false },
      { wkTaste: 'z', mod: true, shift: true, alt: false },
      { wkTaste: 'b', mod: false, shift: true, alt: true },
    ])
    gesendet.mockClear()
    taste('c', { ctrlKey: true })
    taste('a')
    taste('Tab')
    expect(gesendet).not.toHaveBeenCalled()
  })

  it('Enter auf einem Knopf der Leiste bedient den Knopf und öffnet nicht zusätzlich das Formular', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    taste('Enter', {}, aktion('einfuegen'))
    expect(gesendet).not.toHaveBeenCalled()
  })

  it('im Modus Ausprobieren gehen nur ⌘/Strg + E und ⌘/Strg + Z (außerhalb von Feldern) weiter', () => {
    const gesendet = laufenLassen({ modus: 'ausprobieren' })
    taste('ArrowDown')
    taste('Escape')
    taste('d', { ctrlKey: true })
    expect(gesendet).not.toHaveBeenCalled()
    taste('e', { ctrlKey: true })
    taste('z', { ctrlKey: true })
    expect(gesendet).toHaveBeenCalledTimes(2)
    gesendet.mockClear()
    taste('z', { ctrlKey: true }, id('eingabe')) // in einem Feld gilt das Feld
    expect(gesendet).not.toHaveBeenCalled()
  })
})

describe('Nachrichten der Seite an die App (liesWunsch)', () => {
  it('liest alle Wünsche mit gültiger Marke', () => {
    expect(liesWunsch({ wkWaehle: 'k0-e1' })).toEqual({ art: 'waehle', marke: 'k0-e1' })
    expect(liesWunsch({ wkAbwaehle: true })).toEqual({ art: 'abwaehlen' })
    expect(liesWunsch({ wkBearbeite: 'k2' })).toEqual({ art: 'bearbeite', marke: 'k2' })
    expect(liesWunsch({ wkEinfuegen: 'k0-e0' })).toEqual({ art: 'einfuegen', marke: 'k0-e0' })
    expect(liesWunsch({ wkLoesche: 'k0-e0' })).toEqual({ art: 'loesche', marke: 'k0-e0' })
    expect(liesWunsch({ wkDupliziere: 'k0-e0' })).toEqual({ art: 'dupliziere', marke: 'k0-e0' })
    expect(liesWunsch({ wkMenue: 'k0-e0', x: 10, y: 20 })).toEqual({ art: 'menue', marke: 'k0-e0', x: 10, y: 20 })
    expect(liesWunsch({ wkSchnell: 'k1', typ: 'text' })).toEqual({ art: 'schnell', marke: 'k1', typ: 'text' })
    expect(liesWunsch({ wkThemaNeu: true })).toEqual({ art: 'neuesThema' })
    expect(liesWunsch({ wkMehr: 'k0-e1', wie: 'bereich' })).toEqual({ art: 'mehr', marke: 'k0-e1', wie: 'bereich' })
    expect(liesWunsch({ wkLege: 'k0-e1', wo: 'nach' })).toEqual({ art: 'lege', marke: 'k0-e1', wo: 'nach' })
    expect(liesWunsch({ wkLege: 'k2', wo: 'anfang' })).toEqual({ art: 'lege', marke: 'k2', wo: 'anfang' })
    expect(liesWunsch({ wkLegeThema: 'abschluss' })).toEqual({ art: 'legeThema', marke: 'abschluss' })
    expect(liesWunsch({ wkLegeThema: 'k3' })).toEqual({ art: 'legeThema', marke: 'k3' })
    expect(liesWunsch({ wkKopiere: 'k0-e1' })).toEqual({ art: 'kopiere', marke: 'k0-e1' })
    expect(liesWunsch({ wkTaste: 'v', mod: true })).toEqual({ art: 'taste', taste: { key: 'v', mod: true, shift: false, alt: false } })
    expect(liesWunsch({ wkTaste: 'z', mod: true, shift: true })).toEqual({ art: 'taste', taste: { key: 'z', mod: true, shift: true, alt: false } })
  })

  it('verwirft Ungültiges: falsche Marken, unbekannte Typen und Tasten, fehlende oder unsinnige Koordinaten', () => {
    for (const n of [
      null,
      'k0',
      7,
      {},
      { wkWaehle: 'k0-e1"]x' },
      { wkWaehle: 'k0-e1; alert(1)' },
      { wkWaehle: 7 },
      { wkLoesche: '' },
      { wkMenue: 'k0-e0' },
      { wkMenue: 'k0-e0', x: 'a', y: 1 },
      { wkMenue: 'k0-e0', x: Infinity, y: 1 },
      { wkMenue: 'k0-e0', x: 1e9, y: 1 },
      { wkSchnell: 'k1', typ: 'drag_words' },
      { wkSchnell: 'k1', typ: '<script>' },
      { wkSchnell: 'x1', typ: 'text' },
      { wkTaste: 'F5' },
      { wkTaste: 'a' },
      { wkAbwaehle: 'ja' },
      { wkThemaNeu: 1 },
      { wkMehr: 'k0', wie: 'bereich' },
      { wkMehr: 'k0-e1', wie: 'alle' },
      { wkMehr: 'k0-e1' },
      { wkLege: 'k0-e1', wo: 'anfang' },
      { wkLege: 'k0', wo: 'nach' },
      { wkLege: 'k0-e1', wo: 'unten' },
      { wkLege: 'k0-e1' },
      { wkLegeThema: 'k0-e1' },
      { wkLegeThema: 'deckblatt' },
      { wkLegeThema: 'k99999999999999' },
      { wkKopiere: 'k0' },
      { wkKopiere: 'k0-e1; x' },
    ])
      expect(liesWunsch(n)).toBeNull()
  })

  it('Marken: Deckblatt, Themen, Blöcke, Lernzielkontrolle', () => {
    expect(auswahlAusMarke('deckblatt')).toEqual({ art: 'deckblatt' })
    expect(auswahlAusMarke('k0')).toEqual({ art: 'thema', thema: 0 })
    expect(auswahlAusMarke('k12-e3')).toEqual({ art: 'block', thema: 12, block: 3 })
    expect(auswahlAusMarke('abschluss-summary')).toEqual({ art: 'abschluss' })
    expect(auswahlAusMarke('deckblatt-x')).toBeNull()
  })
})

describe('Mehrfachauswahl und Ziehen (PROJ-102)', () => {
  const taste = (key: string, init: KeyboardEventInit = {}) => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    document.body.dispatchEvent(e)
    return e
  }
  const maus = (typ: string, init: MouseEventInit) => window.dispatchEvent(new MouseEvent(typ, { bubbles: true, ...init }))
  const sichtbar = () =>
    [...document.querySelectorAll<HTMLElement>('.wk-leiste [data-wk-aktion]')].filter((b) => !b.hidden).map((b) => b.getAttribute('data-wk-aktion'))

  /** Lage der Blöcke von oben nach unten, damit die Zielstelle berechnet werden kann (im Testfenster ist alles 0) */
  function lageSetzen() {
    const lagen: Record<string, [number, number]> = { k0: [0, 20], 'k0-e0': [20, 100], 'k0-e1': [100, 200], k1: [200, 220], abschluss: [300, 320] }
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const [top, bottom] = lagen[this.getAttribute('data-wk') ?? ''] ?? [0, 0]
      return { top, bottom, left: 0, right: 400, width: 400, height: bottom - top, x: 0, y: top, toJSON() {} } as DOMRect
    })
  }

  it('⌘/Strg+Klick meldet „umschalten“, Umschalt+Klick „bereich“; am Handy gilt ein normaler Klick', () => {
    const gesendet = laufenLassen()
    id('text').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ctrlKey: true }))
    expect(gesendet).toHaveBeenLastCalledWith({ wkMehr: 'k0-e0', wie: 'umschalten' }, '*')
    id('text').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, shiftKey: true }))
    expect(gesendet).toHaveBeenLastCalledWith({ wkMehr: 'k0-e0', wie: 'bereich' }, '*')
    id('text').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, metaKey: true }))
    expect(gesendet).toHaveBeenLastCalledWith({ wkMehr: 'k0-e0', wie: 'umschalten' }, '*')
    // Themen lassen sich nicht in die Mehrfachauswahl nehmen
    document.querySelector('[data-wk="k0"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ctrlKey: true }))
    expect(gesendet).toHaveBeenLastCalledWith({ wkWaehle: 'k0' }, '*')
  })

  it('am Handy gibt es keine Mehrfachauswahl', () => {
    const gesendet = laufenLassen({ modus: 'bearbeiten', mobil: true })
    id('text').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ctrlKey: true }))
    expect(gesendet).toHaveBeenLastCalledWith({ wkWaehle: 'k0-e0' }, '*')
  })

  it('bei mehreren gewählten Blöcken zeigt die Leiste die Anzahl und die Sammel-Aktionen; alle Blöcke sind gerahmt', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e1', name: 'x', mehr: ['k0-e0', 'k0-e1'] })
    expect(document.querySelector('.wk-typ')!.textContent).toBe('2 Blöcke ausgewählt')
    expect(sichtbar()).toEqual(['griff', 'kopiere', 'dupliziere', 'menue', 'loesche'])
    expect([...document.querySelectorAll('.wk-aktiv')].map((e) => e.getAttribute('data-wk'))).toEqual(['k0-e0', 'k0-e1'])
    expect(aktion('loesche').getAttribute('aria-label')).toBe('Ausgewählte Blöcke löschen')
    aktion('kopiere').click()
    expect(gesendet).toHaveBeenCalledWith({ wkKopiere: 'k0-e1' }, '*')
    // eine Liste mit nur einem Eintrag oder Fremdem ist keine Mehrfachauswahl
    vomEditor({ wk: 'k0-e1', name: 'x', mehr: ['k0-e1', 'abschluss', '"><b>'] })
    expect(document.querySelectorAll('.wk-aktiv')).toHaveLength(1)
    expect(sichtbar()).not.toContain('kopiere')
  })

  it('am Handy: „Nach oben/unten“ in der festen Leiste, kein Ziehgriff', () => {
    const gesendet = laufenLassen({ modus: 'bearbeiten', mobil: true })
    vomEditor({ wk: 'k0-e1', name: 'x' })
    expect(sichtbar()).toEqual(['bearbeite', 'einfuegen', 'hoch', 'runter', 'dupliziere', 'menue', 'loesche'])
    aktion('runter').click()
    expect(gesendet).toHaveBeenLastCalledWith({ wkTaste: 'ArrowDown', mod: false, shift: false, alt: true }, '*')
  })

  it('schreibgeschützt: Kopieren bei mehreren Blöcken ja, Ziehen und Ändern nein', () => {
    laufenLassen({ modus: 'bearbeiten', lesen: true })
    vomEditor({ wk: 'k0-e1', name: 'x', mehr: ['k0-e0', 'k0-e1'] })
    expect(sichtbar()).toEqual(['kopiere'])
  })

  it('Ziehen am Griff: ein einziger Wunsch am Ende, mit der nächsten Stelle', () => {
    const gesendet = laufenLassen()
    lageSetzen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 5, clientY: 150 }))
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(true)
    expect(document.querySelector('[data-wk="k0-e1"]')!.classList.contains('wk-zieht')).toBe(true)
    maus('pointermove', { clientX: 5, clientY: 22 })
    maus('pointermove', { clientX: 5, clientY: 102 })
    expect(gesendet).not.toHaveBeenCalled()
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledTimes(1)
    // k0-e1 selbst ist gesperrt; am nächsten liegt das Ende von k0-e0
    expect(gesendet).toHaveBeenCalledWith({ wkLege: 'k0-e0', wo: 'nach' }, '*')
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
    expect(document.querySelector('.wk-zieht')).toBeNull()
  })

  it('Ziehen an den Anfang eines Themas meldet „anfang“', () => {
    const gesendet = laufenLassen()
    lageSetzen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
    maus('pointermove', { clientY: 21 })
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledWith({ wkLege: 'k0', wo: 'anfang' }, '*')
  })

  it('Esc bricht das Ziehen ab: nichts wird gemeldet, nichts bleibt markiert', () => {
    const gesendet = laufenLassen()
    lageSetzen()
    vomEditor({ wk: 'k0-e1', name: 'x' })
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 150 }))
    maus('pointermove', { clientY: 102 })
    taste('Escape')
    maus('pointerup', {})
    expect(gesendet).not.toHaveBeenCalled()
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
    expect(document.querySelector('.wk-zieht')).toBeNull()
  })

  it('ein Thema wird am Griff gezogen und vor ein anderes Thema oder ans Ende gelegt', () => {
    const gesendet = laufenLassen()
    lageSetzen()
    vomEditor({ wk: 'k0', name: 'Thema' })
    expect(sichtbar()).toContain('griff')
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 5 }))
    maus('pointermove', { clientY: 290 })
    maus('pointerup', {})
    expect(gesendet).toHaveBeenCalledWith({ wkLegeThema: 'abschluss' }, '*')
  })

  it('ohne Auswahl und im Modus Ausprobieren gibt es kein Ziehen', () => {
    const gesendet = laufenLassen({ modus: 'ausprobieren' })
    lageSetzen()
    aktion('griff').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientY: 5 }))
    maus('pointerup', {})
    expect(gesendet).not.toHaveBeenCalled()
    expect(document.body.classList.contains('wk-zieht-aktiv')).toBe(false)
  })

  it('gibt ⌘/Strg + C, X, V und Alt + Pfeil weiter – C und X nur mit Auswahl, V auch ohne', () => {
    const gesendet = laufenLassen()
    taste('c', { ctrlKey: true })
    taste('x', { ctrlKey: true })
    taste('ArrowDown', { altKey: true })
    expect(gesendet).not.toHaveBeenCalled()
    taste('v', { metaKey: true })
    expect(gesendet).toHaveBeenLastCalledWith({ wkTaste: 'v', mod: true, shift: false, alt: false }, '*')
    gesendet.mockClear()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    taste('c', { ctrlKey: true })
    taste('x', { metaKey: true })
    const e = taste('ArrowUp', { altKey: true })
    expect(e.defaultPrevented).toBe(true)
    expect(gesendet.mock.calls.map((c) => c[0])).toEqual([
      { wkTaste: 'c', mod: true, shift: false, alt: false },
      { wkTaste: 'x', mod: true, shift: false, alt: false },
      { wkTaste: 'ArrowUp', mod: false, shift: false, alt: true },
    ])
  })

  it('in Eingabefeldern bleiben ⌘/Strg + C, X, V beim Feld', () => {
    const gesendet = laufenLassen()
    vomEditor({ wk: 'k0-e0', name: 'x' })
    const feld = document.createElement('input')
    document.body.appendChild(feld)
    for (const k of ['c', 'x', 'v']) feld.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(gesendet).not.toHaveBeenCalled()
  })
})
