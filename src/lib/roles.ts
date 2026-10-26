/**
 * Zentrale Rollen-Übersicht (PROJ-44): Welche Rolle darf in den
 * Lehrkräfte-Bereich, welche verwaltet Fachbereiche, wohin geht es nach dem
 * Login. Alle Stellen, die bisher einzeln „admin oder department_admin“
 * geprüft haben, fragen hier nach — damit keine vergessen wird.
 *
 * Reine Funktionen ohne Datenbankzugriff: die Rolle selbst wird weiterhin bei
 * jeder Anfrage frisch aus `profiles.role` gelesen.
 */

export type UserRole = 'student' | 'teacher' | 'department_admin' | 'admin'

/** Lehrer-Rollen: dürfen in den Lehrkräfte-Bereich, erscheinen in der Rangliste nur unter Pseudonym */
export type TeacherRole = Exclude<UserRole, 'student'>

/** Verwaltungs-Rollen: dürfen Fachbereichs-Inhalte verwalten (PROJ-24) */
export type ManagerRole = 'department_admin' | 'admin'

export const USER_ROLES: readonly UserRole[] = ['student', 'teacher', 'department_admin', 'admin']

export const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Azubi',
  teacher: 'Lehrkraft',
  department_admin: 'Bereichs-Admin',
  admin: 'Super-Admin',
}

export function isUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (USER_ROLES as readonly string[]).includes(role)
}

export function isTeacherRole(role: unknown): role is TeacherRole {
  return isUserRole(role) && role !== 'student'
}

export function isManagerRole(role: unknown): role is ManagerRole {
  return role === 'admin' || role === 'department_admin'
}

export const TEACHER_HOME_PATH = '/admin'
export const PLAYER_HOME_PATH = '/'

/** Neutrales Login-Ziel; verteilt nach Rolle (Start-Weiche) */
export const START_PATH = '/start'

/** Wohin die Start-Weiche nach dem Login schickt: alle Lehrer-Rollen in den Lehrkräfte-Bereich */
export function startPathFor(role: unknown): string {
  return isTeacherRole(role) ? TEACHER_HOME_PATH : PLAYER_HOME_PATH
}

/**
 * Seiten unter /admin, die eine reine Lehrkraft (ohne Verwaltungsrechte)
 * öffnen darf. Exakte Pfade bzw. Pfad-Präfixe; alles andere leitet zur
 * Übersicht um. Leistungsnachweise kommen mit PROJ-46 dazu.
 */
export const TEACHER_ADMIN_PATHS: readonly string[] = [TEACHER_HOME_PATH]

export function teacherMayOpenAdminPath(pathname: string): boolean {
  return TEACHER_ADMIN_PATHS.some((p) =>
    p === TEACHER_HOME_PATH ? pathname === p || pathname === p + '/' : pathname === p || pathname.startsWith(p + '/'),
  )
}

/** Darf diese Rolle die Seite unter /admin öffnen? */
export function mayOpenAdminPath(role: unknown, pathname: string): boolean {
  if (isManagerRole(role)) return true
  if (role === 'teacher') return teacherMayOpenAdminPath(pathname)
  return false
}

/**
 * Login-Ziel aus `?redirect=`/`?next=` bereinigen: nur Pfade innerhalb der App
 * (keine fremden Domains, kein `//evil.example`). Ohne Angabe → Start-Weiche.
 */
export function safeRedirectTarget(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return START_PATH
  return value
}
