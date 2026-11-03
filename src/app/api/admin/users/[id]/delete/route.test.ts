import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT = '11111111-1111-4111-8111-111111111111'
const EMAIL = 'anna@beispiel.de'

const STUDENT = {
  id: TARGET_ID,
  display_name: 'Anna Test',
  role: 'student',
  department_id: DEPT,
  linked_main_user_id: null,
}

function req(method: 'GET' | 'POST', body?: unknown, id = TARGET_ID) {
  return new NextRequest(`http://localhost/api/admin/users/${id}/delete`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}
const callPost = (body: unknown, id = TARGET_ID) => POST(req('POST', body, id), { params: Promise.resolve({ id }) })
const callGet = (id = TARGET_ID) => GET(req('GET', undefined, id), { params: Promise.resolve({ id }) })

function adminClient(role: 'admin' | 'department_admin' = 'admin') {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
  return mock
}

type ServiceOpts = {
  target?: unknown
  prepareError?: boolean
  storageRemoveError?: boolean
  deleteUserError?: { message: string; status?: number }
  files?: Record<string, { name: string; id: string | null }[]>
}

/** Handgebauter Service-Client: Profil lesen, rpc, Speicher, Auth-Admin — mit Aufruf-Protokoll */
function serviceClient(opts: ServiceOpts = {}) {
  const calls: string[] = []
  const removed: string[][] = []
  const target = opts.target === undefined ? STUDENT : opts.target
  const files = opts.files ?? {}

  const client = {
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: target, error: null }),
      }
      return chain
    }),
    rpc: vi.fn(async (fn: string) => {
      calls.push(fn)
      if (fn === 'konto_loeschen_vorbereiten') {
        return opts.prepareError ? { data: null, error: { message: 'boom' } } : { data: { nachweise: 3 }, error: null }
      }
      return { data: { nachweise: 3, inhalte: 5 }, error: null }
    }),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn(async (prefix: string) => ({ data: files[prefix] ?? [], error: null })),
        remove: vi.fn(async (paths: string[]) => {
          calls.push('storage.remove')
          removed.push(paths)
          return { error: opts.storageRemoveError ? { message: 'boom' } : null }
        }),
      })),
    },
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email: EMAIL } } }),
        deleteUser: vi.fn(async () => {
          calls.push('auth.deleteUser')
          return { error: opts.deleteUserError ?? null }
        }),
      },
    },
  }
  vi.mocked(createServiceClient).mockReturnValue(client as never)
  return { client, calls, removed }
}

describe('POST /api/admin/users/[id]/delete (PROJ-60)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 für den Bereichs-Admin, es passiert nichts', async () => {
    adminClient('department_admin')
    const svc = serviceClient()
    expect((await callPost({ confirmEmail: EMAIL })).status).toBe(403)
    expect(svc.calls).toEqual([])
  })

  it('400 beim eigenen Konto', async () => {
    adminClient()
    const svc = serviceClient()
    expect((await callPost({ confirmEmail: EMAIL }, ADMIN_ID)).status).toBe(400)
    expect(svc.calls).toEqual([])
  })

  it('400 bei einem Super-Admin-Konto', async () => {
    adminClient()
    const svc = serviceClient({ target: { ...STUDENT, role: 'admin' } })
    const res = await callPost({ confirmEmail: EMAIL })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Rolle/)
    expect(svc.calls).toEqual([])
  })

  it('400 bei einem Zweitaccount', async () => {
    adminClient()
    const svc = serviceClient({ target: { ...STUDENT, linked_main_user_id: ADMIN_ID } })
    expect((await callPost({ confirmEmail: EMAIL })).status).toBe(400)
    expect(svc.calls).toEqual([])
  })

  it('400 bei falscher oder fehlender E-Mail, es wird nichts angefasst', async () => {
    adminClient()
    const svc = serviceClient()
    expect((await callPost({ confirmEmail: 'andere@beispiel.de' })).status).toBe(400)
    expect((await callPost({})).status).toBe(400)
    expect(svc.calls).toEqual([])
  })

  it('404, wenn das Konto nicht (mehr) existiert — zweiter Versuch', async () => {
    adminClient()
    const svc = serviceClient({ target: null })
    expect((await callPost({ confirmEmail: EMAIL })).status).toBe(404)
    expect(svc.calls).toEqual([])
  })

  it('löscht in der richtigen Reihenfolge: anonymisieren, Dateien, Konto, dann Protokoll ohne Personenbezug', async () => {
    const admin = adminClient()
    const svc = serviceClient({
      files: {
        [TARGET_ID]: [{ name: 'abc', id: null }],
        [`${TARGET_ID}/abc`]: [{ name: 'skript.docx', id: 'f1' }],
      },
    })
    const res = await callPost({ confirmEmail: `  ${EMAIL.toUpperCase()} ` })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, anonymizedAssessments: 3 })

    expect(svc.calls).toEqual(['konto_loeschen_vorbereiten', 'storage.remove', 'auth.deleteUser'])
    expect(svc.removed).toEqual([[`${TARGET_ID}/abc/skript.docx`]])

    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log).toBeDefined()
    const row = JSON.stringify(log)
    expect(row).toContain('user.delete')
    expect(row).toContain('anonymized_assessments')
    // keine Personenbezüge im Protokoll
    expect(row).not.toContain(TARGET_ID)
    expect(row).not.toContain('Anna')
    expect(row).not.toContain('anna@')
  })

  it('Datenbank-Fehler beim Anonymisieren: Meldung zum Wiederholen, das Konto bleibt', async () => {
    adminClient()
    const svc = serviceClient({ prepareError: true })
    const res = await callPost({ confirmEmail: EMAIL })
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Löschen fehlgeschlagen – erneut versuchen')
    expect(svc.calls).not.toContain('auth.deleteUser')
  })

  it('Fehler beim Löschen der Dateien: das Konto bleibt bestehen', async () => {
    adminClient()
    const svc = serviceClient({
      storageRemoveError: true,
      files: { [TARGET_ID]: [{ name: 'datei.txt', id: 'f1' }] },
    })
    expect((await callPost({ confirmEmail: EMAIL })).status).toBe(500)
    expect(svc.calls).not.toContain('auth.deleteUser')
  })

  it('Fehler beim Löschen des Auth-Kontos: 500 und kein Protokoll-Eintrag', async () => {
    const admin = adminClient()
    serviceClient({ deleteUserError: { message: 'database error' } })
    expect((await callPost({ confirmEmail: EMAIL })).status).toBe(500)
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('Konto war schon weg (zweiter Admin): 404 „Konto nicht gefunden“ statt Fehler', async () => {
    const admin = adminClient()
    serviceClient({ deleteUserError: { message: 'User not found', status: 404 } })
    const res = await callPost({ confirmEmail: EMAIL })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Konto nicht gefunden')
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })
})

describe('GET /api/admin/users/[id]/delete (PROJ-60 Vorschau)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 für den Bereichs-Admin', async () => {
    adminClient('department_admin')
    serviceClient()
    expect((await callGet()).status).toBe(403)
  })

  it('liefert Zahlen für den Dialog und ändert nichts', async () => {
    adminClient()
    const svc = serviceClient()
    const res = await callGet()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: EMAIL, displayName: 'Anna Test', assessments: 3, ownContent: 5 })
    expect(svc.calls).toEqual(['konto_loeschen_vorschau'])
  })

  it('400 bei einem Super-Admin-Konto', async () => {
    adminClient()
    serviceClient({ target: { ...STUDENT, role: 'admin' } })
    expect((await callGet()).status).toBe(400)
  })
})
