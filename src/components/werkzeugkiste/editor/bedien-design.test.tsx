import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderInWorkspace } from '@/components/admin/workspace-test-utils'
import { BEDIEN_FARBEN, BEDIEN_MASSE } from '@/components/werkzeugkiste/editor/bedien-design'
import { BLOCK_LEISTE, ELEMENT_LEISTE, FERTIG, KASTEN, TEXT_KNOEPFE } from '@/components/werkzeugkiste/editor/bedien-woerter'
import { starteSchreiben } from '@/components/werkzeugkiste/editor/schreibwerk/eintritt'
import { starteAufgabe } from '@/components/werkzeugkiste/editor/aufgabenwerk/eintritt'
import { SCHREIB_FARBEN } from '@/components/werkzeugkiste/editor/schreibwerk/schreib-design'
import { AW_FARBEN } from '@/components/werkzeugkiste/editor/aufgabenwerk/design'
import { LEISTE_FARBEN } from '@/components/werkzeugkiste/editor/vorschau-skript'
import { TextEditor } from '@/components/werkzeugkiste/editor/text-editor'

/**
 * Wächtertest PROJ-117: Vorschau (Block-Leiste, Schreibwerk, Aufgabenwerk) und Schublade lesen
 * Farben, Wörter und Reihenfolge aus EINER Quelle. Er ist unabhängig vom Frische-Test der Bündel.
 */

const ORDNER = path.resolve(__dirname)
const lies = (datei: string) => readFileSync(path.join(ORDNER, datei), 'utf8')

