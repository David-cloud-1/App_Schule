import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
vi.mock('@/lib/answer-key', () => ({ fetchAnswerKey: vi.fn().mockResolvedValue(new Map()) }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT = '11111111-1111-4111-8111-111111111111'

function call(section: string, id = TARGET_ID) {
  return GET(new Request(`http://localhost/api/admin/users/${id}/detail/${section}`), {
    params: Promise.resolve({ id, section }),
  })
}

function adminClient(role: 'admin' | 'department_admin' | 'teacher' = 'admin') {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}

const PROFILE = {
  id: TARGET_ID, display_name: 'Anna', role: 'student', pseudonym: null, department_id: DEPT,
  created_at: '2026-09-01T00:00:00Z', total_xp: 350, current_streak: 2, longest_streak: 5,
  last_session_date: '2026-11-01', coin_balance: 12, linked_main_user_id: null,
}

function serviceClient(overrides: Record<string, unknown> = {}, profile: unknown = PROFILE) {
  const mock = chainMock((table, calls) => {
    if (table in overrides) return overrides[table] as never
    // Namen-Nachschlagen (`.in(...)`) liefert eine Liste, das einzelne Profil ein Objekt
    if (table === 'profiles') return calls.some((c) => c.method === 'in') ? { data: [{ id: ADMIN_ID, display_name: 'Admin Alex' }] } : { data: profile }
    if (table === 'departments') return { data: { name: 'Spedition' } }
    return { data: [] }
  })
  Object.assign(mock.client, {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: 'anna@x.de', email_confirmed_at: '2026-09-02T00:00:00Z', last_sign_in_at: '2026-11-01T08:00:00Z', banned_until: null } },
        }),
      },
    },
  })
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return mock
}

describe('GET /api/admin/users/[id]/detail/[section] (PROJ-59)', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['department_admin', 'teacher'] as const)('403 für %s', async (role) => {
    adminClient(role)
    serviceClient()
    expect((await call('overview')).status).toBe(403)
  })

  it('404 bei unbekanntem Abschnitt, ungültiger Id und unbekanntem Konto', async () => {
    adminClient()
    serviceClient()
    expect((await call('passwoerter')).status).toBe(404)
    expect((await call('overview', 'kein-uuid')).status).toBe(404)
    serviceClient({}, null)
    const res = await call('overview')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Konto nicht gefunden')
  })

  it('Übersicht: Steckbrief und Spielstand ohne sensible Felder', async () => {
    adminClient()
    serviceClient()
    const json = await (await call('overview')).json()
    expect(json).toMatchObject({
      displayName: 'Anna', email: 'anna@x.de', emailConfirmed: true, role: 'student',
      departmentName: 'Spedition', totalXp: 350, level: 3, currentStreak: 2, longestStreak: 5, coins: 12, banned: false,
    })
    expect(JSON.stringify(json)).not.toMatch(/password|token/i)
  })

  it('Übersicht: Zweitaccount nennt das Hauptkonto', async () => {
    adminClient()
    serviceClient({}, { ...PROFILE, linked_main_user_id: ADMIN_ID })
    const json = await (await call('overview')).json()
    expect(json.linkedMain).toEqual({ id: ADMIN_ID, name: 'Anna' })
  })

  it('Lernstand: aggregiert je Fach und liefert 30 Tage Aktivität', async () => {
    adminClient()
    const today = new Date().toISOString()
    serviceClient({
      quiz_sessions: { data: [
        { subject_id: 's1', score: 4, total: 5, completed_at: today },
        { subject_id: 's1', score: 1, total: 5, completed_at: today },
      ] },
      subjects: { data: [{ id: 's1', name: 'BGP' }] },
      blitz_rounds: { data: [] },
    })
    const json = await (await call('learning')).json()
    expect(json.subjects).toHaveLength(1)
    expect(json.subjects[0]).toMatchObject({ name: 'BGP', answered: 10, correct: 5, percent: 50 })
    expect(json.activity).toHaveLength(30)
    expect(json.activity[29].learned).toBe(true)
  })

  it('Lernstand ohne Aktivität: leere Fächerliste statt Fehler', async () => {
    adminClient()
    serviceClient()
    const json = await (await call('learning')).json()
    expect(json.subjects).toEqual([])
    expect(json.activity.every((d: { learned: boolean }) => !d.learned)).toBe(true)
  })

  it('Badges: mit Namen und Datum', async () => {
    adminClient()
    serviceClient({
      user_badges: { data: [{ badge_id: 'b1', unlocked_at: '2026-10-10T00:00:00Z' }] },
      badges: { data: [{ id: 'b1', name: 'Erste Runde', icon: 'star' }] },
    })
    const json = await (await call('badges')).json()
    expect(json.badges).toEqual([{ id: 'b1', name: 'Erste Runde', icon: 'star', unlockedAt: '2026-10-10T00:00:00Z' }])
  })

  it('Protokoll: nur Einträge zu dieser Person, mit Klartext und Gesamtzahl', async () => {
    adminClient()
    const svc = serviceClient({
      admin_audit_log: { data: [{ id: 'l1', created_at: '2026-11-01T10:00:00Z', admin_id: ADMIN_ID, action_type: 'user.rename', details: { old: 'A', new: 'B' } }], count: 31 },
    })
    const json = await (await call('log')).json()
    expect(json.total).toBe(31)
    expect(json.entries[0]).toMatchObject({ label: 'Name geändert', actionType: 'user.rename', adminName: 'Admin Alex' })
    const query = svc.queries.find((q) => q.table === 'admin_audit_log')
    expect(query?.calls).toContainEqual({ method: 'eq', args: ['object_id', TARGET_ID] })
    expect(query?.calls).toContainEqual({ method: 'eq', args: ['object_type', 'user'] })
  })

  it('Nachweise: leere Liste ohne Teilnahme', async () => {
    adminClient()
    serviceClient({ exam_sessions: { data: [] } })
    expect(await (await call('assessments')).json()).toEqual({ assessments: [] })
  })

  it('Nachweise: laufender Versuch ohne Note, mit Fokus-Wechseln; gelöschter Nachweis als Platzhalter', async () => {
    adminClient()
    serviceClient({
      exam_sessions: { data: [
        { id: 'e1', assessment_id: 'a1', participant_name: 'Anna', started_at: '2026-10-20T08:00:00Z', ended_at: null, status: 'in_progress', results_json: null, excluded_from_grading: false },
        { id: 'e2', assessment_id: 'a-weg', participant_name: 'Anna', started_at: '2026-10-10T08:00:00Z', ended_at: '2026-10-10T09:00:00Z', status: 'completed', results_json: null, excluded_from_grading: false },
      ] },
      graded_assessments: { data: [{ id: 'a1', title: 'Klassenarbeit 1', part: 1, grading_scale: [], focus_tracking: true }] },
      assessment_focus_summary: { data: [{ session_id: 'e1', counted_switches: 2 }] },
    })
    const json = await (await call('assessments')).json()
    expect(json.assessments).toHaveLength(2)
    expect(json.assessments[0]).toMatchObject({ title: 'Klassenarbeit 1', status: 'in_progress', grade: null, focusSwitches: 2, assessmentId: 'a1' })
    expect(json.assessments[1]).toMatchObject({ title: 'Nachweis nicht mehr vorhanden', grade: null, focusSwitches: null })
  })

  it('ein Fehler in einem Abschnitt liefert 500 mit ruhigem Satz', async () => {
    adminClient()
    serviceClient({ user_badges: { error: { message: 'db down' } } })
    const res = await call('badges')
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Dieser Abschnitt konnte nicht geladen werden.')
  })
})
