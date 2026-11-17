import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderInWorkspace } from '@/components/admin/workspace-test-utils'
import { BEDIEN_FARBEN, BEDIEN_MASSE } from '@/components/werkzeugkiste/editor/bedien-design'
import { BOX_AKTION, BOX_WAHL, TEXT_KNOEPFE } from '@/components/werkzeugkiste/editor/bedien-woerter'
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

describe('Bedien-Wörter: Schreibwerk und Schublade zeigen dasselbe', () => {
  it('das Schreibwerk baut seine Knöpfe aus der Liste, ohne eigene Beschriftungen', () => {
    const quelle = lies('schreibwerk/eintritt.ts')
    expect(quelle).toContain('TEXT_KNOEPFE')
    expect(quelle).toContain('BOX_WAHL')
    expect(quelle).toContain('BOX_AKTION')
    expect(quelle).toContain('FERTIG')
    for (const k of TEXT_KNOEPFE) expect(quelle, `eigene Beschriftung ${k.lang}`).not.toContain(`'${k.lang}'`)
  })

  it('die Schublade zeigt Knöpfe, Reihenfolge und Wörter der Liste', async () => {
    renderInWorkspace(<TextEditor html="<p>Text</p>" onChange={() => {}} beschriftung="Lehrtext" />, { withSidebar: false })
    const leiste = await screen.findByRole('toolbar', { name: 'Textgestaltung' })
    const knoepfe = Array.from(leiste.querySelectorAll('button'))
    const sichtbar = knoepfe.slice(0, TEXT_KNOEPFE.length + 1)
    expect(sichtbar.slice(0, TEXT_KNOEPFE.length).map((b) => b.textContent)).toEqual(TEXT_KNOEPFE.map((k) => k.kurz))
    expect(sichtbar.slice(0, TEXT_KNOEPFE.length).map((b) => b.getAttribute('aria-label'))).toEqual(TEXT_KNOEPFE.map((k) => k.lang))
    expect(sichtbar[TEXT_KNOEPFE.length].textContent).toBe(BOX_WAHL.kurz)
    expect(BOX_AKTION.kurz).toBe('Diese Box …')
  })

  it('das Aufgabenwerk nimmt „Fertig“ aus der Liste', () => {
    const quelle = lies('aufgabenwerk/eintritt.ts')
    expect(quelle).toContain('FERTIG.kurz')
    expect(quelle).toContain('FERTIG.lang')
    expect(quelle).not.toContain('>Fertig</button>')
  })

  it('die Reihenfolge ist F, K, H2, H3, • Liste, 1. Liste, Link', () => {
    expect(TEXT_KNOEPFE.map((k) => k.kurz)).toEqual(['F', 'K', 'H2', 'H3', '• Liste', '1. Liste', 'Link'])
  })
})
