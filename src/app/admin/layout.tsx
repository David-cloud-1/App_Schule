import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Toaster } from '@/components/ui/sonner'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { isTeacherRole } from '@/lib/roles'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, teacher_welcome_seen')
    .eq('id', user.id)
    .single()

  // Alle Lehrer-Rollen kommen in den Lehrkräfte-Bereich (PROJ-44). Welche
  // Seiten eine reine Lehrkraft öffnen darf, entscheidet die Middleware; die
  // Verwaltungs-Schnittstellen prüfen weiterhin requireAdmin().
  if (!profile || !isTeacherRole(profile.role)) redirect('/')
  const role = profile.role

  const isSuperAdmin = role === 'admin'
  // Einmaliger Willkommens-Hinweis nach der Freischaltung als Lehrkraft; gemerkt am Konto
  const showTeacherWelcome = role === 'teacher' && !profile.teacher_welcome_seen
  const displayName = profile.display_name ?? user.email ?? ''

  return (
    <AdminRoleProvider value={{ role, isSuperAdmin, displayName, showTeacherWelcome }}>
      <AdminShell displayName={displayName} isSuperAdmin={isSuperAdmin}>
        {children}
      </AdminShell>
      <Toaster />
    </AdminRoleProvider>
  )
}
