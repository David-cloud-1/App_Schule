import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { assignDepartmentIfMissing } from '@/lib/departments-server'
import { safeRedirectTarget } from '@/lib/roles'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Ohne Ziel → Start-Weiche (PROJ-44). Nur Pfade innerhalb der App, sonst
  // würde z. B. `next=@fremde-seite.de` aus der eigenen Adresse eine fremde machen.
  const next = safeRedirectTarget(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Neues Profil dem Bereich dieser Adresse zuordnen (PROJ-23) — nur wenn
      // es noch keinen hat. Ein Fehler hier blockiert den Login nicht; der
      // nächste Seitenaufruf versucht es erneut.
      if (data?.user) {
        try {
          await assignDepartmentIfMissing(data.user.id, request.headers.get('x-forwarded-host') ?? new URL(request.url).host)
        } catch (err) {
          console.error('[auth/callback] assign department', err)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code exchange fails, redirect to login with an error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
