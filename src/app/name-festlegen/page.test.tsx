import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

class Redirect extends Error {
  constructor(public to: string) {
    super(to)
  }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Redirect(to)
  },
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('@/components/name-festlegen-form', () => ({ NameFestlegenForm: () => null }))

import { createClient } from '@/lib/supabase-server'
import NameFestlegenPage from './page'

function client(user: unknown, profile: unknown) {
  return chainMock(() => ({ data: profile }), { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }).client
}

async function target(): Promise<string | 'bleibt'> {
  try {
    await NameFestlegenPage()
    return 'bleibt'
  } catch (e) {
    if (e instanceof Redirect) return e.to
    throw e
  }
}

describe('Seite /name-festlegen (PROJ-121)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schickt nicht Angemeldete zum Login', async () => {
    vi.mocked(createClient).mockResolvedValue(client(null, null) as never)
    expect(await target()).toBe('/login')
  })

  it('schickt Azubis zur Start-Weiche', async () => {
    vi.mocked(createClient).mockResolvedValue(client({ id: 'u1' }, { role: 'student', first_name: null, last_name: null }) as never)
    expect(await target()).toBe('/start')
  })

  it('schickt Lehrer-Rollen mit Namen zur Start-Weiche (kein Dauer-Umleiten auf dem zweiten Gerät)', async () => {
    vi.mocked(createClient).mockResolvedValue(client({ id: 'u1' }, { role: 'teacher', first_name: 'Erika', last_name: 'Muster' }) as never)
    expect(await target()).toBe('/start')
  })

  it.each(['teacher', 'department_admin', 'admin'])('zeigt %s ohne Namen die Seite', async (role) => {
    vi.mocked(createClient).mockResolvedValue(client({ id: 'u1' }, { role, first_name: null, last_name: null }) as never)
    expect(await target()).toBe('bleibt')
  })
})
