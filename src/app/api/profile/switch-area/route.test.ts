import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/linked-account', () => ({
  getLinkContext: vi.fn(),
  ensureLinkedUser: vi.fn(),
}))
vi.mock('@/app/api/admin/_lib/auth', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { ensureLinkedUser, getLinkContext } from '@/lib/linked-account'
import { writeAuditLog } from '@/app/api/admin/_lib/auth'

const MAIN_ID = 'main-user-id'
const LINKED_ID = 'linked-user-id'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeSessionClient(user: unknown, verifyError: unknown = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      verifyOtp: vi.fn().mockResolvedValue({ error: verifyError }),
    },
  }
}

function makeServiceClient(opts: { email?: string | null; tokenHash?: string | null } = {}) {
  const email = opts.email === undefined ? 'target@test.invalid' : opts.email
  const tokenHash = opts.tokenHash === undefined ? 'hash-123' : opts.tokenHash
  return {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: email ? { email } : null }, error: null }),
        generateLink: vi.fn().mockResolvedValue({
          data: tokenHash ? { properties: { hashed_token: tokenHash } } : null,
          error: tokenHash ? null : { message: 'boom' },
        }),
      },
    },
  }
}

describe('POST /api/profile/switch-area', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSessionClient(null) as never)
    const res = await POST(makeRequest({ target: 'linked' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid target', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSessionClient({ id: MAIN_ID }) as never)
    const res = await POST(makeRequest({ target: 'someone-else' }))
    expect(res.status).toBe(400)
    expect(getLinkContext).not.toHaveBeenCalled()
  })

  it('rejects a target given as account id (no foreign accounts)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSessionClient({ id: MAIN_ID }) as never)
    const res = await POST(makeRequest({ target: LINKED_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 403 for an account without switch rights', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSessionClient({ id: 'student' }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    vi.mocked(getLinkContext).mockResolvedValue(null)
    const res = await POST(makeRequest({ target: 'linked' }))
    expect(res.status).toBe(403)
    expect(ensureLinkedUser).not.toHaveBeenCalled()
  })

  it('is a no-op when already in the target account', async () => {
    const session = makeSessionClient({ id: MAIN_ID })
    vi.mocked(createClient).mockResolvedValue(session as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    vi.mocked(getLinkContext).mockResolvedValue({ mainUserId: MAIN_ID, current: 'main' })
    const res = await POST(makeRequest({ target: 'main' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, switched: false })
    expect(session.auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('switches from main to the linked account and creates it if needed', async () => {
    const session = makeSessionClient({ id: MAIN_ID })
    const service = makeServiceClient()
    vi.mocked(createClient).mockResolvedValue(session as never)
    vi.mocked(createServiceClient).mockReturnValue(service as never)
    vi.mocked(getLinkContext).mockResolvedValue({ mainUserId: MAIN_ID, current: 'main' })
    vi.mocked(ensureLinkedUser).mockResolvedValue(LINKED_ID)

    const res = await POST(makeRequest({ target: 'linked' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, switched: true })
    expect(ensureLinkedUser).toHaveBeenCalledWith(service, MAIN_ID)
    expect(service.auth.admin.getUserById).toHaveBeenCalledWith(LINKED_ID)
    expect(session.auth.verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'hash-123' })
    expect(writeAuditLog).toHaveBeenCalledWith(
      service,
      expect.objectContaining({
        admin_id: MAIN_ID,
        action_type: 'switch_area',
        object_id: LINKED_ID,
        details: { from: 'main', to: 'linked' },
      }),
    )
  })

  it('switches from the linked account back to the main account', async () => {
    const session = makeSessionClient({ id: LINKED_ID })
    const service = makeServiceClient()
    vi.mocked(createClient).mockResolvedValue(session as never)
    vi.mocked(createServiceClient).mockReturnValue(service as never)
    vi.mocked(getLinkContext).mockResolvedValue({ mainUserId: MAIN_ID, current: 'linked' })

    const res = await POST(makeRequest({ target: 'main' }))
    expect(res.status).toBe(200)
    expect(service.auth.admin.getUserById).toHaveBeenCalledWith(MAIN_ID)
    expect(ensureLinkedUser).not.toHaveBeenCalled()
    expect(writeAuditLog).toHaveBeenCalledWith(
      service,
      expect.objectContaining({ details: { from: 'linked', to: 'main' } }),
    )
  })

  it('returns 500 and keeps the session when the token cannot be redeemed', async () => {
    const session = makeSessionClient({ id: MAIN_ID }, { message: 'expired' })
    vi.mocked(createClient).mockResolvedValue(session as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    vi.mocked(getLinkContext).mockResolvedValue({ mainUserId: MAIN_ID, current: 'main' })
    vi.mocked(ensureLinkedUser).mockResolvedValue(LINKED_ID)

    const res = await POST(makeRequest({ target: 'linked' }))
    expect(res.status).toBe(500)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('returns 500 when no login token can be generated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSessionClient({ id: MAIN_ID }) as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient({ tokenHash: null }) as never)
    vi.mocked(getLinkContext).mockResolvedValue({ mainUserId: MAIN_ID, current: 'main' })
    vi.mocked(ensureLinkedUser).mockResolvedValue(LINKED_ID)

    const res = await POST(makeRequest({ target: 'linked' }))
    expect(res.status).toBe(500)
  })
})
