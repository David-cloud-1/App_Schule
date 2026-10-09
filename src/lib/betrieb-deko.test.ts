import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { betriebSpriteSchluessel, getBetriebSprite, hatBetriebSprite } from './betrieb-sprites'
import { getHofIconSet, iconKeyBelongsToCategory } from './hof-icons'
import { SPEDITION_DEKO } from './hof-welt/spedition-deko'
import { RESORT_DEKO } from './hof-welt/resort-deko'
import { LAND_MAX } from './betrieb-land'

const SQL = readFileSync(join(process.cwd(), 'supabase/migrations/20261009_proj36_mehr_deko.sql'), 'utf8')

interface Zeile { name: string; key: string; category: string; price: number }

/** Liest die VALUES-Zeilen des Abschnitts für einen Fachbereich aus der Migration. */
function zeilen(code: 'SPED' | 'TOUR'): Zeile[] {
  const teil = SQL.split('INSERT INTO shop_items').find((t) => t.includes(`d.code = '${code}'`))!
  const out: Zeile[] = []
  for (const m of teil.matchAll(/\(\s*'([^']+)',\s*'[^']*',\s*'[^']*',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+)\)/g)) {
    out.push({ name: m[1]!, key: m[2]!, category: m[3]!, price: Number(m[4]) })
  }
  return out
}

describe('Deko-Erweiterung (PROJ-36)', () => {
  for (const [code, deko] of [['SPED', SPEDITION_DEKO], ['TOUR', RESORT_DEKO]] as const) {
    describe(code, () => {
      const rows = zeilen(code)

      it('has at least 20 new items, each with a sprite and a flat icon in its own department set', () => {
        expect(deko.length).toBeGreaterThanOrEqual(20)
        const flach = new Set(getHofIconSet(code).map((i) => i.key))
        for (const d of deko) {
          expect(hatBetriebSprite(code, d.key), `Sprite ${d.key}`).toBe(true)
          expect(getBetriebSprite(code, d.key).platzhalter).toBe(false)
          expect(flach.has(d.key), `flaches Icon ${d.key}`).toBe(true)
        }
      })

      it('keeps the server check working: every new key belongs to its category in its own set', () => {
        for (const d of deko) expect(iconKeyBelongsToCategory(code, d.category, d.key), d.key).toBe(true)
      })

      it('has a matching migration row for every sprite (same key and category, no extras)', () => {
        expect(rows.length).toBe(deko.length)
        const nachKey = new Map(rows.map((r) => [r.key, r]))
        for (const d of deko) {
          const r = nachKey.get(d.key)
          expect(r, `Migration ohne ${d.key}`).toBeTruthy()
          expect(r!.category).toBe(d.category)
        }
      })

      it('prices stay within 15–200 and at least 8 items cost 60 or less', () => {
        for (const r of rows) {
          expect(r.price).toBeGreaterThanOrEqual(15)
          expect(r.price).toBeLessThanOrEqual(200)
        }
        expect(rows.filter((r) => r.price <= 60).length).toBeGreaterThanOrEqual(8)
      })

      it('has unique item names in the migration', () => {
        expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length)
      })
    })
  }

  it('shares no icon key between the departments (no ambiguous meaning)', () => {
    const sped = new Set(betriebSpriteSchluessel('SPED'))
    expect(betriebSpriteSchluessel('TOUR').filter((k) => sped.has(k))).toEqual([])
  })

  it('keeps each catalogue within the largest land (everything can be placed)', () => {
    for (const code of ['SPED', 'TOUR']) expect(betriebSpriteSchluessel(code).length).toBeLessThanOrEqual(LAND_MAX * LAND_MAX)
  })

  it('does not touch existing items: the migration only inserts, and only when the name is free', () => {
    expect(SQL).not.toMatch(/\bUPDATE\b|\bDELETE\b|\bDROP\b/i)
    expect(SQL.match(/NOT EXISTS/g)?.length).toBe(2)
  })
})
