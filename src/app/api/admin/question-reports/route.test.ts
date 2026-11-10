import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, type ChainCall } from '@/test/supabase-chain-mock'

vi.mock('../_lib/auth', () => ({ requireContentAdmin: vi.fn() }))
import { requireContentAdmin } from '../_lib/auth'
import { GET } from './route'

function setup(scope: string[] | null) {
  const seen: ChainCall[][] = []
  const m = chainMock((table, calls) => {
    if (table === 'question_report_groups') seen.push(calls)
    return { data: [], count: 0 }
  })
  vi.mocked(requireContentAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u-1' },
    supabase: m.client,
    scopeDepartmentIds: scope,
  } as never)
  return seen
}

const call = (qs = '') => GET(new NextRequest(`http://localhost/api/admin/question-reports${qs}`))

beforeEach(() => vi.clearAllMocks())

describe('GET /api/admin/question-reports – Bereich (QA PROJ-73 B1)', () => {
  it('zeigt nur Meldungen des Bereichs der Bereichsleiste', async () => {
    const seen = setup(['dep-sped'])
    expect((await call()).status).toBe(200)
    expect(seen[0].find((c) => c.method === 'in' && c.args[0] === 'department_id')?.args[1]).toEqual(['dep-sped'])
  })

  it('filtert in „Alle Bereiche“ nicht nach Bereich', async () => {
    const seen = setup(null)
    await call()
    expect(seen[0].some((c) => c.args[0] === 'department_id')).toBe(false)
  })

  it('lässt einen ausdrücklich gewählten Bereich vorgehen', async () => {
    const seen = setup(['dep-sped'])
    const dep = '22222222-2222-4222-8222-222222222222'
    await call(`?department=${dep}`)
    expect(seen[0].find((c) => c.method === 'eq' && c.args[0] === 'department_id')?.args[1]).toBe(dep)
    expect(seen[0].some((c) => c.method === 'in' && c.args[0] === 'department_id')).toBe(false)
  })
})
