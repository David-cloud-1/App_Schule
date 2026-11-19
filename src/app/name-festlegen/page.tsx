import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { hasPersonName, isTeacherRole, START_PATH } from '@/lib/roles'
import { parseWorkspaceTheme, WORKSPACE_THEME_COOKIE } from '@/lib/workspace-theme'
import { NameFestlegenForm } from '@/components/name-festlegen-form'

/**
 * Pflicht-Seite für Lehrer-Rollen ohne Namen (PROJ-121). Wer sie nicht braucht
 * (Azubi, Rolle entzogen oder Name schon da), geht auf die Start-Weiche, die
 * nach Rolle verteilt. Die Prüfung läuft bei jedem Aufruf auf dem Server.
 */
export default async function NameFestlegenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle()
  const row = profile as { role?: string; first_name?: string | null; last_name?: string | null } | null
  if (!isTeacherRole(row?.role) || hasPersonName(row)) redirect(START_PATH)

  const cookieStore = await cookies()
  const theme = parseWorkspaceTheme(cookieStore.get(WORKSPACE_THEME_COOKIE)?.value)

  return (
    <NameFestlegenForm
      initialFirstName={row?.first_name?.trim() ?? ''}
      initialLastName={row?.last_name?.trim() ?? ''}
      theme={theme}
    />
  )
}
