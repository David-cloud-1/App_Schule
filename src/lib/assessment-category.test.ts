import { describe, it, expect, vi } from 'vitest'
import { isValidSchoolYear, normalizeClassName, resolveCategory, schoolYearFor } from './assessment-category'

describe('schoolYearFor', () => {
  it('beginnt das neue Schuljahr am 1. September (Berliner Zeit)', () => {
    expect(schoolYearFor('2026-10-15T10:00:00Z')).toBe('2026/27')
    expect(schoolYearFor('2026-09-01T00:30:00+02:00')).toBe('2026/27')
    // 31.08. 22:30 UTC = 1.9. 00:30 Berlin
    expect(schoolYearFor('2026-08-31T22:30:00Z')).toBe('2026/27')
    expect(schoolYearFor('2026-08-31T12:00:00Z')).toBe('2025/26')
  })

  it('rechnet Januar bis August zum Vorjahr', () => {
    expect(schoolYearFor('2027-01-10T10:00:00Z')).toBe('2026/27')
    expect(schoolYearFor('2027-06-20T10:00:00Z')).toBe('2026/27')
  })

  it('läuft über das Jahrhundert korrekt', () => {
    expect(schoolYearFor('2099-10-01T10:00:00Z')).toBe('2099/00')
  })
})

describe('isValidSchoolYear', () => {
  it('akzeptiert nur aufeinanderfolgende Jahre im Format JJJJ/JJ', () => {
    expect(isValidSchoolYear('2026/27')).toBe(true)
    expect(isValidSchoolYear('2099/00')).toBe(true)
    expect(isValidSchoolYear('2026/28')).toBe(false)
    expect(isValidSchoolYear('2026-27')).toBe(false)
    expect(isValidSchoolYear('26/27')).toBe(false)
    expect(isValidSchoolYear('')).toBe(false)
  })
})

describe('normalizeClassName', () => {
  it('entfernt Ränder und Mehrfach-Leerzeichen', () => {
    expect(normalizeClassName('  SP 11a  ', [])).toBe('SP 11a')
    expect(normalizeClassName('SP   11a', [])).toBe('SP 11a')
  })

  it('übernimmt die Schreibweise einer vorhandenen Klasse', () => {
    expect(normalizeClassName('sp11a', ['SP11a', 'SP11b'])).toBe('SP11a')
  })

  it('liefert null bei leerer Eingabe', () => {
    expect(normalizeClassName('   ', ['SP11a'])).toBeNull()
    expect(normalizeClassName(null, [])).toBeNull()
    expect(normalizeClassName(undefined, [])).toBeNull()
  })
})

function makeSupabase(opts: { subjectFound?: boolean; classes?: string[] }) {
  const subjects = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.subjectFound ? { id: 's1' } : null, error: null }),
  }
  const assessments = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue({ data: (opts.classes ?? []).map((c) => ({ class_name: c })), error: null }),
  }
  const from = vi.fn((table: string) => {
    if (table === 'subjects') return subjects
    if (table === 'graded_assessments') return assessments
    throw new Error(`Unexpected table: ${table}`)
  })
  return { supabase: { from } as never, from, subjects }
}

describe('resolveCategory', () => {
  it('fragt die Datenbank nicht, wenn nichts übergeben wird', async () => {
    const { supabase, from } = makeSupabase({})
    const res = await resolveCategory(supabase, 'dept', {})
    expect(res).toEqual({ ok: true, columns: {} })
    expect(from).not.toHaveBeenCalled()
  })

  it('lehnt ein ungültiges Schuljahr ab', async () => {
    const { supabase } = makeSupabase({})
    const res = await resolveCategory(supabase, 'dept', { schoolYear: '2026/30' })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('lehnt ein Fach aus einem anderen Fachbereich ab', async () => {
    const { supabase, subjects } = makeSupabase({ subjectFound: false })
    const res = await resolveCategory(supabase, 'dept', { subjectId: 'fremd' })
    expect(res).toMatchObject({ ok: false, status: 400 })
    expect(subjects.eq).toHaveBeenCalledWith('department_id', 'dept')
  })

  it('erlaubt null, um die Fach-Zuordnung zu entfernen', async () => {
    const { supabase, from } = makeSupabase({})
    const res = await resolveCategory(supabase, 'dept', { subjectId: null })
    expect(res).toEqual({ ok: true, columns: { subject_id: null } })
    expect(from).not.toHaveBeenCalled()
  })

  it('vereinheitlicht die Klasse gegen vorhandene Klassen des Bereichs', async () => {
    const { supabase } = makeSupabase({ classes: ['SP11a'] })
    const res = await resolveCategory(supabase, 'dept', { className: ' sp11A ', schoolYear: '2026/27' })
    expect(res).toEqual({ ok: true, columns: { class_name: 'SP11a', school_year: '2026/27' } })
  })

  it('leert die Klasse bei leerer Eingabe', async () => {
    const { supabase } = makeSupabase({ classes: [] })
    const res = await resolveCategory(supabase, 'dept', { className: '' })
    expect(res).toEqual({ ok: true, columns: { class_name: null } })
  })
})
