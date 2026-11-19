import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { hasPersonName, isTeacherRole, NAME_REQUIRED_PATH, startPathFor } from '@/lib/roles'

/**
 * Start-Weiche (PROJ-44): neutrales Ziel nach dem Login. Lehrer-Rollen ohne Namen (PROJ-121) zuerst bei der Namens-Pflicht, sonst landen
 * im Lehrkräfte-Bereich, Azubis auf der Spieler-Startseite. Bewusst eine eigene
 * Adresse statt einer Umleitung auf `/` — sonst käme eine Lehrkraft über
 * „Zur Lern-App“ nie mehr in die Lern-App.
 */
export default async function StartPage() {
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
  // Pflicht-Name (PROJ-121): Lehrer-Rollen ohne Namen zuerst dorthin
  if (isTeacherRole(row?.role) && !hasPersonName(row)) redirect(NAME_REQUIRED_PATH)

  redirect(startPathFor(row?.role))
}
