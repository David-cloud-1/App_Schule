import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('@/components/admin/user-detail/user-detail-view', () => ({
  UserDetailView: (props: { userId: string; ownId: string }) => ({ type: 'UserDetailView', props }),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  }),
}))

import AdminUserDetailPage from './page'
import { createClient } from '@/lib/supabase-server'

function client(user: { id: string } | null, role?: string) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: role ? { role } : null }) }) }) }),
  } as never)
}

const params = Promise.resolve({ id: 'u1' })

describe('/admin/users/[id] – Zugang (PROJ-59)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ohne Login: zur Anmeldung', async () => {
    client(null)
    await expect(AdminUserDetailPage({ params })).rejects.toThrow('REDIRECT:/login')
  })

  it.each(['department_admin', 'teacher', 'student'])('%s: Umleitung zur Übersicht mit Hinweis „Super-Admin“', async (role) => {
    client({ id: 'x' }, role)
    await expect(AdminUserDetailPage({ params })).rejects.toThrow('REDIRECT:/admin?gesperrt=super')
  })

  it('Super-Admin: zeigt die Detailseite mit der eigenen Id', async () => {
    client({ id: 'me' }, 'admin')
    const result = (await AdminUserDetailPage({ params })) as unknown as { props: { userId: string; ownId: string } }
    expect(result.props).toMatchObject({ userId: 'u1', ownId: 'me' })
  })
})
