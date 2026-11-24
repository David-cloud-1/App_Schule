import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { DEPT_SPED, DEPT_TOUR, adminClientMock, noUserClientMock, serviceClientMock } from '@/test/account-create-mocks'
import { REASONS } from '@/lib/account-create-rules'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const row = (line: number, patch: Record<string, string> = {}) => ({
  line,
  name: `Person ${line}`,
  email: `p${line}@example.de`,
  department: '',
  role: '',
  ...patch,
})

function call(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/admin/users/create/preview', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function setup(admin = adminClientMock(), service = serviceClientMock()) {
  vi.mocked(createClient).mockResolvedValue(admin.client as never)
  vi.mocked(createServiceClient).mockReturnValue(service.client as never)
  return { admin, service }
}

describe('POST /api/admin/users/create/preview (PROJ-62)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(noUserClientMock() as never)
    expect((await call({ rows: [row(2)], defaultDepartmentId: DEPT_SPED })).status).toBe(401)
  })

  it('403 für Lehrkräfte', async () => {
    setup(adminClientMock({ role: 'teacher' }))
    expect((await call({ rows: [row(2)], defaultDepartmentId: DEPT_SPED })).status).toBe(403)
  })

  it('prüft jede Zeile und legt nichts an', async () => {
    const { service, admin } = setup(adminClientMock(), serviceClientMock({ existingEmails: ['P3@example.de'] }))
    const res = await call({
      rows: [row(2), row(3), row(4, { email: 'kaputt' }), row(5, { department: 'tour', role: 'Lehrkraft' })],
      defaultDepartmentId: DEPT_SPED,
    })
    expect(res.status).toBe(200)
    const { rows } = await res.json()
    expect(rows.map((r: { status: string }) => r.status)).toEqual(['ok', 'warning', 'error', 'ok'])
    expect(rows[1].reason).toBe(REASONS.exists)
    expect(rows[3]).toMatchObject({ departmentId: DEPT_TOUR, departmentName: 'Tourismus', role: 'teacher' })
    expect(service.createUser).not.toHaveBeenCalled()
    expect(service.writes).toHaveLength(0)
    // Nur der Prüf-Eintrag mit Zahlen, keine Adressen
    expect(admin.writes).toHaveLength(1)
    expect(admin.writes[0].payload).toMatchObject({
      action_type: 'user.bulk_preview',
      details: { zeilen: 4, ok: 2, warnungen: 1, fehler: 1 },
    })
    expect(JSON.stringify(admin.writes[0].payload)).not.toContain('@example.de')
  })

  it('400 bei mehr als 300 Zeilen', async () => {
    setup()
    const rows = Array.from({ length: 301 }, (_, i) => row(i + 2))
    const res = await call({ rows, defaultDepartmentId: DEPT_SPED })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('mehrere Dateien')
  })

  it('400 bei leerer Liste und bei unbekanntem Bereich für alle', async () => {
    setup()
    expect((await call({ rows: [], defaultDepartmentId: DEPT_SPED })).status).toBe(400)
    expect((await call({ rows: [row(2)], defaultDepartmentId: '99999999-9999-4999-8999-999999999999' })).status).toBe(400)
  })

  it('ohne Bereich für alle: Zeilen ohne eigenen Bereich sind Fehler', async () => {
    setup()
    const { rows } = await (await call({ rows: [row(2), row(3, { department: 'SPED' })], defaultDepartmentId: null })).json()
    expect(rows.map((r: { status: string }) => r.status)).toEqual(['error', 'ok'])
  })

  it('500 mit verständlicher Meldung, wenn die Konten nicht geladen werden können', async () => {
    const service = serviceClientMock()
    service.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: { message: 'boom' } } as never)
    setup(adminClientMock(), service)
    const res = await call({ rows: [row(2)], defaultDepartmentId: DEPT_SPED })
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Die Liste konnte nicht geprüft werden.')
  })
})
