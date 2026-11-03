import { describe, it, expect } from 'vitest'
import { deleteBlockReason, deleteConfirmationMatches } from './konto-loeschen'
import { buildParticipantRows, IHK_DEFAULT_SCALE, type SessionRow } from './graded-assessments'

describe('deleteConfirmationMatches (PROJ-60)', () => {
  it('ignoriert Leerraum außen und Groß-/Kleinschreibung', () => {
    expect(deleteConfirmationMatches('  Anna@Beispiel.de ', 'anna@beispiel.de')).toBe(true)
  })
  it('lehnt andere Eingaben, leere Werte und fehlende E-Mail ab', () => {
    expect(deleteConfirmationMatches('anna@beispiel.de', 'bert@beispiel.de')).toBe(false)
    expect(deleteConfirmationMatches('', '')).toBe(false)
    expect(deleteConfirmationMatches('x', null)).toBe(false)
    expect(deleteConfirmationMatches(42, 'a@b.de')).toBe(false)
  })
})

describe('deleteBlockReason (PROJ-60)', () => {
  it('sperrt Super-Admin und Zweitaccount, erlaubt alle anderen Rollen', () => {
    expect(deleteBlockReason({ role: 'admin', linked_main_user_id: null })).toMatch(/Rolle/)
    expect(deleteBlockReason({ role: 'teacher', linked_main_user_id: 'x' })).toMatch(/Zweitaccount/)
    for (const role of ['student', 'teacher', 'department_admin']) {
      expect(deleteBlockReason({ role, linked_main_user_id: null })).toBeNull()
    }
  })
})

describe('Klassenauswertung nach der Löschung (PROJ-60)', () => {
  const base: SessionRow = {
    id: 's1',
    participant_name: null,
    started_at: '2026-11-01T08:00:00Z',
    ended_at: '2026-11-01T08:30:00Z',
    status: 'completed',
    excluded_from_grading: false,
    results_json: null,
  }
  it('zeigt anonyme Abgaben als „Gelöschtes Konto“', () => {
    const [row] = buildParticipantRows([{ ...base, user_id: null }], 1, IHK_DEFAULT_SCALE)
    expect(row.name).toBe('Gelöschtes Konto')
  })
  it('lässt echte Namen und alte Zeilen ohne Konto-Angabe unberührt', () => {
    const rows = buildParticipantRows(
      [{ ...base, user_id: 'u1', participant_name: 'Anna' }, { ...base, id: 's2' }],
      1,
      IHK_DEFAULT_SCALE,
    )
    expect(rows.map((r) => r.name)).toEqual(['Anna', 'Unbekannt'])
  })
})
