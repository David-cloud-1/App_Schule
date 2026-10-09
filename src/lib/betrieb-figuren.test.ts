import { describe, it, expect } from 'vitest'
import { AUTO_REGELN, LEBEWESEN, MAX_FIGUREN, hash, istLebewesen, planeFiguren, tierFigur, type FigurQuelle } from './betrieb-figuren'

const q = (id: string, icon_key: string, x: number | null = null, y: number | null = null): FigurQuelle => ({ id, name: `Item ${id}`, icon_key, x, y })

describe('Figuren-Regeln (PROJ-37)', () => {
  it('knows the animal items per department and nothing else', () => {
    expect(istLebewesen('SPED', 'hofhund')).toBe(true)
    expect(istLebewesen('TOUR', 'flamingo')).toBe(true)
    expect(istLebewesen('SPED', 'flamingo')).toBe(false)
    expect(istLebewesen('TOUR', 'hofhund')).toBe(false)
    expect(istLebewesen('SPED', 'pokal')).toBe(false)
    expect(istLebewesen('SPED', null)).toBe(false)
    expect(istLebewesen('UNBEKANNT', 'hofhund')).toBe(false)
    expect(tierFigur('SPED', 'huehner')).toBe('huhn')
  })

  it('animals walk without being placed and appear even when stored (x/y null)', () => {
    const plan = planeFiguren('SPED', [q('t1', 'hofhund')])
    expect(plan).toHaveLength(1)
    expect(plan[0]).toMatchObject({ id: 't1', art: 'hund', tier: true })
    expect(plan[0]!.heimat).toBeUndefined()
  })

  it('guests and staff appear only when a matching building is placed', () => {
    expect(planeFiguren('TOUR', [q('h', 'hotel')])).toHaveLength(0) // im Lager
    const plan = planeFiguren('TOUR', [q('h', 'hotel', 2, 3)])
    expect(plan.length).toBe(AUTO_REGELN.TOUR!.hotel!.arten.length)
    for (const f of plan) {
      expect(f.tier).toBe(false)
      expect(f.heimat).toMatchObject({ x: 2, y: 3 })
    }
  })

  it('guests disappear again when the building goes back into storage', () => {
    expect(planeFiguren('TOUR', [q('h', 'hotel', 2, 3)])).not.toHaveLength(0)
    expect(planeFiguren('TOUR', [q('h', 'hotel', null, null)])).toHaveLength(0)
  })

  it('more matching buildings bring more figures', () => {
    const eins = planeFiguren('TOUR', [q('p1', 'pool', 0, 0)])
    const zwei = planeFiguren('TOUR', [q('p1', 'pool', 0, 0), q('p2', 'pool', 3, 3)])
    expect(zwei.length).toBe(eins.length * 2)
  })

  it('uses the right kind of figure per department (workers in Spedition, guests in Tourismus)', () => {
    const sped = planeFiguren('SPED', [q('l', 'lagerhalle', 1, 1), q('s', 'sattelschlepper-rot', 2, 2)])
    expect(sped.map((f) => f.art).sort()).toEqual(['arbeiter', 'fahrer'])
    const tour = planeFiguren('TOUR', [q('s', 'spielplatz', 1, 1)])
    expect(tour.every((f) => f.art === 'kind')).toBe(true)
    // ein Hotel bringt in der Spedition keine Gäste hervor
    expect(planeFiguren('SPED', [q('h', 'hotel', 1, 1)])).toHaveLength(0)
  })

  it('never exceeds the figure limit and puts animals first', () => {
    const viele: FigurQuelle[] = [
      ...Array.from({ length: 6 }, (_, i) => q(`h${i}`, 'hotel', i, 0)),
      q('t1', 'strandhund'),
      q('t2', 'krebs'),
    ]
    const plan = planeFiguren('TOUR', viele)
    expect(plan.length).toBe(MAX_FIGUREN)
    expect(plan[0]!.tier && plan[1]!.tier).toBe(true)
  })

  it('keeps animals even if the limit is reached by guests (animals first)', () => {
    const viele: FigurQuelle[] = [...Array.from({ length: 10 }, (_, i) => q(`h${i}`, 'hotel', i % 5, Math.floor(i / 5))), q('t1', 'flamingo')]
    expect(planeFiguren('TOUR', viele).some((f) => f.id === 't1')).toBe(true)
  })

  it('is stable: same input gives the same ids and seeds, independent of input order', () => {
    const a = [q('b', 'hotel', 1, 1), q('a', 'pool', 2, 2), q('t', 'krebs')]
    const b = [q('t', 'krebs'), q('a', 'pool', 2, 2), q('b', 'hotel', 1, 1)]
    expect(planeFiguren('TOUR', a)).toEqual(planeFiguren('TOUR', b))
  })

  it('has unique figure ids and distinct seeds', () => {
    const plan = planeFiguren('TOUR', [q('h', 'hotel', 1, 1), q('p', 'pool', 2, 2), q('t', 'krebs')])
    expect(new Set(plan.map((f) => f.id)).size).toBe(plan.length)
    expect(new Set(plan.map((f) => f.seed)).size).toBe(plan.length)
  })

  it('hash is deterministic and spreads values', () => {
    expect(hash('abc')).toBe(hash('abc'))
    expect(hash('abc')).not.toBe(hash('abd'))
  })

  it('animal keys and auto-rule keys do not collide with each other', () => {
    for (const code of Object.keys(LEBEWESEN)) {
      for (const k of Object.keys(LEBEWESEN[code]!)) expect(AUTO_REGELN[code]?.[k]).toBeUndefined()
    }
  })
})
