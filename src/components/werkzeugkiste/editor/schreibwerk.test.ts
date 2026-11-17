import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCHREIBWERK_CODE, SCHREIBWERK_STAND } from './schreibwerk/schreibwerk-bundle.generated'
import { SCHREIB_FARBEN } from './schreibwerk/schreib-design'
import { starteSchreiben } from './schreibwerk/eintritt'

/**
 * Schreibwerk (PROJ-103): Motor, der in der Vorschau-Seite läuft. Getestet wird der Quelltext direkt;
 * der gebaute Stand wird auf Aktualität und Größe geprüft.
 */

const wurzel = path.resolve(__dirname, '../../../..')
const QUELLEN = [
  'src/components/werkzeugkiste/editor/schreibwerk/eintritt.ts',
  'src/components/werkzeugkiste/editor/schreibwerk/schreib-design.ts',
  'src/components/werkzeugkiste/editor/text-erweiterungen.ts',
  'src/components/werkzeugkiste/editor/bedien-design.ts',
  'src/components/werkzeugkiste/editor/bedien-woerter.ts',
  'src/lib/werkzeugkiste-text.ts',
]

describe('Schreibwerk: gebautes Bündel', () => {
  it('passt zu den Quellen (sonst: npm run schreibwerk:bauen)', () => {
    const h = createHash('sha256')
    for (const q of QUELLEN) h.update(q).update(readFileSync(path.join(wurzel, q)))
    expect(SCHREIBWERK_STAND).toBe(h.digest('hex').slice(0, 16))
  })

  it('bleibt unter 700 KB und hat keine fremden Ladeadressen', () => {
    expect(SCHREIBWERK_CODE.length).toBeLessThan(700_000)
    expect(SCHREIBWERK_CODE).not.toMatch(/import\(["']https?:|<script\s+src=/i)
  })

  it('meldet sich im Fenster an', () => {
    new Function(SCHREIBWERK_CODE)()
    expect(typeof window.__wkSchreibwerk?.starte).toBe('function')
  })
})

describe('Schreibwerk: Formatleiste kontrastreich', () => {
  it('Farbpaare ≥ 4,5 : 1', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const k = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    expect(k(SCHREIB_FARBEN.text, SCHREIB_FARBEN.grund)).toBeGreaterThanOrEqual(4.5)
    expect(k(SCHREIB_FARBEN.text, SCHREIB_FARBEN.aktivGrund)).toBeGreaterThanOrEqual(4.5)
    expect(k(SCHREIB_FARBEN.hinweis, SCHREIB_FARBEN.hinweisGrund)).toBeGreaterThanOrEqual(4.5)
  })
})

function aufbau(html: string, mobil = false) {
  document.head.innerHTML = ''
  document.body.innerHTML = '<section data-wk="k0-e0"><div class="lehrtext"><p id="alt">Gebaute Fassung</p></div></section>'
  const ziel = document.querySelector<HTMLElement>('.lehrtext')!
  const melde = vi.fn()
  const s = starteSchreiben({ ziel, html, marke: 'k0-e0', klick: null, mobil, melde })
  return { ziel, melde, s }
}

afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

describe('Schreibwerk: Schreiben', () => {
  it('zeigt die gespeicherte Fassung statt der gebauten und stellt sie mit „ab“ wieder her', () => {
    const { ziel, s } = aufbau('<p>Gespeichert</p>')
    expect(ziel.querySelector('.ProseMirror')?.textContent).toBe('Gespeichert')
    expect(document.getElementById('alt')!.style.display).toBe('none')
    expect(ziel.querySelector('.wk-schreibzone')).not.toBeNull()
    s.ab()
    expect(ziel.querySelector('.wk-schreibzone')).toBeNull()
    expect(document.getElementById('alt')!.style.display).toBe('')
  })

  it('„Fertig“ meldet genau einen Endstand mit dem unveränderten Text, ohne ihn umzubauen', () => {
    const { ziel, melde } = aufbau('<p>Hallo <strong>Welt</strong></p><div class="merke"><p>Box</p></div>')
    ziel.querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    expect(melde).toHaveBeenCalledTimes(1)
    expect(melde).toHaveBeenCalledWith({ wkSchreibEnde: 'k0-e0', teil: 'text', html: '<p>Hallo <strong>Welt</strong></p><div class="merke"><p>Box</p></div>' })
    // (Der Text kommt exakt wie gespeichert zurück, auch wenn der Motor <p> in der Box anders schreiben würde)
  })

  it('Fett, Liste und Box wirken auf den markierten Text', () => {
    const { ziel, melde, s } = aufbau('<p>Hallo Welt</p>')
    s.editor.commands.selectAll()
    const fett = ziel.querySelector<HTMLButtonElement>('button[aria-label^="Fett"]')!
    fett.click()
    expect(fett.getAttribute('aria-pressed')).toBe('true')
    const box = ziel.querySelector<HTMLSelectElement>('select[aria-label^="Kasten einfügen"]')!
    box.value = 'art:tipp'
    box.dispatchEvent(new Event('change'))
    ziel.querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    const html = melde.mock.calls[0][0].html as string
    expect(html).toContain('<strong>Hallo Welt</strong>')
    expect(html).toContain('class="tipp"')
  })

  it('eine Box lässt sich auflösen, der Text bleibt', () => {
    const { ziel, melde, s } = aufbau('<div class="merke"><p>Inhalt</p></div>')
    s.editor.commands.focus('end')
    const aktion = ziel.querySelector<HTMLSelectElement>('select[aria-label="Diesen Kasten ändern"]')!
    aktion.value = 'aktion:aufloesen'
    aktion.dispatchEvent(new Event('change'))
    ziel.querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    const html = melde.mock.calls[0][0].html as string
    expect(html).not.toContain('merke')
    expect(html).toContain('Inhalt')
  })

  it('der Zwischenstand kommt erst nach einer Pause und nur bei echter Änderung', () => {
    vi.useFakeTimers()
    try {
      const { melde, s } = aufbau('<p>Hallo</p>')
      s.editor.commands.insertContent('X')
      vi.advanceTimersByTime(1000)
      expect(melde).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1500)
      expect(melde).toHaveBeenCalledTimes(1)
      expect(melde.mock.calls[0][0]).toMatchObject({ wkSchreibZwischen: 'k0-e0', teil: 'text' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('eine geschützte Insel bleibt im Endstand erhalten', () => {
    const insel = '<table style="border:1px solid red"><tr><td>A</td></tr></table>'
    const { ziel, melde } = aufbau(`<p>Text</p>${insel}`)
    expect(ziel.querySelector('.wk-erhalten')).not.toBeNull()
    ziel.querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    expect(melde.mock.calls[0][0].html).toContain(insel)
  })

  it('Handy: Leiste sitzt fest unten', () => {
    const { ziel } = aufbau('<p>x</p>', true)
    expect(ziel.querySelector('.wk-el')?.classList.contains('wk-el-unten')).toBe(true)
  })

  it('Esc beendet, danach meldet das Werk nichts mehr doppelt', () => {
    const { ziel, melde } = aufbau('<p>x</p>')
    const pm = ziel.querySelector('.ProseMirror') as HTMLElement
    pm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    ziel.querySelector<HTMLButtonElement>('.wk-el-fertig')!.click()
    expect(melde).toHaveBeenCalledTimes(1)
  })

  it('Link nur mit https:// oder mailto:', () => {
    const { ziel } = aufbau('<p>x</p>')
    ziel.querySelector<HTMLButtonElement>('button[aria-label^="Link einfügen"]')!.click()
    const feld = ziel.querySelector<HTMLInputElement>('.wk-fe input')!
    feld.value = 'javascript:alert(1)'
    ziel.querySelector<HTMLButtonElement>('button[aria-label="Link setzen"]')!.click()
    expect(ziel.querySelector('.wk-fh')?.textContent).toContain('https://')
  })
})