function helligkeit(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
function kontrast(a: string, b: string): number {
  const [x, y] = [helligkeit(a), helligkeit(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('Bedien-Design: eine Farbquelle', () => {
  it('Block-Leiste, Schreibwerk und Aufgabenwerk verwenden dieselben Farben', () => {
    expect(LEISTE_FARBEN).toBe(BEDIEN_FARBEN)
    expect(SCHREIB_FARBEN).toBe(BEDIEN_FARBEN)
    expect(AW_FARBEN.blau).toBe(BEDIEN_FARBEN.akzent)
    expect(AW_FARBEN.blauText).toBe(BEDIEN_FARBEN.text)
    expect(AW_FARBEN.grund).toBe(BEDIEN_FARBEN.grund)
    expect(AW_FARBEN.feldGrund).toBe(BEDIEN_FARBEN.hoverGrund)
    expect(AW_FARBEN.rot).toBe(BEDIEN_FARBEN.gefahr)
  })

  it('alle Farbpaare erreichen mindestens 4,5 : 1', () => {
    const F = BEDIEN_FARBEN
    const paare: Array<[string, string]> = [
      [F.text, F.grund],
      [F.text, F.hoverGrund],
      [F.text, F.aktivGrund],
      [F.textTyp, F.grund],
      [F.gefahr, F.gefahrGrund],
      [F.gefahr, F.gefahrHover],
      [F.akzentText, F.akzent],
      [F.akzentText, F.text],
      [F.hinweis, F.hinweisGrund],
      [F.leerText, F.leerGrund],
    ]
    for (const [vorn, grund] of paare) expect(kontrast(vorn, grund), `${vorn} auf ${grund}`).toBeGreaterThanOrEqual(4.5)
  })

  it('Touch-Knöpfe sind mindestens 44 px', () => {
    expect(BEDIEN_MASSE.knopfTouch).toBeGreaterThanOrEqual(44)
  })

  // Jede feste Farbe in den drei Stellen muss aus der Quelle stammen oder auf der benannten Liste
  // der Ausnahmen stehen: Papier-Farben der Boxen, Inhaltsfarben (grün/orange), Grautöne, Weiß/Schwarz.
  const AUSNAHMEN = new Set(
    [
      // Papier (Boxen wie im Schuldesign)
      '#222222', '#095f90', '#c4bc96', '#1f497d', '#4f81bd', '#f0f7ee', '#eef4fb', '#faf7ee', '#7a6800', '#5a8a3c',
      '#f5faf0', '#3a6a20', '#d4870f', '#fdf5e6', '#a05c00', '#fdf9f0', '#3a50b0', '#eef0fb', '#c0392b', '#fff5f5',
      '#999999', '#555555', '#dddddd', '#26640c', '#e6e6e6', '#f2f9f0',
      // Inhaltsfarben im Aufgabenwerk und in der Seite (richtig = grün, Hinweis = orange)
      '#166534', '#dcfce7', '#bbf7d0', '#9a3412', '#fff7ed', '#16a34a', '#facc15',
      // Neutrale Linien und Schriften
      '#c9cfd8', '#e2e8f0', '#94a3b8', '#64748b', '#0f172a', '#111111', '#ffffff', '#000000',
    ].map((h) => h.toLowerCase()),
  )
  const ERLAUBT = new Set<string>([...AUSNAHMEN, ...Object.values(BEDIEN_FARBEN).map((h) => h.toLowerCase())])
  const voll = (h: string) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h)
  it.each(['vorschau-skript.ts', 'schreibwerk/schreib-design.ts', 'schreibwerk/eintritt.ts', 'aufgabenwerk/design.ts'])(
    'in %s steht keine eigene Bedien-Farbe fest im Code',
    (datei) => {
      const funde = (lies(datei).match(/#[0-9a-fA-F]{3,6}\b/g) ?? []).map((h) => voll(h.toLowerCase()))
      const fremd = funde.filter((h) => !ERLAUBT.has(h))
      expect(fremd, `${datei}: Farben nicht aus der Quelle`).toEqual([])
    },
  )
})

describe('Bedien-Wörter: Schreibwerk und Schublade zeigen dasselbe (PROJ-118: ganze Wörter)', () => {
  it('das Schreibwerk baut seine Knöpfe aus der Liste, ohne eigene Beschriftungen', () => {
    const quelle = lies('schreibwerk/eintritt.ts')
    for (const name of ['TEXT_KNOEPFE', 'KASTEN', 'FERTIG', 'ELEMENT_LEISTE']) expect(quelle).toContain(name)
    for (const k of TEXT_KNOEPFE) expect(quelle, `eigene Beschriftung ${k.lang}`).not.toContain(`'${k.lang}'`)
  })

  it('die Schublade zeigt Knöpfe, Reihenfolge und Wörter der Liste', async () => {
    renderInWorkspace(<TextEditor html="<p>Text</p>" onChange={() => {}} beschriftung="Lehrtext" />, { withSidebar: false })
    const leiste = await screen.findByRole('toolbar', { name: 'Textgestaltung' })
    const knoepfe = Array.from(leiste.querySelectorAll('button'))
    const sichtbar = knoepfe.slice(0, TEXT_KNOEPFE.length + 1)
    expect(sichtbar.slice(0, TEXT_KNOEPFE.length).map((b) => b.textContent)).toEqual(TEXT_KNOEPFE.map((k) => k.text))
    expect(sichtbar.slice(0, TEXT_KNOEPFE.length).map((b) => b.getAttribute('aria-label'))).toEqual(TEXT_KNOEPFE.map((k) => k.lang))
    expect(sichtbar[TEXT_KNOEPFE.length].textContent).toBe(KASTEN.einfuegen.text)
  })

  it('auf keinem Knopf steht ein Kürzel (F, K, H2, „Box …“ …)', () => {
    const woerter = [
      ...TEXT_KNOEPFE.map((k) => k.text),
      KASTEN.einfuegen.text,
      KASTEN.aendern.text,
      ...KASTEN.aktionen.map((a) => a.text),
      FERTIG.text,
      ELEMENT_LEISTE.html.text,
      ELEMENT_LEISTE.duplizieren.text,
      ELEMENT_LEISTE.loeschen.text,
      ELEMENT_LEISTE.mehr.text,
      BLOCK_LEISTE.bearbeiten.text,
      BLOCK_LEISTE.darunter.text,
      BLOCK_LEISTE.duplizieren.text,
      BLOCK_LEISTE.loeschen.text,
    ]
    for (const w of woerter) {
      expect(w, w).not.toMatch(/^(F|K|H\d|• Liste|1\. Liste|Box …|Diese Box …|Darunter)$/)
      expect(w.replace(/[ …]/g, '').length, w).toBeGreaterThanOrEqual(4)
    }
    expect(TEXT_KNOEPFE.map((k) => k.text)).toEqual(['Fett', 'Kursiv', 'Überschrift', 'Unterüberschrift', 'Aufzählung', 'Nummerierung', 'Link'])
  })

  it('das Aufgabenwerk nimmt „Fertig“ und die Leisten-Wörter aus der Liste', () => {
    const quelle = lies('aufgabenwerk/eintritt.ts')
    expect(quelle).toContain('FERTIG.text')
    expect(quelle).toContain('FERTIG.lang')
    expect(quelle).toContain('ELEMENT_LEISTE.')
    expect(quelle).not.toContain('>Fertig</button>')
    expect(quelle).not.toContain('wk-aw-fuss')
  })

  it('die Block-Leiste der Seite nimmt ihre Wörter aus der Liste', () => {
    const quelle = lies('vorschau-skript.ts')
    expect(quelle).toContain('BLOCK_LEISTE')
    expect(quelle).not.toContain('<span>Bearbeiten</span>')
    expect(quelle).not.toContain('<span>Darunter</span>')
    expect(quelle).not.toContain('<span>Duplizieren</span>')
  })
})

describe('Eine Leiste für alles (PROJ-118)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Schreibwerk, Aufgabenwerk und einzeilige Texte bauen ihre Leiste aus derselben Grundform', () => {
    for (const datei of ['schreibwerk/schreib-design.ts', 'aufgabenwerk/design.ts', 'vorschau-skript.ts']) {
      expect(lies(datei), datei).toContain('elementLeisteCss()')
    }
  })

  function aufbau(): { leiste: HTMLElement; ziel: HTMLElement } {
    const ziel = document.createElement('div')
    ziel.className = 'lehrtext'
    document.body.appendChild(ziel)
    starteSchreiben({ ziel, html: '<p>Hallo</p>', marke: 'k0-e0', klick: null, mobil: false, name: 'Lehrtext', melde: vi.fn() })
    return { leiste: ziel.querySelector<HTMLElement>('[role="toolbar"]')!, ziel }
  }

  it('Lehrtext: Name links, Wörter in der Mitte, „Fertig“ rechts', () => {
    const { leiste } = aufbau()
    expect(leiste.getAttribute('aria-label')).toBe(ELEMENT_LEISTE.name('Lehrtext'))
    expect(leiste.classList.contains('wk-el')).toBe(true)
    const kinder = Array.from(leiste.children) as HTMLElement[]
    expect(kinder[0].className).toBe('wk-el-name')
    expect(kinder[0].textContent).toBe('Lehrtext')
    expect(kinder[2].textContent).toBe(FERTIG.text)
    expect(kinder[2].classList.contains('wk-el-fertig')).toBe(true)
    const mitte = Array.from(kinder[1].querySelectorAll('button')).map((b) => b.textContent)
    expect(mitte).toEqual([...TEXT_KNOEPFE.map((k) => k.text), ELEMENT_LEISTE.html.text])
    expect(kinder[1].querySelector('select')?.options[0].textContent).toBe(KASTEN.einfuegen.text)
  })

  it('im Kasten heißt das eine Feld „Kasten ändern …“ (Art, darunter, entfernen, löschen)', () => {
    const ziel = document.createElement('div')
    document.body.appendChild(ziel)
    const s = starteSchreiben({ ziel, html: '<div class="merke"><p>Kasten</p></div>', marke: 'k0-e0', klick: null, mobil: false, melde: vi.fn() })
    s.editor.commands.setTextSelection(3)
    const feld = ziel.querySelector<HTMLSelectElement>('.wk-el-mitte select')!
    expect(feld.options[0].textContent).toBe(KASTEN.aendern.text)
    const gruppen = Array.from(feld.querySelectorAll('optgroup')).map((g) => g.label)
    expect(gruppen).toEqual([KASTEN.artGruppe, KASTEN.aktionGruppe])
    expect(Array.from(feld.querySelectorAll('optgroup')[1].querySelectorAll('option')).map((o) => o.textContent)).toEqual(KASTEN.aktionen.map((a) => a.text))
  })

  it('Aufgabe: dieselbe Leiste oben (Name, Duplizieren, Löschen, Mehr …, Fertig), keine Fußzeile, kein Schild', () => {
    const ziel = document.createElement('section')
    ziel.setAttribute('data-wk', 'k0-e0')
    ziel.innerHTML = '<div class="kopfzeile"><span class="marke">Aufgabe 1</span></div><p class="frage">Frage?</p>'
    document.body.appendChild(ziel)
    starteAufgabe({
      ziel,
      block: { type: 'multiple_choice', question: 'Frage?', options: ['A', 'B'], correct: 0 } as never,
      marke: 'k0-e0',
      typName: 'Einfachauswahl',
      eintrag: null,
      melde: () => {},
    })
    const leiste = ziel.querySelector<HTMLElement>('[role="toolbar"]')!
    expect(leiste.classList.contains('wk-el')).toBe(true)
    expect(leiste.getAttribute('aria-label')).toBe(ELEMENT_LEISTE.name('Einfachauswahl'))
    expect(leiste.querySelector('.wk-el-name')?.textContent).toBe('Einfachauswahl')
    const knoepfe = Array.from(leiste.querySelectorAll(':scope button')).map((b) => b.textContent)
    expect(knoepfe).toEqual([ELEMENT_LEISTE.duplizieren.text, ELEMENT_LEISTE.loeschen.text, ELEMENT_LEISTE.mehr.text, FERTIG.text])
    // Die Leiste steht vor dem Inhalt (oben), nicht danach
    expect(ziel.querySelector('.wk-aw')?.firstElementChild).toBe(leiste)
    expect(ziel.querySelector('.wk-aw-fuss')).toBeNull()
    expect(ziel.querySelector('.wk-aw-schild')).toBeNull()
  })

  it('Aufgabe am Handy: Leiste unten', () => {
    const ziel = document.createElement('section')
    ziel.setAttribute('data-wk', 'k0-e0')
    document.body.appendChild(ziel)
    starteAufgabe({
      ziel,
      block: { type: 'multiple_choice', question: 'Frage?', options: ['A', 'B'], correct: 0 } as never,
      marke: 'k0-e0',
      typName: 'Einfachauswahl',
      eintrag: null,
      mobil: true,
      melde: () => {},
    })
    expect(ziel.querySelector('[role="toolbar"]')?.classList.contains('wk-el-unten')).toBe(true)
  })
})
