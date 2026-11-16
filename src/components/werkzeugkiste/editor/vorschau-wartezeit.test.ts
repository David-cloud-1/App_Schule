import { describe, expect, it } from 'vitest'
import { vorschauWartezeit } from '@/components/werkzeugkiste/editor/use-editor-zustand'

describe('vorschauWartezeit (PROJ-112)', () => {
  it('wartet ohne Messwert die Grundzeit', () => {
    expect(vorschauWartezeit(0)).toBe(1500)
    expect(vorschauWartezeit(NaN)).toBe(1500)
  })
  it('bleibt bei schnellen Bauten bei der Grundzeit', () => {
    expect(vorschauWartezeit(1200)).toBe(1500)
  })
  it('wartet nach langsamen Bauten die halbe Bauzeit', () => {
    expect(vorschauWartezeit(6000)).toBe(3000)
  })
  it('wartet nie länger als fünf Sekunden', () => {
    expect(vorschauWartezeit(60_000)).toBe(5000)
  })
})
