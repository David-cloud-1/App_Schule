import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BulkAccountImport } from '@/components/admin/bulk-account-import'
import { BLOCKED_PARAM, SUPER_ADMIN_ONLY_VALUE, TEACHER_HOME_PATH } from '@/lib/roles'

/**
 * Konten aus CSV-Liste anlegen (PROJ-62): nur für den Super-Admin. Alle anderen
 * landen mit Hinweis auf der Übersicht (Mechanismus aus PROJ-49/59). Die
 * Schnittstellen prüfen die Rolle unabhängig davon noch einmal.
 */
export default async function AdminBulkCreateAccountsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    redirect(`${TEACHER_HOME_PATH}?${BLOCKED_PARAM}=${SUPER_ADMIN_ONLY_VALUE}`)
  }

  return <BulkAccountImport />
}
