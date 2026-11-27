import { describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/departments', () => ({
  getFallbackDepartment: vi.fn(),
  getDepartmentById: vi.fn(async (_s: unknown, id: string) => (id.startsWith('2') ? { id } : null)),
}))

import { assertDepartmentUnchanged, resolveAdminTargetDepartment, targetDepartmentMissing } from './auth'

const SPED = '11111111-1111-4111-8111-111111111111'
const TOUR = '22222222-2222-4222-8222-222222222222'
const UNBEKANNT = '33333333-3333-4333-8333-333333333333'
const auth = { departmentId: SPED, supabase: {} } as unknown as Parameters<typeof resolveAdminTargetDepartment>[0]

describe('Bereich des Dialogs auf dem Server (PROJ-130, BUG-1)', () => {
  it('lehnt das Speichern ab, wenn der Bereich inzwischen gewechselt wurde', async () => {
    const res = assertDepartmentUnchanged(auth, TOUR)
    expect(res?.status).toBe(409)
    expect((await res!.json()).error).toContain('Bitte lade die Seite neu')
  })

  it('lässt den unveränderten Bereich und Anfragen ohne Angabe durch', () => {
    expect(assertDepartmentUnchanged(auth, SPED)).toBeNull()
    expect(assertDepartmentUnchanged(auth, undefined)).toBeNull()
  })

  it('nimmt den Bereich des Dialogs vor dem Arbeitsbereich', async () => {
    expect(await resolveAdminTargetDepartment(auth, TOUR)).toBe(TOUR)
    expect(await resolveAdminTargetDepartment(auth, null)).toBe(SPED)
  })

  it('weist unbekannte oder ungültige Bereiche ab, statt auszuweichen', async () => {
    expect(await resolveAdminTargetDepartment(auth, UNBEKANNT)).toBeNull()
    expect(await resolveAdminTargetDepartment(auth, 'kein-uuid')).toBeNull()
  })

  it('sagt in der Meldung, was angelegt wird (BUG-2)', async () => {
    const body = await targetDepartmentMissing('die Übungsprüfung angelegt wird').json()
    expect(body.error).toBe('Bitte wähle, in welchem Bereich die Übungsprüfung angelegt wird.')
  })
})
