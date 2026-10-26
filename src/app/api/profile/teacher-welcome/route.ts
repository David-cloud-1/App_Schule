import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Merkt am eigenen Konto, dass der einmalige Willkommens-Hinweis für
 * Lehrkräfte gesehen wurde (PROJ-44). Schreibt nur die eigene Zeile und nur
 * dieses Feld (Spalten-Grant); `role` bleibt für Nutzer nicht schreibbar.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({ teacher_welcome_seen: true })
    .eq('id', user.id)

  if (error) {
    console.error('[POST /api/profile/teacher-welcome]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
