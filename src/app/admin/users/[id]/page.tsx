import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { UserDetailView } from '@/components/admin/user-detail/user-detail-view'
import { BLOCKED_PARAM, SUPER_ADMIN_ONLY_VALUE, TEACHER_HOME_PATH } from '@/lib/roles'

/**
 * Nutzer-Detailseite (PROJ-59): nur für den Super-Admin. Bereichs-Admins
 * landen mit Hinweis auf der Übersicht (Mechanismus aus PROJ-49). Die
 * Schnittstellen prüfen die Rolle unabhängig davon noch einmal.
 */
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    redirect(`${TEACHER_HOME_PATH}?${BLOCKED_PARAM}=${SUPER_ADMIN_ONLY_VALUE}`)
  }

  return <UserDetailView userId={id} ownId={user.id} />
}
