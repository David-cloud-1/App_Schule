import { afterEach, describe, expect, it } from 'vitest'
import { kopiereBloecke, leereZwischenablage, liesZwischenablage, pruefeZwischenablage } from '@/components/werkzeugkiste/editor/block-zwischenablage'

const T = 1_800_000_000_000
const eintrag = (extra: Record<string, unknown> = {}) => ({ material: 'm1', nutzer: 'u1', am: T, bloecke: [{ type: 'text', content: 'x' }], ...extra })

afterEach(() => leereZwischenablage())

describe('Zwischenablage', () => {
  it('kopiert und liest für dieselbe Person', () => {
    expect(kopiereBloecke([{ type: 'text', content: 'a' }], 'm1', 'u1', T)).toBe('ok')
    expect(liesZwischenablage('u1', T + 1000)?.bloecke).toEqual([{ type: 'text', content: 'a' }])
  })
  it('verwirft sie bei einer anderen Person', () => {
    kopiereBloecke([{ type: 'text' }], 'm1', 'u1', T)
    expect(liesZwischenablage('u2', T)).toBeNull()
    // und räumt auf: auch die erste Person sieht nichts mehr
    expect(liesZwischenablage('u1', T)).toBeNull()
  })
  it('verwirft sie nach 7 Tagen', () => {
    expect(pruefeZwischenablage(eintrag(), 'u1', T + 6 * 86_400_000)).not.toBeNull()
    expect(pruefeZwischenablage(eintrag(), 'u1', T + 8 * 86_400_000)).toBeNull()
  })
  it('lehnt zu viele und zu große Auswahlen ab', () => {
    expect(kopiereBloecke(Array.from({ length: 51 }, () => ({ type: 'text' })), 'm1', 'u1', T)).toBe('zu-viele')
    expect(kopiereBloecke([{ type: 'text', content: 'x'.repeat(1_100_000) }], 'm1', 'u1', T)).toBe('zu-gross')
  })
  it('lehnt kaputte Einträge ab', () => {
    expect(pruefeZwischenablage(null, 'u1', T)).toBeNull()
    expect(pruefeZwischenablage(eintrag({ bloecke: [] }), 'u1', T)).toBeNull()
    expect(pruefeZwischenablage(eintrag({ bloecke: [1] }), 'u1', T)).toBeNull()
    expect(pruefeZwischenablage(eintrag({ bloecke: [{ kein: 'typ' }] }), 'u1', T)).toBeNull()
    expect(pruefeZwischenablage(eintrag({ am: T + 10 * 60_000 }), 'u1', T)).toBeNull()
  })
})
