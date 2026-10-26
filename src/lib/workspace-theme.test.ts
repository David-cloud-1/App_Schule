import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKSPACE_THEME, parseSidebarOpen, parseWorkspaceTheme } from './workspace-theme'

type Rgb = [number, number, number]

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

/** Liest alle `--ws-*`-Tokens aus dem ersten Block nach `selector` */
function tokensAfter(selector: string): Record<string, Rgb> {
  const start = css.indexOf(selector)
  expect(start, `Block ${selector} fehlt in globals.css`).toBeGreaterThan(-1)
  const block = css.slice(start, css.indexOf('}', start))
  const tokens: Record<string, Rgb> = {}
  for (const m of block.matchAll(/--ws-([a-z-]+):\s*(\d+) (\d+) (\d+);/g)) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])]
  }
  return tokens
}

/** Alle .tsx-Dateien unter `dir` (rekursiv), relativ zum Projekt */
function tsxFiles(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = `${dir}/${name}`
    if (statSync(join(process.cwd(), path)).isDirectory()) return tsxFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

function luminance([r, g, b]: Rgb): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** Farbe `fg` mit Deckkraft `alpha` über `bg` (wie Tailwind `bg-ws-green/20`) */
function tint(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha))) as Rgb
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const dark = tokensAfter(':root {\n    --ws-bg')
const light = tokensAfter('html:has(.ws-root[data-ws-theme="light"])')
const system = tokensAfter('html:has(.ws-root[data-ws-theme="system"])')

const TEXT_TOKENS = ['text', 'muted', 'faint', 'green', 'blue', 'red', 'orange', 'gold']
const SURFACES = ['bg', 'surface']
const FILLS = ['green', 'green-hover', 'blue', 'blue-hover', 'red', 'red-hover', 'orange', 'gold']
const ACCENTS = ['green', 'blue', 'red', 'orange', 'gold']

/** Stärkste erlaubte Tönung hinter gleichfarbigem Text (Pills, Hinweise) — siehe docs/DESIGN.md */
const MAX_TINT: Record<string, number> = { green: 20, blue: 20, orange: 20, gold: 20, red: 15 }

describe.each([
  ['dunkel', dark],
  ['hell', light],
])('Kontraste im Lehrkräfte-Bereich (%s, WCAG 2.1 AA)', (_mode, tokens) => {
  it.each(TEXT_TOKENS.flatMap((t) => SURFACES.map((s) => [t, s])))(
    'Text „%s“ auf „%s“ erreicht mindestens 4,5 : 1',
    (text, surface) => {
      expect(contrast(tokens[text], tokens[surface])).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(FILLS)('Schrift auf gefüllter Fläche „%s“ erreicht mindestens 4,5 : 1', (fill) => {
    expect(contrast(tokens['on-accent'], tokens[fill])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ACCENTS.flatMap((c) => SURFACES.map((s) => [c, s])))(
    'getönte Pill „%s“ auf „%s“ erreicht bei stärkster erlaubter Tönung 4,5 : 1',
    (accent, surface) => {
      const bg = tint(tokens[accent], tokens[surface], MAX_TINT[accent] / 100)
      expect(contrast(tokens[accent], bg)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('gedämpfter Text bleibt auch auf Hover-Flächen lesbar', () => {
    expect(contrast(tokens.muted, tokens.raised)).toBeGreaterThanOrEqual(4.5)
  })

  it('Ränder heben sich von der Fläche ab', () => {
    expect(contrast(tokens.line, tokens.surface)).toBeGreaterThan(1.2)
  })
})

describe('Farb-Schicht', () => {
  it('beide Modi definieren dieselben Tokens', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort())
  })

  it('„Wie System“ nutzt im hellen Systemschema exakt die hellen Werte', () => {
    expect(system).toEqual(light)
  })
})

describe('Tönungen im Lehrkräfte-Bereich', () => {
  it('überschreiten hinter gleichfarbigem Text nie die erlaubte Stärke', () => {
    const files = [...tsxFiles('src/app/admin'), ...tsxFiles('src/components/admin'), 'src/components/difficulty-badge.tsx']
    expect(files.length).toBeGreaterThan(30)
    const tooStrong: string[] = []
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      for (const literal of source.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []) {
        for (const m of literal.matchAll(/(?<![\w:-])bg-ws-([a-z]+)\/(\d+)/g)) {
          const [, accent, alpha] = m
          const sameText = new RegExp(`(?<![\\w:-])text-ws-${accent}(?![\\w-])`).test(literal)
          if (sameText && accent in MAX_TINT && Number(alpha) > MAX_TINT[accent]) tooStrong.push(`${file}: ${m[0]}`)
        }
      }
    }
    expect(tooStrong).toEqual([])
  })
})

describe('Bedienbarkeit (QA BUG-2/BUG-3)', () => {
  it('vergrößert Buttons auf Touch-Geräten auf mindestens 44 px, ohne Checkboxen und Schalter', () => {
    const block = css.slice(css.indexOf('@media (pointer: coarse)'))
    expect(block).toContain('min-height: 2.75rem')
    expect(block).toContain('min-width: 2.75rem')
    expect(block).toMatch(/:not\(\[role="checkbox"\]\):not\(\[role="switch"\]\)/)
  })

  it('lässt aufgeklappte Detailzeilen (colspan) nicht als feste Spalte stehen', () => {
    expect(css).toContain('.ws-table-sticky :is(th, td):first-child:not([colspan])')
  })
})

describe('parseWorkspaceTheme', () => {
  it('übernimmt gültige Werte', () => {
    expect(parseWorkspaceTheme('light')).toBe('light')
    expect(parseWorkspaceTheme('system')).toBe('system')
    expect(parseWorkspaceTheme('dark')).toBe('dark')
  })

  it('fällt bei fehlendem oder fremdem Wert auf dunkel zurück', () => {
    expect(DEFAULT_WORKSPACE_THEME).toBe('dark')
    expect(parseWorkspaceTheme(undefined)).toBe('dark')
    expect(parseWorkspaceTheme('pink')).toBe('dark')
  })
})

describe('parseSidebarOpen', () => {
  it('ist ohne Cookie ausgeklappt und nur bei „false“ eingeklappt', () => {
    expect(parseSidebarOpen(undefined)).toBe(true)
    expect(parseSidebarOpen('true')).toBe(true)
    expect(parseSidebarOpen('false')).toBe(false)
  })
})
