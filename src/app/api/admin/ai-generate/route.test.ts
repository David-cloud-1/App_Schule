import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

// ── helpers ──────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: 'admin-uuid', email: 'admin@test.com' }
const ADMIN_PROFILE = { role: 'admin' }

function builder(overrides: Record<string, unknown> = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
}

function makeAdminClient(tableOverrides: Record<string, unknown> = {}) {
  const profileB = builder({ single: vi.fn().mockResolvedValue({ data: ADMIN_PROFILE, error: null }) })
  const auditB = builder({ insert: vi.fn().mockResolvedValue({ error: null }) })

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: ADMIN_USER } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileB
      if (table === 'admin_audit_log') return auditB
      if (tableOverrides[table]) return tableOverrides[table]
      return builder()
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
      }),
    },
  }
}

function makeUnauthClient() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminClient() {
  const profileB = builder({ single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }) })
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid' } } }) },
    from: vi.fn().mockReturnValue(profileB),
  }
}

function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

// ── GET /api/admin/ai-generate/jobs ──────────────────────────────────────────

describe('GET /api/admin/ai-generate/jobs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { GET } = await import('./jobs/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminClient() as never)
    const { GET } = await import('./jobs/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns jobs list for admin', async () => {
    const jobsData = [{ id: 'job-1', filename: 'test.pdf', status: 'completed' }]
    const jobsB = {
      ...builder(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: jobsData, error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ generation_jobs: jobsB }) as never)
    const { GET } = await import('./jobs/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.jobs).toHaveLength(1)
  })
})

// ── GET /api/admin/ai-generate/drafts ────────────────────────────────────────

describe('GET /api/admin/ai-generate/drafts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { GET } = await import('./drafts/route')
    const res = await GET(new NextRequest('http://localhost/api/admin/ai-generate/drafts'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid status filter', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const { GET } = await import('./drafts/route')
    const req = new NextRequest('http://localhost/api/admin/ai-generate/drafts?status=invalid')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns paginated drafts', async () => {
    const draftsData = [{ id: 'draft-1', question_text: 'Frage?', status: 'pending' }]
    const draftsB = {
      ...builder(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: draftsData, error: null, count: 1 }),
    }
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { GET } = await import('./drafts/route')
    const req = new NextRequest('http://localhost/api/admin/ai-generate/drafts')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.drafts).toHaveLength(1)
    expect(body.total).toBe(1)
  })
})

// ── PUT /api/admin/ai-generate/drafts/[id] ───────────────────────────────────

describe('PUT /api/admin/ai-generate/drafts/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { PUT } = await import('./drafts/[id]/route')
    const res = await PUT(jsonReq('/api/admin/ai-generate/drafts/draft-1', 'PUT', {}), {
      params: Promise.resolve({ id: 'draft-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when draft not found', async () => {
    const draftsB = builder({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { PUT } = await import('./drafts/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/ai-generate/drafts/draft-1', 'PUT', { question_text: 'Neu' }),
      { params: Promise.resolve({ id: 'draft-1' }) }
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 when draft is already accepted', async () => {
    const draftsB = builder({
      single: vi.fn().mockResolvedValue({ data: { id: 'draft-1', status: 'accepted' }, error: null }),
    })
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { PUT } = await import('./drafts/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/ai-generate/drafts/draft-1', 'PUT', { question_text: 'Neu' }),
      { params: Promise.resolve({ id: 'draft-1' }) }
    )
    expect(res.status).toBe(409)
  })
})

// ── POST /api/admin/ai-generate/drafts/[id]/reject ───────────────────────────

describe('POST /api/admin/ai-generate/drafts/[id]/reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { POST } = await import('./drafts/[id]/reject/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/draft-1/reject', 'POST'), {
      params: Promise.resolve({ id: 'draft-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when draft not found', async () => {
    const draftsB = builder({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { POST } = await import('./drafts/[id]/reject/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/draft-1/reject', 'POST'), {
      params: Promise.resolve({ id: 'draft-1' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects a pending draft', async () => {
    // select().eq().single() → returns draft; update().eq() → returns error:null
    const selectChain = {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'draft-1', status: 'pending' }, error: null }),
      }),
    }
    const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) }
    const draftsB = {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
    }
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { POST } = await import('./drafts/[id]/reject/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/draft-1/reject', 'POST'), {
      params: Promise.resolve({ id: 'draft-1' }),
    })
    expect(res.status).toBe(200)
  })
})

// ── POST /api/admin/ai-generate/drafts/bulk-reject ───────────────────────────

describe('POST /api/admin/ai-generate/drafts/bulk-reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { POST } = await import('./drafts/bulk-reject/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/bulk-reject', 'POST', { draft_ids: ['550e8400-e29b-41d4-a716-446655440000'] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when draft_ids is empty', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const { POST } = await import('./drafts/bulk-reject/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/bulk-reject', 'POST', { draft_ids: [] }))
    expect(res.status).toBe(400)
  })

  it('rejects multiple drafts', async () => {
    const draftsB = {
      ...builder(),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createClient).mockResolvedValue(makeAdminClient({ questions_draft: draftsB }) as never)
    const { POST } = await import('./drafts/bulk-reject/route')
    const ids = ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/bulk-reject', 'POST', { draft_ids: ids }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rejected).toBe(2)
  })
})

// ── POST /api/admin/ai-generate/drafts/bulk-accept ───────────────────────────

describe('POST /api/admin/ai-generate/drafts/bulk-accept', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const { POST } = await import('./drafts/bulk-accept/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/bulk-accept', 'POST', {
      draft_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when draft_ids is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const { POST } = await import('./drafts/bulk-accept/route')
    const res = await POST(jsonReq('/api/admin/ai-generate/drafts/bulk-accept', 'POST', {}))
    expect(res.status).toBe(400)
  })
})
