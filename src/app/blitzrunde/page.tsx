import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BlitzRoundClient } from './blitz-round-client'

export default async function BlitzrundePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <BlitzRoundClient />
}
