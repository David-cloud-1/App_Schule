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

/** Ein Satz, was die Rolle darf (Konto-Menü, PROJ-49) */
export const ROLE_DESCRIPTION: Record<TeacherRole, string> = {
  teacher: 'Du pflegst Inhalte deiner Fächer und führst Leistungsnachweise durch.',
  department_admin: 'Du verwaltest Inhalte, Nutzer und Einstellungen deines Fachbereichs.',
  admin: 'Du verwaltest alle Fachbereiche, Nutzer und Rollen.',
}

/**
 * Umfang der Inhalts-Seiten in einem Satz (PROJ-49): was die Rolle dort sieht.
 * Reine Anzeige — was sie darf, entscheidet weiterhin der Server.
 */
export function contentScopeText(role: TeacherRole, departmentName = ''): string {
  if (role === 'teacher') return 'Du siehst nur Inhalte deiner Fächer.'
  if (role === 'department_admin') {
    return departmentName ? `Du siehst den ganzen Bereich ${departmentName}.` : 'Du siehst den ganzen Bereich.'
  }
  return departmentName ? `Du siehst den Bereich ${departmentName}.` : 'Du siehst alle Bereiche.'
}

/** Kurzform für die Gruppe „Inhalte“ in der Navigation */
export function contentScopeShort(role: TeacherRole): string {
  return role === 'teacher' ? 'deine Fächer' : role === 'department_admin' ? 'ganzer Bereich' : 'alle Bereiche'
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

/** Hinweis-Parameter: Die Startseite erklärt, dass der Zugang zum Lehrkräfte-Bereich fehlt (QA BUG-4) */
export const NO_ACCESS_PARAM = 'kein-zugang'

export const NO_ACCESS_MESSAGE = 'Du hast keinen Zugang zum Lehrkräfte-Bereich.'
/** Hinweis-Parameter: Eine Lehrkraft wurde von einer Verwaltungsseite zur Übersicht umgeleitet (PROJ-49) */
export const BLOCKED_PARAM = 'gesperrt'

export const BLOCKED_PAGE_MESSAGE = 'Das verwaltet dein Bereichs-Admin.'

export const NO_RIGHTS_MESSAGE = 'Dafür fehlen dir die Rechte. Das kann nur ein Administrator.'
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
 * Übersicht um. Leistungsnachweise (PROJ-46): eigene Nachweise anlegen,
 * durchführen und auswerten. Fragen/Fächer/Themen/Prüfungssimulation/
 * Papierkorb (PROJ-48): feinere Prüfung je Fach-Zuständigkeit übernehmen
 * die API-Routen (`requireContentAdmin`) — hier geht es nur darum, dass eine
 * Lehrkraft die Seite überhaupt öffnen darf, auch bevor sie unter „Meine
 * Fächer" ihre erste Zuständigkeit eingetragen hat.
 */
export const TEACHER_ADMIN_PATHS: readonly string[] = [
  TEACHER_HOME_PATH,
  '/admin/leistungsnachweise',
  '/admin/my-subjects',
  // PROJ-50: „Mein Konto“ — das Profil jeder Lehrer-Rolle
  '/admin/konto',
  '/admin/questions',
  '/admin/subjects',
  '/admin/topics',
  '/admin/exam-sets',
  '/admin/papierkorb',
  // PROJ-51: Werkzeugkiste — jede Lehrer-Rolle, auch ohne Fachbereich oder Fach
  '/admin/werkzeugkiste',
  // PROJ-63: Lehrerzimmer — jede Lehrer-Rolle, auch ohne Fachbereich oder Fach
  '/admin/lehrerzimmer',
]

export function teacherMayOpenAdminPath(pathname: string): boolean {
  return TEACHER_ADMIN_PATHS.some((p) =>
    p === TEACHER_HOME_PATH ? pathname === p || pathname === p + '/' : pathname === p || pathname.startsWith(p + '/'),
  )
}

/**
 * Verwaltungs-Schnittstellen (/api/admin/**), die eine reine Lehrkraft
 * aufrufen darf (PROJ-46) — die Nachweis-Routen, über die die Seiten unter
 * `/admin/leistungsnachweise` laufen. Jede Route prüft selbst noch einmal
 * mit `requireTeacherOrAdmin()`; dies hier ist nur das Tor in der Middleware.
 * Alle anderen `/api/admin/**`-Routen bleiben Bereichs-Admin und Super-Admin
 * vorbehalten.
 */
export const TEACHER_API_PATH_PREFIXES: readonly string[] = [
  '/api/admin/assessments',
  '/api/admin/my-subjects',
  '/api/admin/questions',
  '/api/admin/subjects',
  '/api/admin/topics',
  '/api/admin/exam-sets',
  '/api/admin/question-prompt',
  '/api/admin/trash',
  '/api/admin/content-history',
  // PROJ-51: Werkzeugkiste-Abläufe (jede Route prüft requireTeacherOrAdmin, eigene Abläufe per RLS)
  '/api/admin/werkzeugkiste',
  // PROJ-63: Lehrerzimmer (jede Route prüft requireTeacherOrAdmin, die Datenbank die Rolle)
  '/api/admin/lehrerzimmer',
]

export function teacherMayCallApiPath(pathname: string): boolean {
  return TEACHER_API_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/** Darf diese Rolle die Seite unter /admin öffnen? */
export function mayOpenAdminPath(role: unknown, pathname: string): boolean {
  if (isManagerRole(role)) return true
  if (role === 'teacher') return teacherMayOpenAdminPath(pathname)
  return false
}

/** Platzhalter-Herkunft für die Endkontrolle in `safeRedirectTarget` */
const REDIRECT_CHECK_ORIGIN = 'http://app.invalid'

/** Steuerzeichen (Tab, Zeilenumbruch, …) und Backslash: Der Browser entfernt bzw. wertet sie um */
const UNSAFE_REDIRECT_CHARS = /[\u0000-\u001f\u007f\\]/

/**
 * Login-Ziel aus `?redirect=`/`?next=` bereinigen: nur Pfade innerhalb der App
 * (keine fremden Domains). Ohne Angabe oder bei Verdacht → Start-Weiche.
 *
 * Tücken, die hier abgefangen werden: Der Browser entfernt Tab und Zeilenumbruch
 * aus Adressen (`/<Tab>/evil.example` wird zu `//evil.example`) und liest `\`
 * wie `/`. Deshalb wird solches Zeichen komplett abgelehnt und das Ergebnis
 * zum Schluss noch einmal als Adresse ausgewertet: Es muss auf derselben
 * Herkunft bleiben.
 */
export function safeRedirectTarget(value: string | null | undefined): string {
  if (!value) return START_PATH
  if (UNSAFE_REDIRECT_CHARS.test(value)) return START_PATH
  if (!value.startsWith('/') || value.startsWith('//')) return START_PATH
  try {
    if (new URL(value, REDIRECT_CHECK_ORIGIN).origin !== REDIRECT_CHECK_ORIGIN) return START_PATH
  } catch {
    return START_PATH
  }
  return value
}

/**
 * Pflichtwechsel nach „Passwort neu vergeben“ (PROJ-58): Merker in den
 * geschützten Konto-Daten (`app_metadata`), den nur der Server setzen und
 * entfernen kann. Der Proxy schickt markierte Konten auf CHANGE_PASSWORD_PATH.
 */
export const MUST_CHANGE_PASSWORD_FLAG = 'must_change_password'

export const CHANGE_PASSWORD_PATH = '/passwort-festlegen'

/** Schnittstelle, über die die Person ihr eigenes Passwort setzt (auch „Passwort vergessen“) */
export const CHANGE_PASSWORD_API_PATH = '/api/account/password'

export function mustChangePassword(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  return user?.app_metadata?.[MUST_CHANGE_PASSWORD_FLAG] === true
}

/** Was ein markiertes Konto vor dem Pflichtwechsel noch erreichen darf */
export function allowedDuringPasswordChange(pathname: string): boolean {
  return (
    pathname === CHANGE_PASSWORD_PATH ||
    pathname === CHANGE_PASSWORD_API_PATH ||
    pathname.startsWith('/auth/')
  )
}
