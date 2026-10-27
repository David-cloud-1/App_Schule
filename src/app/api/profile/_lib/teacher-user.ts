import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { isTeacherRole } from '@/lib/roles'

/**
 * Anmeldung und Rolle für „Mein Konto“ (PROJ-50): Die Schnittstellen unter
 * /api/profile/{kuerzel,password,email} gehören zum Lehrkräfte-Profil und
 * stehen deshalb nur Lehrer-Rollen offen (Azubis nutzen „Passwort vergessen“).
 */
export async function requireTeacherRoleUser(): Promise<
  { error: NextResponse; supabase: null; user: null } | { error: null; supabase: SupabaseClient; user: User }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null, user: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null, user: null }
  }
  return { error: null, supabase: supabase as unknown as SupabaseClient, user }
}
