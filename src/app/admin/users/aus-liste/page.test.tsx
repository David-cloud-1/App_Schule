import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('@/components/admin/bulk-account-import', () => ({
  BulkAccountImport: () => ({ type: 'BulkAccountImport' }),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  }),
}))

import AdminBulkCreateAccountsPage from './page'
import { createClient } from '@/lib/supabase-server'

function client(user: { id: string } | null, role?: string) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: role ? { role } : null }) }) }) }),
  } as never)
}

describe('/admin/users/aus-liste – Zugang (PROJ-62)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ohne Login: zur Anmeldung', async () => {
    client(null)
    await expect(AdminBulkCreateAccountsPage()).rejects.toThrow('REDIRECT:/login')
  })

  it.each(['department_admin', 'teacher', 'student'])(
    '%s: Umleitung zur Übersicht mit Hinweis „Super-Admin“',
    async (role) => {
      client({ id: 'x' }, role)
      await expect(AdminBulkCreateAccountsPage()).rejects.toThrow('REDIRECT:/admin?gesperrt=super')
    },
  )

  it('Super-Admin: zeigt die Seite zum Anlegen aus einer Liste', async () => {
    client({ id: 'me' }, 'admin')
    const result = (await AdminBulkCreateAccountsPage()) as unknown as { type: string }
    expect(result.type).toBeDefined()
  })
})
