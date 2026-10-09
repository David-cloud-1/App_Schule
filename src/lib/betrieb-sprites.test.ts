import { describe, it, expect } from 'vitest'
import { betriebSpriteSchluessel, getBetriebSprite, hatBetriebSprite, SPRITE_SKALA } from './betrieb-sprites'
import { getHofIconSet } from './hof-icons'

const dekodiere = (url: string) => decodeURIComponent(url.slice('data:image/svg+xml,'.length))

describe('Sprite-Katalog Mein Betrieb (PROJ-34)', () => {
  const schluessel = betriebSpriteSchluessel('SPED')

  it('has a sprite for the first Spedition items', () => {
    expect(schluessel.length).toBeGreaterThanOrEqual(10)
    for (const k of ['lagerhalle', 'buerogebaeude', 'sattelschlepper-rot', 'container', 'pokal']) {
      expect(hatBetriebSprite('SPED', k)).toBe(true)
    }
  })

  it('every catalogue entry builds a valid, non-empty svg image', () => {
    for (const k of schluessel) {
      const s = getBetriebSprite('SPED', k)
      expect(s.platzhalter).toBe(false)
      expect(s.url.startsWith('data:image/svg+xml,')).toBe(true)
      expect(s.w).toBeGreaterThan(0)
      expect(s.h).toBeGreaterThan(0)
      expect(Number.isFinite(s.bottom)).toBe(true)
      const svg = dekodiere(s.url)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(/NaN|undefined/.test(svg)).toBe(false)
    }
  })

  it('uses only keys that exist in the flat icon set or are explicit extras (typo guard)', () => {
    const flach = new Set(getHofIconSet('SPED').map((i) => i.key))
    const extras = new Set(['scheune', 'baum', 'blumenwiese', 'blumenbeet', 'busch', 'kegel', 'wegweiser'])
    for (const k of schluessel) expect(flach.has(k) || extras.has(k)).toBe(true)
  })

  it('falls back to a placeholder for unknown keys, empty keys and unknown departments', () => {
    for (const [dept, key] of [['SPED', 'gibt-es-nicht'], ['SPED', ''], ['SPED', null], ['SPED', undefined], ['UNBEKANNT', 'pokal']] as const) {
      const s = getBetriebSprite(dept, key)
      expect(s.platzhalter).toBe(true)
      expect(s.url.startsWith('data:image/svg+xml,')).toBe(true)
    }
  })

  it('shows the placeholder for every Tourismus item until PROJ-35 delivers sprites', () => {
    expect(betriebSpriteSchluessel('TOUR')).toEqual([])
    expect(getBetriebSprite('TOUR', 'flugzeug').platzhalter).toBe(true)
  })

  it('does not hand out a Spedition sprite for a Tourismus key and vice versa', () => {
    expect(hatBetriebSprite('TOUR', 'pokal')).toBe(false)
    expect(hatBetriebSprite('SPED', 'flugzeug')).toBe(false)
  })

  it('returns the same cached sprite object for repeated lookups', () => {
    expect(getBetriebSprite('SPED', 'pokal')).toBe(getBetriebSprite('SPED', 'pokal'))
  })

  it('scales sprites with the shared factor', () => {
    expect(getBetriebSprite('SPED', 'pokal').skala).toBe(SPRITE_SKALA)
  })
})
