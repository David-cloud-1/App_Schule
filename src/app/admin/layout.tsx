import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { isTeacherRole } from '@/lib/roles'
import {
  parseSidebarOpen,
  parseWorkspaceTheme,
  SIDEBAR_STATE_COOKIE,
  WORKSPACE_THEME_COOKIE,
} from '@/lib/workspace-theme'

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

  // Darstellung und Seitenleiste kommen aus Cookies, damit die Seite gleich richtig erscheint (PROJ-45)
  const cookieStore = await cookies()
  const initialTheme = parseWorkspaceTheme(cookieStore.get(WORKSPACE_THEME_COOKIE)?.value)
  const sidebarOpen = parseSidebarOpen(cookieStore.get(SIDEBAR_STATE_COOKIE)?.value)

  return (
    <AdminRoleProvider value={{ role, isSuperAdmin, displayName, email: user.email ?? '', showTeacherWelcome }}>
      <AdminShell initialTheme={initialTheme} sidebarOpen={sidebarOpen}>
        {children}
      </AdminShell>
    </AdminRoleProvider>
  )
}
