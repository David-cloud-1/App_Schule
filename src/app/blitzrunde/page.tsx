import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BlitzClient } from './blitz-client'

export default async function BlitzrundePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <BlitzClient />
}
