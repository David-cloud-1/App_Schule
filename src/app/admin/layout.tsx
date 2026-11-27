import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { isTeacherRole } from '@/lib/roles'
import { resolveContentScope, resolveSuperAdminDepartment } from '@/app/api/admin/_lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'
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
    .select('role, display_name, teacher_welcome_seen, department_id')
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

  let subjectCount: number | undefined
  if (role === 'teacher') {
    const { count } = await supabase
      .from('teacher_subject_assignments')
      .select('teacher_id', { count: 'exact', head: true })
      .eq('teacher_id', user.id)
    subjectCount = count ?? 0
  }

  // Darstellung und Seitenleiste kommen aus Cookies, damit die Seite gleich richtig erscheint (PROJ-45)
  const cookieStore = await cookies()
  const initialTheme = parseWorkspaceTheme(cookieStore.get(WORKSPACE_THEME_COOKIE)?.value)
  const sidebarOpen = parseSidebarOpen(cookieStore.get(SIDEBAR_STATE_COOKIE)?.value)

  // Bereichsleiste (PROJ-70): dieselbe Auflösung wie in den Inhalts-Routen
  const { data: departmentRows } = await supabase.from('departments').select('id, name, code, is_active').order('name')
  const departments = ((departmentRows ?? []) as { id: string; name: string; code: string; is_active?: boolean | null }[]).map(
    ({ is_active, ...d }) => ({ ...d, isActive: is_active !== false }),
  )
  const current = await resolveContentScope(
    supabase as unknown as SupabaseClient,
    isSuperAdmin,
    (profile as { department_id?: string | null }).department_id ?? null,
    departments.map((d) => d.id)
  )
  // PROJ-130: Bei „Alle Bereiche“ zeigen Nutzer, Einstellungen und Shop dem Super-Admin
  // trotzdem einen Bereich — den nennt der Umschalter dort
  const workingDepartmentId =
    isSuperAdmin && !current
      ? await resolveSuperAdminDepartment(
          supabase as unknown as SupabaseClient,
          (profile as { department_id?: string | null }).department_id ?? null,
        )
      : null
  const scope = { current: current?.[0] ?? null, departments, workingDepartmentId }

  return (
    <AdminRoleProvider value={{ role, isSuperAdmin, displayName, email: user.email ?? '', showTeacherWelcome, subjectCount, scope }}>
      <AdminShell initialTheme={initialTheme} sidebarOpen={sidebarOpen}>
        {children}
      </AdminShell>
    </AdminRoleProvider>
  )
}
