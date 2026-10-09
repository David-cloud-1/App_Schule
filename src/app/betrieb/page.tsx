import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BetriebClient } from './betrieb-client'

export default async function BetriebPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <BetriebClient />
}
