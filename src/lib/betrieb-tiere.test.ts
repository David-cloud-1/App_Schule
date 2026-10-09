import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LEBEWESEN } from './betrieb-figuren'
import { getBetriebSprite, hatBetriebSprite } from './betrieb-sprites'
import { getHofIconSet, iconKeyBelongsToCategory } from './hof-icons'

const SQL = readFileSync(join(process.cwd(), 'supabase/migrations/20261009_proj37_tiere.sql'), 'utf8')

function zeilen(code: 'SPED' | 'TOUR') {
  const teil = SQL.split('INSERT INTO shop_items').find((t) => t.includes(`d.code = '${code}'`))!
  return [...teil.matchAll(/\(\s*'([^']+)',\s*'[^']*',\s*'[^']*',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+)\)/g)].map((m) => ({
    name: m[1]!,
    key: m[2]!,
    category: m[3]!,
    price: Number(m[4]),
  }))
}

describe('Tier-Items (PROJ-37)', () => {
  for (const code of ['SPED', 'TOUR'] as const) {
    it(`${code}: every animal has a Standbild sprite, a flat icon in its own set and a migration row`, () => {
      const keys = Object.keys(LEBEWESEN[code]!)
      const rows = zeilen(code)
      expect(rows.map((r) => r.key).sort()).toEqual([...keys].sort())
      const flach = new Set(getHofIconSet(code).map((i) => i.key))
      for (const k of keys) {
        expect(hatBetriebSprite(code, k), k).toBe(true)
        expect(getBetriebSprite(code, k).platzhalter).toBe(false)
        expect(flach.has(k), k).toBe(true)
      }
      for (const r of rows) expect(iconKeyBelongsToCategory(code, r.category as never, r.key)).toBe(true)
    })
  }

  it('has at least 3 animals in Spedition and 4 in Tourismus (acceptance criteria)', () => {
    expect(Object.keys(LEBEWESEN.SPED!).length).toBeGreaterThanOrEqual(3)
    expect(Object.keys(LEBEWESEN.TOUR!).length).toBeGreaterThanOrEqual(4)
  })

  it('animal keys are unique across departments (so the server can recognise them without a department lookup)', () => {
    const alle = [...Object.keys(LEBEWESEN.SPED!), ...Object.keys(LEBEWESEN.TOUR!)]
    expect(new Set(alle).size).toBe(alle.length)
  })

  it('prices are affordable (15–100) and the migration only inserts', () => {
    for (const r of [...zeilen('SPED'), ...zeilen('TOUR')]) {
      expect(r.price).toBeGreaterThanOrEqual(15)
      expect(r.price).toBeLessThanOrEqual(100)
    }
    expect(SQL).not.toMatch(/\bUPDATE\b|\bDELETE\b|\bDROP\b/i)
  })
})
