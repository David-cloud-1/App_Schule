import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { mitSprungSkript } from './vorschau-skript'
import { SCHREIBWERK_CODE } from './schreibwerk/schreibwerk-bundle.generated'

/** Hilfsskript: direkt in der Seite schreiben (PROJ-103) – Auslöser, Einfach-Schreiber, Zusammenspiel mit der Seite */

const angehaengt: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = []

function laufenLassen() {
  document.head.innerHTML = ''
  document.body.innerHTML =
    '<div data-wk="deckblatt"><h1 id="titel">Mein Titel</h1><p class="unter" id="unter">Untertitel</p></div>' +
    '<h2 data-wk="k0" id="kapitel">Thema</h2>' +
    '<section class="inhalt" data-wk="k0-e0"><div class="lehrtext" id="lehr"><p id="absatz">Gebauter Text</p></div></section>' +
    '<section class="inhalt" data-wk="k0-e1"><figure class="bild"><p class="bildunterschrift" id="unterschrift">Abbildung 1</p></figure></section>' +
    '<section class="aufgabe" data-wk="k0-e2"><button id="aufgabe">Prüfen</button></section>' +
    '<h2 data-wk="abschluss" id="abschlusskapitel">Lernzielkontrolle</h2>'
  const code = mitSprungSkript('<body></body>').match(/<script>([\s\S]*)<\/script>/)![1]
  Element.prototype.scrollIntoView = vi.fn()
  const gesendet = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
  const original = window.addEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation((t: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
    angehaengt.push([t, f, o])
    original(t, f, o)
  })
  new Function(code)()
  gesendet.mockClear()
  return gesendet
}

function vomEditor(daten: unknown) {
  fireEvent(window, new MessageEvent('message', { data: daten, source: window }))
}
function klick(el: Element, detail = 1) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
}
/** Die App schickt den Code; das Testfenster führt eingefügte Skripte nicht aus, ein Browser schon – das spielt der Test nach */
function werkLaden() {
  vomEditor({ wkSchreibwerk: SCHREIBWERK_CODE })
  expect(document.head.querySelector('script')?.textContent).toBe(SCHREIBWERK_CODE)
  new Function(SCHREIBWERK_CODE)()
}
const id = (n: string) => document.getElementById(n)!

afterEach(() => {
  for (const [t, f, o] of angehaengt) window.removeEventListener(t, f, o)
  angehaengt.length = 0
  delete (window as { __wkSchreibwerk?: unknown }).__wkSchreibwerk
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('Schreiben: Auslöser in der Seite', () => {
  it('Doppelklick auf Lehrtext, Überschrift, Deckblatt und Bildunterschrift wünscht das Schreiben', () => {
    const gesendet = laufenLassen()
    klick(id('absatz'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'k0-e0', teil: 'text' }, '*')
    klick(id('kapitel'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'k0', teil: 'kapitel' }, '*')
    klick(id('titel'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'deckblatt', teil: 'titel' }, '*')
    klick(id('unter'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'deckblatt', teil: 'untertitel' }, '*')
    klick(id('unterschrift'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'k0-e1', teil: 'unterschrift' }, '*')
  })

  it('ein einzelner Klick wählt zuerst aus, der nächste Klick auf den gewählten Text schreibt', () => {
    const gesendet = laufenLassen()
    klick(id('absatz'))
    expect(gesendet).toHaveBeenCalledWith({ wkWaehle: 'k0-e0' }, '*')
    expect(gesendet).not.toHaveBeenCalledWith(expect.objectContaining({ wkSchreibe: expect.anything() }), '*')
    vomEditor({ wk: 'k0-e0', name: 'Text', mehr: [] })
    gesendet.mockClear()
    klick(id('absatz'))
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibe: 'k0-e0', teil: 'text' }, '*')
  })

  it('Aufgaben und die Lernzielkontrolle öffnen weiter nur das Formular', () => {
    const gesendet = laufenLassen()
    klick(id('aufgabe'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkBearbeite: 'k0-e2' }, '*')
    klick(id('abschlusskapitel'), 2)
    expect(gesendet).toHaveBeenCalledWith({ wkBearbeite: 'abschluss' }, '*')
    expect(gesendet).not.toHaveBeenCalledWith(expect.objectContaining({ wkSchreibe: expect.anything() }), '*')
  })

  it('schreibgeschützt: kein Schreiben', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkZustand: { modus: 'bearbeiten', lesen: true, mobil: false, leer: [] } })
    gesendet.mockClear()
    klick(id('absatz'), 2)
    expect(gesendet).not.toHaveBeenCalledWith(expect.objectContaining({ wkSchreibe: expect.anything() }), '*')
  })
})

