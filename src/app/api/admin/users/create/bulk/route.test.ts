import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import {
  BATCH_ID,
  DEPT_SPED,
  adminClientMock,
  noUserClientMock,
  serviceClientMock,
} from '@/test/account-create-mocks'
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

const body = (rows: unknown[], patch: Record<string, unknown> = {}) => ({
  rows,
  defaultDepartmentId: DEPT_SPED,
  batchId: BATCH_ID,
  batchIndex: 0,
  batchCount: 1,
  ...patch,
})

function call(payload: unknown) {
  return POST(
    new NextRequest('http://localhost/api/admin/users/create/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function setup(admin = adminClientMock(), service = serviceClientMock()) {
  vi.mocked(createClient).mockResolvedValue(admin.client as never)
  vi.mocked(createServiceClient).mockReturnValue(service.client as never)
  return { admin, service }
}

const otherBatch = (n: number) => ({ details: { batch_id: `00000000-0000-4000-8000-0000000000a${n}` } })

describe('POST /api/admin/users/create/bulk (PROJ-62)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(noUserClientMock() as never)
    expect((await call(body([row(2)]))).status).toBe(401)
  })

  it('403 für Lehrkräfte', async () => {
    const { service } = setup(adminClientMock({ role: 'teacher' }))
    expect((await call(body([row(2)]))).status).toBe(403)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it.each([
    ['mehr als 25 Zeilen', body(Array.from({ length: 26 }, (_, i) => row(i + 2)))],
    ['ohne batchId', body([row(2)], { batchId: 'x' })],
    ['Päckchen-Nummer außerhalb', body([row(2)], { batchIndex: 2, batchCount: 2 })],
    ['mehr als 12 Päckchen', body([row(2)], { batchCount: 13 })],
  ])('400 bei %s', async (_label, payload) => {
    const { service } = setup()
    expect((await call(payload)).status).toBe(400)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('legt die Zeilen mit je eigenem Passwort an und markiert die Protokolle mit der batchId', async () => {
    const { admin, service } = setup()
    const res = await call(body([row(2), row(3, { role: 'Lehrkraft' })]))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.failed).toEqual([])
    expect(json.created).toHaveLength(2)
    expect(json.created.map((c: { line: number }) => c.line)).toEqual([2, 3])
    const [a, b] = json.created as { password: string }[]
    expect(a.password).toMatch(/^[A-Za-z]+-[A-Za-z]+-[A-Za-z]+-\d{2}$/)
    expect(a.password).not.toBe(b.password)

    expect(service.createUser).toHaveBeenCalledTimes(2)
    const creates = admin.writes.filter((w) => (w.payload as { action_type?: string }).action_type === 'user.create')
    expect(creates).toHaveLength(2)
    for (const c of creates) expect((c.payload as { details: { batch_id: string } }).details.batch_id).toBe(BATCH_ID)
    expect(JSON.stringify(admin.writes)).not.toContain(a.password)
  })

  it('prüft beim Anlegen erneut: inzwischen vorhandene E-Mail und Admin-Rolle werden nicht angelegt', async () => {
    const { service } = setup(adminClientMock(), serviceClientMock({ existingEmails: ['p2@example.de'] }))
    const json = await (await call(body([row(2), row(3, { role: 'Super-Admin' }), row(4)]))).json()
    expect(json.created.map((c: { line: number }) => c.line)).toEqual([4])
    expect(json.failed).toEqual([
      { line: 2, name: 'Person 2', email: 'p2@example.de', reason: REASONS.exists },
      { line: 3, name: 'Person 3', email: 'p3@example.de', reason: REASONS.roleAdmin },
    ])
    expect(service.createUser).toHaveBeenCalledTimes(1)
  })

  it('ein Konto, das beim Anlegen scheitert, steht unter „failed“, die anderen bleiben', async () => {
    const service = serviceClientMock()
    service.createUser
      .mockResolvedValueOnce({ data: { user: null }, error: { code: 'email_exists', message: 'exists' } } as never)
    setup(adminClientMock(), service)
    const json = await (await call(body([row(2), row(3)]))).json()
    expect(json.failed).toHaveLength(1)
    expect(json.failed[0].reason).toBe(REASONS.exists)
    expect(json.created).toHaveLength(1)
  })

  it('Antwort mit Passwörtern ist nicht zwischenspeicherbar (BUG-10)', async () => {
    setup()
    expect((await call(body([row(2)]))).headers.get('cache-control')).toBe('no-store')
  })

  it('Päckchen 0 einer schon benutzten Kennung wird abgewiesen: kein Umgehen des Limits (BUG-9)', async () => {
    const { service } = setup(
      adminClientMock(),
      serviceClientMock({ usageRows: [otherBatch(1), otherBatch(2), otherBatch(3), { details: { batch_id: BATCH_ID } }] }),
    )
    const res = await call(body([row(2)], { batchIndex: 0, batchCount: 1 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('schon gestartet')
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('429 ab der vierten Sammel-Anlage in einer Stunde', async () => {
    const { service } = setup(adminClientMock(), serviceClientMock({ usageRows: [otherBatch(1), otherBatch(2), otherBatch(3), otherBatch(3)] }))
    const res = await call(body([row(2)]))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('3 Sammel-Anlagen pro Stunde')
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('eine schon laufende Sammel-Anlage darf trotz Limit fertig werden', async () => {
    setup(
      adminClientMock(),
      serviceClientMock({ usageRows: [otherBatch(1), otherBatch(2), otherBatch(3), { details: { batch_id: BATCH_ID } }] }),
    )
    const res = await call(body([row(2)], { batchIndex: 1, batchCount: 2 }))
    expect(res.status).toBe(200)
  })

  it('400, wenn eine Sammel-Anlage mehr als 300 Konten hätte', async () => {
    const usageRows = Array.from({ length: 290 }, () => ({ details: { batch_id: BATCH_ID } }))
    const { service } = setup(adminClientMock(), serviceClientMock({ usageRows }))
    const rows = Array.from({ length: 11 }, (_, i) => row(i + 2))
    expect((await call(body(rows, { batchIndex: 11, batchCount: 12 }))).status).toBe(400)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('das letzte Päckchen schreibt „Sammel-Anlage“ mit den Zahlen, frühere nicht', async () => {
    const first = setup()
    await call(body([row(2)], { batchIndex: 0, batchCount: 2 }))
    expect(first.admin.writes.some((w) => (w.payload as { action_type?: string }).action_type === 'user.bulk_create')).toBe(false)

    const last = setup(adminClientMock(), serviceClientMock({ usageRows: [{ details: { batch_id: BATCH_ID } }] }))
    await call(body([row(3), row(4, { email: 'kaputt' })], { batchIndex: 1, batchCount: 2, summary: { skipped: 2, invalid: 1, failed: 0 } }))
    const summary = last.admin.writes.find((w) => (w.payload as { action_type?: string }).action_type === 'user.bulk_create')
    expect(summary?.payload).toMatchObject({
      action_type: 'user.bulk_create',
      object_label: '2 Konten aus Liste',
      details: { batch_id: BATCH_ID, angelegt: 2, uebersprungen: 2, fehlerhaft: 1, gescheitert: 1 },
    })
  })

  it('503, wenn die Daten zum Prüfen nicht geladen werden können; nichts wird angelegt', async () => {
    const service = serviceClientMock()
    service.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: { message: 'boom' } } as never)
    setup(adminClientMock(), service)
    expect((await call(body([row(2)]))).status).toBe(503)
    expect(service.createUser).not.toHaveBeenCalled()
  })
})
