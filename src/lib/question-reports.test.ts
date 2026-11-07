import { describe, it, expect } from 'vitest'
import {
  reportBulkCloseSchema,
  reportCloseSchema,
  reportCreateSchema,
  reportErrorResponse,
  reportReadSchema,
} from './question-reports'

const Q = '550e8400-e29b-41d4-a716-446655440001'

describe('reportCreateSchema', () => {
  it('nimmt einen gültigen Grund ohne Text an', () => {
    expect(reportCreateSchema.safeParse({ question_id: Q, reason: 'veraltet' }).success).toBe(true)
  })

  it('verlangt bei „sonstiges“ einen Text', () => {
    const r = reportCreateSchema.safeParse({ question_id: Q, reason: 'sonstiges' })
    expect(r.success).toBe(false)
    const ok = reportCreateSchema.safeParse({ question_id: Q, reason: 'sonstiges', note: 'Satz bricht ab' })
    expect(ok.success).toBe(true)
  })

  it('lehnt unbekannte Gründe, kaputte Kennungen und zu lange Texte ab', () => {
    expect(reportCreateSchema.safeParse({ question_id: Q, reason: 'quatsch' }).success).toBe(false)
    expect(reportCreateSchema.safeParse({ question_id: 'x', reason: 'veraltet' }).success).toBe(false)
    expect(reportCreateSchema.safeParse({ question_id: Q, reason: 'veraltet', note: 'x'.repeat(501) }).success).toBe(false)
  })

  it('schneidet Leerraum am Text ab', () => {
    const r = reportCreateSchema.safeParse({ question_id: Q, reason: 'veraltet', note: '  hallo  ' })
    expect(r.success && r.data.note).toBe('hallo')
  })
})

describe('reportCloseSchema und Co.', () => {
  it('erlaubt nur die beiden Abschlussarten', () => {
    expect(reportCloseSchema.safeParse({ result: 'korrigiert' }).success).toBe(true)
    expect(reportCloseSchema.safeParse({ result: 'offen' }).success).toBe(false)
  })

  it('begrenzt die Rückmeldung auf 200 Zeichen', () => {
    expect(reportCloseSchema.safeParse({ result: 'nicht_uebernommen', response: 'x'.repeat(201) }).success).toBe(false)
  })

  it('prüft Sammel-Schließen und Gelesen-Markierung', () => {
    expect(reportBulkCloseSchema.safeParse({ question_ids: [] }).success).toBe(false)
    expect(reportBulkCloseSchema.safeParse({ question_ids: [Q] }).success).toBe(true)
    expect(reportReadSchema.safeParse({ ids: [Q] }).success).toBe(true)
    expect(reportReadSchema.safeParse({ ids: ['x'] }).success).toBe(false)
  })
})

describe('reportErrorResponse', () => {
  it('übersetzt bekannte Fehlercodes', () => {
    expect(reportErrorResponse({ message: 'ALREADY_REPORTED' }).status).toBe(409)
    expect(reportErrorResponse({ message: 'DAILY_LIMIT' }).status).toBe(429)
    expect(reportErrorResponse({ message: 'QUESTION_NOT_FOUND' }).status).toBe(404)
    expect(reportErrorResponse({ message: 'SESSION_RUNNING' }).status).toBe(409)
  })

  it('macht aus fehlenden Rechten 403 und aus allem anderen einen neutralen 500', () => {
    expect(reportErrorResponse({ code: '42501', message: 'permission denied' }).status).toBe(403)
    const other = reportErrorResponse({ code: 'XX000', message: 'interner SQL-Text' })
    expect(other.status).toBe(500)
    expect(other.message).not.toContain('SQL')
  })
})
