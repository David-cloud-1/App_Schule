import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { startPathFor } from '@/lib/roles'

/**
 * Start-Weiche (PROJ-44): neutrales Ziel nach dem Login. Lehrer-Rollen landen
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
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  redirect(startPathFor((profile as { role?: string } | null)?.role))
}
