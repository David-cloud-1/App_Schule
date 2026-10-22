/**
 * Regeln der Spieler-Navigation (PROJ-41): wo sie erscheint und welcher
 * Eintrag aktiv ist. Laufende Sessions (Quiz, Blitzrunde, Prüfung,
 * Leistungsnachweis) bleiben bewusst ohne Leiste.
 */
const NAV_PATHS = ['/', '/subjects', '/betrieb', '/shop', '/leaderboard', '/profile', '/exam', '/exam-history', '/leistungsnachweise']

/** Fachseiten der Lernbibliothek (PROJ-43): /subjects/stg … */
const SUBJECT_PAGE = /^\/subjects\/[^/]+$/

function normalize(pathname: string | null): string {
  if (!pathname) return ''
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

export function showBottomNav(pathname: string | null): boolean {
  const path = normalize(pathname)
  return NAV_PATHS.includes(path) || SUBJECT_PAGE.test(path)
}

/** Href des aktiven Eintrags; `betriebHref` ist /betrieb oder (ohne Betrieb) /shop. */
export function bottomNavActiveHref(pathname: string | null, betriebHref: string): string | null {
  const path = normalize(pathname)
  if (SUBJECT_PAGE.test(path)) return '/subjects'
  switch (path) {
    case '/':
      return '/'
    case '/subjects':
    case '/exam':
    case '/exam-history':
    case '/leistungsnachweise':
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
