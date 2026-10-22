/**
 * Regeln der Spieler-Navigation (PROJ-41): wo sie erscheint und welcher
 * Eintrag aktiv ist. Laufende Sessions (Quiz, Blitzrunde, Prüfung,
 * Leistungsnachweis) bleiben bewusst ohne Leiste.
 */
const NAV_PATHS = ['/', '/subjects', '/betrieb', '/shop', '/leaderboard', '/profile', '/exam', '/exam-history']

function normalize(pathname: string | null): string {
  if (!pathname) return ''
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

export function showBottomNav(pathname: string | null): boolean {
  return NAV_PATHS.includes(normalize(pathname))
}

/** Href des aktiven Eintrags; `betriebHref` ist /betrieb oder (ohne Betrieb) /shop. */
export function bottomNavActiveHref(pathname: string | null, betriebHref: string): string | null {
  switch (normalize(pathname)) {
    case '/':
      return '/'
    case '/subjects':
    case '/exam':
    case '/exam-history':
      return '/subjects'
    case '/betrieb':
    case '/shop':
      return betriebHref
    case '/leaderboard':
      return '/leaderboard'
    case '/profile':
      return '/profile'
    default:
      return null
  }
}
