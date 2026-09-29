import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { randomPseudonym } from '@/lib/pseudonyms'
import { getDepartmentForUser } from '@/lib/departments'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  // Nomen des eigenen Fachbereichs (PROJ-22)
  const department = await getDepartmentForUser(supabase, user.id)
  const nouns = department?.pseudonymNouns ?? []

  let pseudonym = ''
  for (let i = 0; i < 30; i++) {
    const candidate = randomPseudonym(nouns)
    const { data } = await service
      .from('profiles')
      .select('id')
      .eq('pseudonym', candidate)
      .maybeSingle()
    if (!data) { pseudonym = candidate; break }
  }

  if (!pseudonym) {
    return NextResponse.json({ error: 'Kein eindeutiger Name gefunden' }, { status: 500 })
  }

  const { error } = await service
    .from('profiles')
    .update({ pseudonym })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pseudonym })
}
