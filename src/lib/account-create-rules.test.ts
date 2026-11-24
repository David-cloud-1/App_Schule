import { describe, it, expect } from 'vitest'
import { REASONS, appUrlFor, resolveDepartmentValue, validateBulkRows, type DepartmentOption } from './account-create-rules'
import type { RawAccountRow } from './account-create'

const SPED: DepartmentOption = { id: 'd-sped', code: 'SPED', name: 'Spedition', domain: 'spedilern.vercel.app' }
const TOUR: DepartmentOption = { id: 'd-tour', code: 'TOUR', name: 'Tourismus', domain: null }
const DEPARTMENTS = [SPED, TOUR]

const row = (line: number, patch: Partial<RawAccountRow> = {}): RawAccountRow => ({
  line,
  name: `Person ${line}`,
  email: `p${line}@example.de`,
  department: '',
  role: '',
  ...patch,
})

function validate(rows: RawAccountRow[], opts: { defaultDepartmentId?: string | null; existing?: string[] } = {}) {
  return validateBulkRows(rows, {
    defaultDepartmentId: opts.defaultDepartmentId === undefined ? SPED.id : opts.defaultDepartmentId,
    departments: DEPARTMENTS,
    existingEmails: new Set(opts.existing ?? []),
  })
}

describe('resolveDepartmentValue', () => {
  it('leer = Bereich für alle', () => {
    expect(resolveDepartmentValue('', SPED.id, DEPARTMENTS).department).toBe(SPED)
  })
  it('erkennt Kürzel und Name ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    expect(resolveDepartmentValue('tour', null, DEPARTMENTS).department).toBe(TOUR)
    expect(resolveDepartmentValue('TOURISMUS', null, DEPARTMENTS).department).toBe(TOUR)
  })
  it('unbekannt oder ohne Bereich für alle: Begründung', () => {
    expect(resolveDepartmentValue('Kfz', SPED.id, DEPARTMENTS).reason).toBe(REASONS.departmentUnknown)
    expect(resolveDepartmentValue('', null, DEPARTMENTS).reason).toBe(REASONS.departmentMissing)
    expect(resolveDepartmentValue('', 'gibt-es-nicht', DEPARTMENTS).reason).toBe(REASONS.departmentMissing)
  })
})

describe('validateBulkRows (PROJ-62)', () => {
  it('OK-Zeile: Bereich und Rolle aufgelöst, E-Mail klein', () => {
    const [r] = validate([row(2, { email: ' Anna@Example.DE ', name: ' Anna ' })])
    expect(r).toEqual({
      line: 2,
      name: 'Anna',
      email: 'anna@example.de',
      departmentId: SPED.id,
      departmentName: 'Spedition',
      role: 'student',
      status: 'ok',
      reason: null,
    })
  })

  it.each([
    ['Name leer', row(2, { name: '  ' }), REASONS.nameEmpty],
    ['E-Mail ungültig', row(2, { email: 'kein-at' }), REASONS.emailInvalid],
    ['Bereich unbekannt', row(2, { department: 'Kfz' }), REASONS.departmentUnknown],
    ['Rolle unbekannt', row(2, { role: 'Hausmeister' }), REASONS.roleUnknown],
    ['Admin-Rolle', row(2, { role: 'Super-Admin' }), REASONS.roleAdmin],
    ['Bereichs-Admin', row(2, { role: 'Bereichs-Admin' }), REASONS.roleAdmin],
  ])('Fehler: %s', (_label, input, reason) => {
    const [r] = validate([input])
    expect(r.status).toBe('error')
    expect(r.reason).toContain(reason)
  })

  it('E-Mail doppelt in der Datei: beide Zeilen sind Fehler', () => {
    const rows = validate([row(2, { email: 'a@example.de' }), row(3, { email: 'A@example.de' }), row(4)])
    expect(rows.map((r) => r.status)).toEqual(['error', 'error', 'ok'])
    expect(rows[0].reason).toBe(REASONS.emailDuplicate)
  })

  it('Konto existiert schon: Warnung, nicht Fehler', () => {
    const [r] = validate([row(2, { email: 'alt@example.de' })], { existing: ['alt@example.de'] })
    expect(r.status).toBe('warning')
    expect(r.reason).toBe(REASONS.exists)
  })

  it('Fehler gehen vor „existiert schon“', () => {
    const [r] = validate([row(2, { email: 'alt@example.de', name: '' })], { existing: ['alt@example.de'] })
    expect(r.status).toBe('error')
  })

  it('sammelt mehrere Fehler einer Zeile', () => {
    const [r] = validate([row(2, { name: '', email: 'x', role: 'Chef' })])
    expect(r.reason).toContain(REASONS.nameEmpty)
    expect(r.reason).toContain(REASONS.emailInvalid)
    expect(r.reason).toContain(REASONS.roleUnknown)
  })

  it('ohne Bereich für alle braucht jede Zeile einen eigenen', () => {
    const rows = validate([row(2), row(3, { department: 'SPED' })], { defaultDepartmentId: null })
    expect(rows.map((r) => r.status)).toEqual(['error', 'ok'])
    expect(rows[0].reason).toBe(REASONS.departmentMissing)
  })

  it('Lehrkraft ist in der Sammel-Anlage erlaubt', () => {
    expect(validate([row(2, { role: 'Lehrkraft' })])[0]).toMatchObject({ status: 'ok', role: 'teacher' })
  })

  it('zu langer Name ist ein Fehler', () => {
    expect(validate([row(2, { name: 'x'.repeat(101) })])[0].reason).toBe(REASONS.nameTooLong)
  })
})

describe('appUrlFor', () => {
  it('Domain wird zur https-Adresse, ohne Domain gilt die aktuelle Adresse', () => {
    expect(appUrlFor('spedilern.vercel.app')).toBe('https://spedilern.vercel.app')
    expect(appUrlFor('https://tour.example.de/')).toBe('https://tour.example.de')
    expect(appUrlFor(null)).toBeNull()
    expect(appUrlFor('  ')).toBeNull()
  })
})