describe('Schreiben: Einfach-Schreiber (Überschrift, Deckblatt, Bildunterschrift)', () => {
  it('macht das Element beschreibbar, Enter beendet und meldet den Text; Zwischenstand nach Pause', () => {
    vi.useFakeTimers()
    try {
      const gesendet = laufenLassen()
      vomEditor({ wkSchreibStart: { marke: 'k0', teil: 'kapitel' } })
      const h = id('kapitel')
      expect(h.getAttribute('contenteditable')).toBe('true')
      expect(document.body.classList.contains('wk-schreibt')).toBe(true)
      h.textContent = 'Neue   Überschrift'
      h.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(2100)
      expect(gesendet).toHaveBeenCalledWith({ wkSchreibZwischen: 'k0', teil: 'kapitel', html: 'Neue Überschrift' }, '*')
      h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0', teil: 'kapitel', html: 'Neue Überschrift' }, '*')
      expect(h.getAttribute('contenteditable')).toBe('false')
      expect(document.body.classList.contains('wk-schreibt')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('PROJ-118: einzeilige Texte bekommen dieselbe Leiste (Name, Hinweis, „Fertig“); „Fertig“ beendet, danach ist sie weg', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0', teil: 'kapitel' } })
    const leiste = document.querySelector<HTMLElement>('[role="toolbar"].wk-el')!
    expect(leiste.getAttribute('aria-label')).toBe('Thema bearbeiten')
    expect(leiste.querySelector('.wk-el-name')?.textContent).toBe('Thema')
    expect(leiste.querySelector('.wk-el-hinweis')?.textContent).toBe('Enter = Fertig')
    // Die Leiste steht direkt über dem Element
    expect(leiste.nextElementSibling).toBe(id('kapitel'))
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    leiste.dispatchEvent(md)
    expect(md.defaultPrevented).toBe(true)
    klick(leiste.querySelector('.wk-el-fertig')!)
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0', teil: 'kapitel', html: 'Thema' }, '*')
    expect(document.querySelector('.wk-el')).toBeNull()
  })

  it('PROJ-118: Deckblatt und Bildunterschrift heißen in der Leiste so', () => {
    laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'deckblatt', teil: 'titel' } })
    expect(document.querySelector('.wk-el .wk-el-name')?.textContent).toBe('Deckblatt')
    vomEditor({ wkSchreibBeende: true })
    vomEditor({ wkSchreibStart: { marke: 'k0-e1', teil: 'unterschrift' } })
    expect(document.querySelector('.wk-el .wk-el-name')?.textContent).toBe('Bildunterschrift')
  })

  it('Esc beendet ebenfalls, Enter fügt keinen Zeilenumbruch ein', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0-e1', teil: 'unterschrift' } })
    const ereignis = new Event('beforeinput', { cancelable: true }) as Event & { inputType?: string }
    ereignis.inputType = 'insertParagraph'
    id('unterschrift').dispatchEvent(ereignis)
    expect(ereignis.defaultPrevented).toBe(true)
    id('unterschrift').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0-e1', teil: 'unterschrift', html: 'Abbildung 1' }, '*')
  })

  it('Tasten im Schreibfeld gehen nicht an die App (Rückgängig gilt im Text)', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'deckblatt', teil: 'titel' } })
    gesendet.mockClear()
    const e = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    id('titel').dispatchEvent(e)
    expect(gesendet).not.toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(false)
  })

  it('ein Klick außerhalb beendet das Schreiben und wählt nichts aus', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0', teil: 'kapitel' } })
    gesendet.mockClear()
    klick(id('aufgabe'))
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0', teil: 'kapitel', html: 'Thema' }, '*')
    expect(gesendet).not.toHaveBeenCalledWith({ wkWaehle: 'k0-e2' }, '*')
  })

  it('„Vorbei“ gibt das Element wieder frei; „Beende“ vom Editor beendet auch', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0', teil: 'kapitel' } })
    vomEditor({ wkSchreibBeende: true })
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0', teil: 'kapitel', html: 'Thema' }, '*')
    vomEditor({ wkSchreibVorbei: true })
    expect(id('kapitel').getAttribute('contenteditable')).toBe('false')
  })

  it('ohne passendes Element oder im Modus Ausprobieren: Abbruch statt Schreiben', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0-e0', teil: 'unterschrift' } })
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibAbbruch: 'k0-e0' }, '*')
    vomEditor({ wkZustand: { modus: 'ausprobieren', lesen: false, mobil: false, leer: [] } })
    gesendet.mockClear()
    vomEditor({ wkSchreibStart: { marke: 'k0', teil: 'kapitel' } })
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibAbbruch: 'k0' }, '*')
  })
})

describe('Schreiben: Lehrtext mit dem nachgeladenen Schreibwerk', () => {
  it('ohne Schreibwerk gibt es einen Abbruch; mit Schreibwerk erscheint die Schreib-Fassung', () => {
    const gesendet = laufenLassen()
    vomEditor({ wkSchreibStart: { marke: 'k0-e0', teil: 'text', html: '<p>Gespeichert</p>' } })
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibAbbruch: 'k0-e0' }, '*')
    gesendet.mockClear()

    werkLaden()
    vomEditor({ wkSchreibStart: { marke: 'k0-e0', teil: 'text', html: '<p>Gespeichert</p>' } })
    expect(id('lehr').querySelector('.ProseMirror')?.textContent).toBe('Gespeichert')
    expect(document.body.classList.contains('wk-schreibt')).toBe(true)

    // Fertig → Endstand an die App, danach ist die Seite wieder bedienbar
    id('lehr').querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    expect(gesendet).toHaveBeenCalledWith({ wkSchreibEnde: 'k0-e0', teil: 'text', html: '<p>Gespeichert</p>' }, '*')
    expect(document.body.classList.contains('wk-schreibt')).toBe(false)

    // Die App sagt „nichts geändert“: gebaute Fassung kommt zurück
    vomEditor({ wkSchreibVorbei: true })
    expect(id('lehr').querySelector('.ProseMirror')).toBeNull()
    expect(id('absatz').style.display).toBe('')
  })

  it('ein Klick in den Schreibtext wird nicht abgefangen (Cursor setzen, Formatleiste)', () => {
    laufenLassen()
    werkLaden()
    vomEditor({ wkSchreibStart: { marke: 'k0-e0', teil: 'text', html: '<p>Text</p>' } })
    const gesendet = vi.mocked(window.postMessage)
    gesendet.mockClear()
    const e = new MouseEvent('auxclick', { bubbles: true, cancelable: true })
    id('lehr').querySelector('.ProseMirror')!.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
    klick(id('lehr').querySelector('.ProseMirror p')!)
    expect(gesendet).not.toHaveBeenCalled()
  })
})
