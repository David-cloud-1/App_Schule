import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  isManagerRole,
  isTeacherRole,
  mayOpenAdminPath,
  NO_ACCESS_MESSAGE,
  NO_ACCESS_PARAM,
  NO_RIGHTS_MESSAGE,
  START_PATH,
  TEACHER_HOME_PATH,
  teacherMayCallApiPath,
} from '@/lib/roles'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/register', '/forgot-password', '/auth/callback']
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Redirect unauthenticated users to login (API routes get 401 JSON).
  // Preserve the originally requested path (e.g. /pruefung/ABCD) as ?redirect=
  // so the login/register flow can send the user back where they came from —
  // important for the graded-assessment join link (PROJ-21).
  if (!user && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
    }
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages — über die Start-Weiche,
  // die nach Rolle verteilt (PROJ-44)
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = START_PATH
    return NextResponse.redirect(url)
  }

  // Lehrkräfte-Bereich (PROJ-44): alle Lehrer-Rollen dürfen hinein, eine reine
  // Lehrkraft aber nur auf die freigegebenen Seiten; die Verwaltungs-Schnittstellen
  // (/api/admin) bleiben Bereichs-Admin und Super-Admin vorbehalten (zusätzlich
  // prüft jede Route requireAdmin()).
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role
    if (!isTeacherRole(role)) {
      // Rolle fehlt oder wurde entzogen: verständliche Meldung statt stummer Umleitung (QA BUG-4)
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: NO_ACCESS_MESSAGE }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.search = `?${NO_ACCESS_PARAM}=1`
      return NextResponse.redirect(url)
    }
    if (!isManagerRole(role)) {
      if (pathname.startsWith('/api/')) {
        // PROJ-46: die Nachweis-Routen sind das eine Tor, durch das eine
        // reine Lehrkraft in die Verwaltungs-Schnittstellen darf — jede
        // Route prüft das selbst noch einmal mit requireTeacherOrAdmin().
        if (!teacherMayCallApiPath(pathname)) {
          return NextResponse.json({ error: NO_RIGHTS_MESSAGE }, { status: 403 })
        }
      } else if (!mayOpenAdminPath(role, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = TEACHER_HOME_PATH
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
