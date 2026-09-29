import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { resolveDepartment, type Department } from '@/lib/departments'

/**
 * Bereich des aktuellen Seitenaufrufs — einmal pro Anfrage geladen, auch
 * wenn Layout, Metadaten und Seite ihn jeweils abfragen.
 */
export const getCurrentDepartment = cache(async (): Promise<Department | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const h = await headers()
  return resolveDepartment(supabase, {
    userId: user?.id ?? null,
    host: h.get('x-forwarded-host') ?? h.get('host'),
  })
})
