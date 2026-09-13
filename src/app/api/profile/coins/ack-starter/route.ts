import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Marks the one-time starter-coins hint as seen (PROJ-19). Idempotent —
 * calling it again after the flag is already set is a harmless no-op.
 */
export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ starter_coins_seen: true })
    .eq('id', user.id)

  if (error) {
    console.error('[POST /api/profile/coins/ack-starter]', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
