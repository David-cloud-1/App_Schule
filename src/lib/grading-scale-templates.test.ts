import { describe, expect, it } from 'vitest'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'
import {
  IHK_TEMPLATE,
  buildTemplateList,
  normalizeScale,
  templateLabel,
  validateTemplateName,
  validateTemplateScale,
} from './grading-scale-templates'

describe('validateTemplateName', () => {
  it('bereinigt Leerraum', () => {
    expect(validateTemplateName('  Mein   Schlüssel ')).toEqual({ name: 'Mein Schlüssel' })
  })
  it('lehnt leer und nur Leerzeichen ab', () => {
    expect(validateTemplateName('')).toHaveProperty('error')
    expect(validateTemplateName('   ')).toHaveProperty('error')
    expect(validateTemplateName(undefined)).toHaveProperty('error')
  })
  it('erlaubt 60, lehnt 61 Zeichen ab', () => {
    expect(validateTemplateName('x'.repeat(60))).toHaveProperty('name')
    expect(validateTemplateName('x'.repeat(61))).toHaveProperty('error')
  })
})

describe('validateTemplateScale', () => {
  it('akzeptiert IHK', () => expect(validateTemplateScale(IHK_DEFAULT_SCALE)).toBeNull())
  it('lehnt Lücken/Reihenfolge ab', () => {
    const bad = IHK_DEFAULT_SCALE.map((b) => (b.grade === 2 ? { ...b, minPercent: 95 } : b))
    expect(validateTemplateScale(bad)).not.toBeNull()
  })
  it('lehnt falsche Anzahl ab', () => expect(validateTemplateScale([])).not.toBeNull())
})

describe('IHK-Vorlage', () => {
  it('ist fest eingebaut mit den IHK-Grenzen', () => {
    expect(IHK_TEMPLATE.builtIn).toBe(true)
    expect(IHK_TEMPLATE.scale.map((b) => b.minPercent)).toEqual([92, 81, 67, 50, 30, 0])
  })
})

describe('normalizeScale', () => {
  it('sortiert nach Note', () => {
    const shuffled = [...IHK_DEFAULT_SCALE].reverse()
    expect(normalizeScale(shuffled).map((b) => b.grade)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('buildTemplateList / templateLabel', () => {
  const scale = IHK_DEFAULT_SCALE
  const rows = [
    { id: 'a', name: 'Zeta', scale, shared: true, owner_id: 'other' },
    { id: 'b', name: 'Alpha', scale, shared: false, owner_id: 'me' },
    { id: 'c', name: 'Alpha', scale, shared: true, owner_id: 'other' },
    { id: 'd', name: 'Waise', scale, shared: true, owner_id: null },
  ]
  const list = buildTemplateList(rows, 'me', new Map([['other', 'Frau Beispiel']]))

  it('eigene zuerst, dann nach Name', () => {
    expect(list.map((t) => t.id)).toEqual(['b', 'c', 'd', 'a'])
  })
  it('gleiche Namen sind über den Besitzernamen unterscheidbar', () => {
    expect(templateLabel(list[0])).toBe('Alpha')
    expect(templateLabel(list[1])).toBe('Alpha (Frau Beispiel)')
  })
  it('verwaiste Vorlage ohne Namen', () => {
    const waise = list.find((t) => t.id === 'd')!
    expect(waise.ownerName).toBeNull()
    expect(templateLabel(waise)).toBe('Waise')
  })
})
