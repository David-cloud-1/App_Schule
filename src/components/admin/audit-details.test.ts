import { describe, it, expect } from 'vitest'
import { auditChangeLines } from './audit-details'

describe('auditChangeLines (PROJ-127)', () => {
  it('liest alt/neu aus changes', () => {
    expect(auditChangeLines({ changes: { price: { alt: 10, neu: 20 } } })).toEqual([
      { label: 'Preis', alt: '10', neu: '20' },
    ])
  })
  it('liest Sperre, Bereich und from/to', () => {
    expect(auditChangeLines({ gesperrt: { alt: false, neu: true } })).toEqual([{ label: 'Gesperrt', alt: 'nein', neu: 'ja' }])
    expect(auditChangeLines({ from: 'student', to: 'teacher' })).toEqual([{ label: 'Wert', alt: 'student', neu: 'teacher' }])
  })
  it('zeigt beim Anlegen nur neue Werte', () => {
    expect(auditChangeLines({ neu: { name: 'Kran' } })).toEqual([{ label: 'Name', alt: null, neu: 'Kran' }])
  })
  it('kommt mit leeren Details aus', () => {
    expect(auditChangeLines(null)).toEqual([])
    expect(auditChangeLines({ pflichtwechsel: true })).toEqual([])
  })
})
