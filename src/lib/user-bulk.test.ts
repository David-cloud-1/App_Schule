import { describe, it, expect } from 'vitest'
import { bulkSkipReason, chunk, previewNames, resultMessage, summarize, type BulkResultItem, type BulkTarget } from './user-bulk'

const ADMIN = 'admin-1'
const D1 = 'dept-1'
const D2 = 'dept-2'
const student: BulkTarget = { id: 's1', role: 'student', department_id: D1, linked_main_user_id: null }

const reason = (action: Parameters<typeof bulkSkipReason>[0], target: BulkTarget | null, id = 's1') =>
  bulkSkipReason(action, target, { adminId: ADMIN, targetDepartmentId: D2 }, id)

describe('bulkSkipReason (PROJ-61)', () => {
  it('bearbeitet gewöhnliche Azubis und Lehrkräfte', () => {
    for (const action of ['ban', 'unban', 'move'] as const) {
      expect(reason(action, student)).toBeNull()
      expect(reason(action, { ...student, role: 'teacher' })).toBeNull()
    }
  })

  it('überspringt immer das eigene Konto, auch wenn es nicht geladen wurde', () => {
    expect(reason('ban', { ...student, id: ADMIN, role: 'admin' }, ADMIN)).toBe('self')
    expect(reason('move', null, ADMIN)).toBe('self')
  })

  it('überspringt nicht (mehr) vorhandene Konten', () => {
    expect(reason('unban', null)).toBe('not_found')
  })

  it('überspringt den verknüpften Zweitaccount', () => {
    expect(reason('ban', { ...student, linked_main_user_id: ADMIN })).toBe('linked')
  })

  it('überspringt Super-Admins bei allen drei Aktionen', () => {
    for (const action of ['ban', 'unban', 'move'] as const) {
      expect(reason(action, { ...student, role: 'admin' })).toBe('super_admin')
    }
  })

  it('sperrt Bereichs-Admins, verschiebt sie aber nicht („Rolle zuerst ändern“)', () => {
    const bereichsAdmin = { ...student, role: 'department_admin' as const }
    expect(reason('ban', bereichsAdmin)).toBeNull()
    expect(reason('move', bereichsAdmin)).toBe('role_first')
  })

  it('überspringt beim Verschieben, wer schon im Zielbereich ist', () => {
    expect(reason('move', { ...student, department_id: D2 })).toBe('same_department')
    expect(reason('ban', { ...student, department_id: D2 })).toBeNull()
  })
})

describe('Hilfsfunktionen (PROJ-61)', () => {
  it('chunk teilt in Stücke', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 100)).toEqual([])
  })

  it('previewNames nennt bis zu 5 Namen, dann „und {x} weitere“', () => {
    expect(previewNames(['A', 'B'])).toBe('A, B')
    expect(previewNames(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, D, E')
    expect(previewNames(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe('A, B, C, D, E und 2 weitere')
  })

  const items: BulkResultItem[] = [
    { id: '1', status: 'done' },
    { id: '2', status: 'done' },
    { id: '3', status: 'skipped', reason: 'super_admin' },
    { id: '4', status: 'failed' },
  ]

  it('summarize zählt je Ergebnis', () => {
    expect(summarize(items)).toEqual({ done: 2, skipped: 1, failed: 1 })
  })

  it('resultMessage: glatter Lauf und Teilergebnis', () => {
    expect(resultMessage('ban', items.slice(0, 2))).toBe('2 gesperrt')
    expect(resultMessage('ban', items)).toBe('2 von 4 gesperrt, 1 übersprungen, 1 fehlgeschlagen')
    expect(resultMessage('move', items.slice(0, 1))).toBe('1 verschoben')
  })
})
