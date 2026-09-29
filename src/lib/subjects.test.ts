import { describe, expect, it } from 'vitest'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'
import { fetchDepartmentSubjects, formatAllowedCodes, normalizeSubjectCode, resolveSubjectCode, resolveSubjectCodes } from './subjects'

// Zwei Bereiche, beide mit einem Fach „KSK" (E4: Kürzel nur je Bereich eindeutig)
const ROWS = [
  { id: 'sped-ksk', code: 'KSK', name: 'Kaufm. Steuerung (Sped.)', color: '#f90', icon_name: 'Calculator', description: null, is_active: true, sort_order: 2, department_id: 'SPED' },
  { id: 'sped-bgp', code: 'BGP', name: 'BGP', color: '#1cb', icon_name: 'BarChart3', description: null, is_active: true, sort_order: 1, department_id: 'SPED' },
  { id: 'sped-old', code: 'ALT', name: 'Altes Fach', color: '#999', icon_name: 'BookOpen', description: null, is_active: false, sort_order: 9, department_id: 'SPED' },
  { id: 'tour-ksk', code: 'KSK', name: 'Kaufm. Steuerung (Tour.)', color: '#f90', icon_name: 'Calculator', description: null, is_active: true, sort_order: 1, department_id: 'TOUR' },
]

/** Datenbank-Ersatz, der wie Postgres nach Bereich und aktiv filtert */
function db() {
  return chainMock((table, calls) => {
    if (table !== 'subjects') return {}
    const department = eqValue(calls, 'department_id')
    const active = eqValue(calls, 'is_active')
    const rows = ROWS.filter((r) => r.department_id === department && (active === undefined || r.is_active === active))
      .sort((a, b) => a.sort_order - b.sort_order)
    return { data: rows }
  }).client
}

describe('resolveSubjectCodes', () => {
  it('liefert bei gleichem Kürzel in zwei Bereichen immer das Fach des angefragten Bereichs', async () => {
    expect((await resolveSubjectCode(db(), 'SPED', 'KSK'))?.id).toBe('sped-ksk')
    expect((await resolveSubjectCode(db(), 'TOUR', 'KSK'))?.id).toBe('tour-ksk')
  })

  it('findet Kürzel anderer Bereiche nicht', async () => {
    expect(await resolveSubjectCode(db(), 'TOUR', 'BGP')).toBeNull()
  })

  it('ignoriert Groß-/Kleinschreibung und Leerzeichen', async () => {
    const map = await resolveSubjectCodes(db(), 'SPED', [' ksk ', 'Bgp', 'XYZ'])
    expect([...map.keys()].sort()).toEqual(['BGP', 'KSK'])
    expect(map.get('KSK')?.id).toBe('sped-ksk')
  })

  it('lässt inaktive Fächer auf Wunsch weg', async () => {
    expect((await resolveSubjectCode(db(), 'SPED', 'ALT'))?.id).toBe('sped-old')
    expect(await resolveSubjectCode(db(), 'SPED', 'ALT', { activeOnly: true })).toBeNull()
  })

  it('fragt ohne Kürzel die Datenbank gar nicht erst', async () => {
    const mock = chainMock(() => ({ data: ROWS }))
    expect((await resolveSubjectCodes(mock.client, 'SPED', ['', '  '])).size).toBe(0)
    expect(mock.from).not.toHaveBeenCalled()
  })
})

describe('fetchDepartmentSubjects', () => {
  it('liefert die Fächer eines Bereichs in Anzeige-Reihenfolge', async () => {
    const subjects = await fetchDepartmentSubjects(db(), 'SPED', { activeOnly: true })
    expect(subjects.map((s) => s.code)).toEqual(['BGP', 'KSK'])
    expect(subjects[0]).toMatchObject({ iconName: 'BarChart3', isActive: true, sortOrder: 1 })
  })

  it('meldet Datenbankfehler statt eine leere Liste vorzutäuschen', async () => {
    const failing = chainMock(() => ({ data: null, error: { message: 'boom' } })).client
    await expect(fetchDepartmentSubjects(failing, 'SPED')).rejects.toThrow('boom')
  })
})

describe('helpers', () => {
  it('normalizeSubjectCode', () => {
    expect(normalizeSubjectCode('  lop ')).toBe('LOP')
  })
  it('formatAllowedCodes', () => {
    expect(formatAllowedCodes([{ code: 'BGP' }, { code: 'KSK' }])).toBe('BGP, KSK')
  })
})
