import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AbsenceTypesManager } from '@/components/admin/absence/absence-types-manager'

export const metadata = { title: 'Abwesenheitsarten' }

/** Nur für den Super-Admin; die Schnittstellen prüfen es zusätzlich selbst. */
export default async function AbsenceTypesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin')
  return <AbsenceTypesManager />
}
