import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFallbackDepartment } from '@/lib/departments'

/** Cookie, in dem der Super-Admin seine aktuell gewählte Arbeits-Fachbereich ablegt (PROJ-24). */
export const ADMIN_DEPARTMENT_COOKIE = 'admin_department_id'

export type AdminRole = 'admin' | 'department_admin' | 'teacher'

export type AdminAuthResult =
  | {
      error: NextResponse
      user: null
      supabase: null
    }
  | {
      error: null
      user: { id: string; email: string | undefined }
      supabase: SupabaseClient
      role: AdminRole
      /** true nur für den Super-Admin (role = 'admin'). */
      isSuperAdmin: boolean
      /**
       * Fachbereich, in dem gerade verwaltet wird (PROJ-22/24/127).
       * Super-Admin: der im Bereichs-Umschalter gewählte Bereich
       * (ADMIN_DEPARTMENT_COOKIE), sonst der Rückfall-Bereich.
       * Lehrkraft (PROJ-127): der Bereich der Bereichsleiste; bei „Alle
       * Bereiche“ oder ohne Wahl der Profil-Bereich, sonst der Standardbereich.
       */
      departmentId: string
      /**
       * PROJ-127: Die Bereichsleiste steht auf „Alle Bereiche“ (nur für
       * Lehrkräfte relevant). Schreibzugriffe auf Items und Einstellungen
       * verlangen dann zuerst die Wahl eines Bereichs (`assertSingleDepartment`).
       */
      scopeIsAll: boolean
    }

/**
 * Fachbereich, in dem der Super-Admin laut Bereichs-Umschalter (PROJ-24)
 * gerade arbeitet: ungültige/gelöschte Bereiche und „noch nie gewählt"
 * fallen auf den Rückfall-Bereich zurück, statt die Anfrage scheitern zu
 * lassen. Geteilt von requireManager und requireTeacherOrAdmin.
 */
export async function resolveSuperAdminDepartment(
  supabase: SupabaseClient,
  ownDepartmentId: string | null
): Promise<string | null> {
  const cookieStore = await cookies()
  const chosen = cookieStore.get(ADMIN_DEPARTMENT_COOKIE)?.value ?? null
  if (chosen) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('id', chosen)
      .maybeSingle()
    const chosenId = (dept as { id: string } | null)?.id ?? null
    if (chosenId) return chosenId
  }
  return (
    ownDepartmentId ??
    (await getFallbackDepartment(supabase as unknown as SupabaseClient))?.id ??
    null
  )
}

/**
 * Bereich einer Lehrkraft in der Verwaltung (PROJ-127): die Bereichsleiste
 * (ADMIN_SCOPE_COOKIE) wie bei den Inhalten. „Alle“ oder ungültig → Profil-
 * Bereich, sonst der Standardbereich. Kein „fail closed“ mehr: jede Lehrkraft
 * darf jeden Bereich verwalten.
 */
async function resolveManagerDepartment(
  supabase: SupabaseClient,
  ownDepartmentId: string | null
): Promise<{ departmentId: string | null; scopeIsAll: boolean }> {
  const cookieStore = await cookies()
  const chosen = cookieStore.get(ADMIN_SCOPE_COOKIE)?.value ?? null
  const scopeIsAll = chosen === SCOPE_ALL
  if (chosen && !scopeIsAll) {
    const { data: dept } = await supabase.from('departments').select('id').eq('id', chosen).maybeSingle()
    const chosenId = (dept as { id: string } | null)?.id ?? null
    if (chosenId) return { departmentId: chosenId, scopeIsAll: false }
  }
  const fallback =
    ownDepartmentId ?? (await getFallbackDepartment(supabase as unknown as SupabaseClient))?.id ?? null
  return { departmentId: fallback, scopeIsAll }
}

async function loadAdminAuth(mode: 'manager' | 'super'): Promise<AdminAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  const allowed =
    mode === 'super' ? role === 'admin' : role === 'admin' || role === 'department_admin' || role === 'teacher'
  if (!profile || !allowed) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  const isSuperAdmin = role === 'admin'
  const ownDepartmentId = (profile as { department_id?: string | null }).department_id ?? null

  let departmentId: string | null
  let scopeIsAll = false
  if (isSuperAdmin) {
    departmentId = await resolveSuperAdminDepartment(supabase, ownDepartmentId)
  } else {
    ;({ departmentId, scopeIsAll } = await resolveManagerDepartment(supabase, ownDepartmentId))
  }

  if (!departmentId) {
    console.error('[requireManager] no department found', { userId: user.id, role })
    return {
      error: NextResponse.json({ error: 'Kein Bereich zugeordnet' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    role: role as AdminRole,
    isSuperAdmin,
    departmentId,
    scopeIsAll,
  }
}

/**
 * Türsteher „Verwaltung“ (PROJ-127): jede Lehrer-Rolle (Lehrkraft, bisheriger
 * Bereichs-Admin, Super-Admin). Der Bereich kommt aus der Bereichsleiste.
 * Was nur der Super-Admin darf, prüft `requireSuperAdmin`.
 */
export function requireManager(): Promise<AdminAuthResult> {
  return loadAdminAuth('manager')
}

/**
 * Türsteher „nur Super-Admin“ (PROJ-127): Rollen und Status vergeben, Konten
 * löschen, Fortschritt, Export, Zuständigkeiten, Fachbereiche, bezahlte KI,
 * Bereichs-Umschalter. Alle anderen Rollen bekommen 403.
 */
export function requireSuperAdmin(): Promise<AdminAuthResult> {
  return loadAdminAuth('super')
}

/**
 * Schreibzugriffe auf Items und Fachbereich-Einstellungen brauchen einen
 * einzelnen Bereich (PROJ-127). Steht die Bereichsleiste einer Lehrkraft auf
 * „Alle Bereiche“, antwortet die Route mit 400 und dieser Bitte.
 */
export function assertSingleDepartment(auth: Extract<AdminAuthResult, { error: null }>): NextResponse | null {
  if (auth.isSuperAdmin || !auth.scopeIsAll) return null
  return NextResponse.json(
    { error: 'Bitte wähle oben in der Bereichsleiste einen Bereich aus.', field: 'department_id' },
    { status: 400 }
  )
}

/**
 * Darf `auth` ein Objekt verwalten, das zu `objectDepartmentId` gehört?
 * Super-Admin: immer. Lehrkraft (PROJ-127): Objekte im gerade gewählten
 * Bereich; bei „Alle Bereiche“ jedes Objekt mit Bereich.
 * `objectDepartmentId` null/undefined (verwaistes Objekt) → nur Super-Admin.
 */
export function canAdminDepartment(
  auth: Extract<AdminAuthResult, { error: null }>,
  objectDepartmentId: string | null | undefined
): boolean {
  if (auth.isSuperAdmin) return true
  if (!objectDepartmentId) return false
  return auth.scopeIsAll || objectDepartmentId === auth.departmentId
}

/**
 * Wie `canAdminDepartment`, aber gibt bei Ablehnung direkt die passende
 * NextResponse zurück (404 — verrät nicht, ob das Objekt existiert).
 */
export function assertCanAdminDepartment(
  auth: Extract<AdminAuthResult, { error: null }>,
  objectDepartmentId: string | null | undefined
): NextResponse | null {
  if (canAdminDepartment(auth, objectDepartmentId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Zugangs-Check für „Meine Fächer" (PROJ-48): nur eine echte Lehrkraft (role
 * = 'teacher') darf sich selbst eintragen/austragen. Bereichs-Admin und
 * Super-Admin brauchen laut Spec keine Zuständigkeiten — sie bekommen hier
 * bewusst 403, statt sich versehentlich nutzlose Einträge anzulegen.
 */
export async function requireTeacher(): Promise<
  | { error: NextResponse; user: null; supabase: null }
  | { error: null; user: { id: string; email: string | undefined }; supabase: SupabaseClient }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  if (!profile || role !== 'teacher') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null, supabase: null }
  }

  return { error: null, user: { id: user.id, email: user.email }, supabase: supabase as unknown as SupabaseClient }
}

/**
 * Zugangs-Check für die Fragen-/Themen-/Fächer-/Prüfungsset-Routen. Seit
 * PROJ-70 dürfen alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin)
 * Inhalte aller Bereiche sehen und pflegen; eine Fach-Eintragung ist keine
 * Voraussetzung mehr. Die Datenbank-Regeln (RLS) ziehen dasselbe nach, hier
 * geht es nur um den Zugang und die Bereichsleiste.
 */
export type ContentAuthResult =
  | {
      error: NextResponse
      user: null
      supabase: null
    }
  | {
      error: null
      user: { id: string; email: string | undefined }
      supabase: SupabaseClient
      role: 'teacher' | AdminRole
      isSuperAdmin: boolean
      isDepartmentAdmin: boolean
      isTeacher: boolean
      /** Alle vorhandenen Bereiche: so viele darf jede Lehrer-Rolle bei Inhalten ansprechen. */
      departmentIds: string[]
      /**
       * Bereiche, die die Bereichsleiste gerade zeigt (PROJ-70). `null` =
       * „Alle Bereiche“, sonst genau ein Bereich. Listen filtern danach.
       */
      scopeDepartmentIds: string[] | null
      /**
       * Bereich, in dem neue Inhalte ohne ausdrückliche Angabe landen würden:
       * der gewählte Bereich der Leiste, sonst `null` (dann ist der Zielbereich
       * Pflicht, siehe `resolveTargetDepartment`).
       */
      departmentId: string | null
      /** Seit PROJ-70 nie mehr eingeschränkt; bleibt `null` für ältere Aufrufer. */
      subjectIds: null
    }

/** Cookie der Bereichsleiste (PROJ-70): „alle“ oder die ID eines Fachbereichs. */
export const ADMIN_SCOPE_COOKIE = 'admin_bereich'
export const SCOPE_ALL = 'alle'

/**
 * Bereichsleiste auslesen. Ungültige oder gelöschte Bereiche fallen auf den
 * Startbereich zurück (Profil-Bereich; Super-Admin: sein gewählter Bereich),
 * ohne Profil-Bereich auf „Alle Bereiche“.
 */
export async function resolveContentScope(
  supabase: SupabaseClient,
  isSuperAdmin: boolean,
  ownDepartmentId: string | null,
  allDepartmentIds: string[]
): Promise<string[] | null> {
  const cookieStore = await cookies()
  const chosen = cookieStore.get(ADMIN_SCOPE_COOKIE)?.value ?? null
  if (chosen === SCOPE_ALL) return null
  if (chosen && allDepartmentIds.includes(chosen)) return [chosen]
  if (isSuperAdmin) {
    const id = await resolveSuperAdminDepartment(supabase, ownDepartmentId)
    return id ? [id] : null
  }
  return ownDepartmentId && allDepartmentIds.includes(ownDepartmentId) ? [ownDepartmentId] : null
}

export async function requireContentAdmin(): Promise<ContentAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (!profile || (role !== 'admin' && role !== 'department_admin' && role !== 'teacher')) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  const isSuperAdmin = role === 'admin'
  const ownDepartmentId = (profile as { department_id?: string | null }).department_id ?? null

  const { data: departments } = await supabase.from('departments').select('id')
  const departmentIds = ((departments ?? []) as { id: string }[]).map((d) => d.id)

  const scopeDepartmentIds = await resolveContentScope(
    supabase as unknown as SupabaseClient,
    isSuperAdmin,
    ownDepartmentId,
    departmentIds
  )

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    role,
    isSuperAdmin,
    isDepartmentAdmin: role === 'department_admin',
    isTeacher: role === 'teacher',
    departmentIds,
    scopeDepartmentIds,
    departmentId: scopeDepartmentIds?.length === 1 ? scopeDepartmentIds[0] : null,
    subjectIds: null,
  }
}

/**
 * Zielbereich für Neues (Fach, Prüfungsset, Import, Kopier-Prompt): die
 * ausdrückliche Angabe, sonst der Bereich der Leiste. In „Alle Bereiche“
 * ohne Angabe gibt es keinen Zielbereich (`null`): das Formular verlangt ihn.
 * Ein unbekannter Bereich ist ebenfalls `null`.
 */
export function resolveTargetDepartment(
  auth: Extract<ContentAuthResult, { error: null }>,
  requested?: string | null
): string | null {
  if (requested) return auth.departmentIds.includes(requested) ? requested : null
  return auth.departmentId
}

/** Antwort für „Zielbereich fehlt“ (400): die Oberfläche markiert das Feld. */
export function targetDepartmentMissing(): NextResponse {
  return NextResponse.json(
    { error: 'Bitte wähle aus, in welchem Bereich das angelegt werden soll.', field: 'department_id' },
    { status: 400 }
  )
}

// Seit PROJ-70 hängen Inhalts-Rechte nicht mehr an Bereich oder Fach: jede
// Lehrer-Rolle darf alle Inhalte pflegen (gespiegelt in den Datenbank-Regeln
// `can_admin_subject`, `can_admin_department_content`, `can_admin_question`).
// Die Funktionen bleiben, damit Aufrufer und Prüfungen an einer Stelle sitzen.

export function canAdminSubject(
  _auth: Extract<ContentAuthResult, { error: null }>,
  _subjectId?: string | null,
  _subjectDepartmentId?: string | null
): boolean {
  return true
}

export function assertCanAdminSubject(
  auth: Extract<ContentAuthResult, { error: null }>,
  subjectId?: string | null,
  subjectDepartmentId?: string | null
): NextResponse | null {
  if (canAdminSubject(auth, subjectId, subjectDepartmentId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export function canAdminDepartmentContent(
  auth: Extract<ContentAuthResult, { error: null }>,
  departmentId: string | null | undefined
): boolean {
  return !!departmentId && auth.departmentIds.includes(departmentId)
}

export function assertCanAdminDepartmentContent(
  auth: Extract<ContentAuthResult, { error: null }>,
  departmentId: string | null | undefined
): NextResponse | null {
  if (canAdminDepartmentContent(auth, departmentId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function canAdminQuestion(
  _auth: Extract<ContentAuthResult, { error: null }>,
  _questionId: string
): Promise<boolean> {
  return true
}

export async function assertCanAdminQuestion(
  auth: Extract<ContentAuthResult, { error: null }>,
  questionId: string
): Promise<NextResponse | null> {
  if (await canAdminQuestion(auth, questionId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Zugangs-Check für die Nachweis-Routen (PROJ-46): zusätzlich zu Super-Admin
 * und Bereichs-Admin darf hier auch eine Lehrkraft ohne Fachbereich herein.
 * Bewusst getrennt von `requireAdmin` — alle anderen Admin-Routen (Fragen,
 * Fächer, Shop …) bleiben für Lehrkräfte verschlossen.
 */
export type TeacherAuthResult =
  | {
      error: NextResponse
      user: null
      supabase: null
    }
  | {
      error: null
      user: { id: string; email: string | undefined }
      supabase: SupabaseClient
      role: 'teacher' | AdminRole
      isSuperAdmin: boolean
      isDepartmentAdmin: boolean
      /**
       * Vorschlag für den Zielbereich im Anlegen-Dialog: der eigene Bereich
       * (Bereichs-Admin) bzw. der Umschalter-Bereich (Super-Admin). Eine
       * Lehrkraft hat keinen eigenen Bereich → null. Dient NIE der
       * Rechteprüfung (die liegt in der Datenbank-Regel + canViewAssessment) —
       * nur als Default für die Oberfläche.
       */
      suggestedDepartmentId: string | null
      /**
       * Bereich aus dem eigenen Profil (PROJ-127): Mit diesem Bereich geteilte
       * Nachweise sieht jede Lehrer-Rolle, deren Profil dazu gehört.
       */
      ownDepartmentId?: string | null
    }

export async function requireTeacherOrAdmin(): Promise<TeacherAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (!profile || (role !== 'admin' && role !== 'department_admin' && role !== 'teacher')) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  const isSuperAdmin = role === 'admin'
  const isDepartmentAdmin = role === 'department_admin'
  const ownDepartmentId = (profile as { department_id?: string | null }).department_id ?? null

  let suggestedDepartmentId: string | null = null
  if (isSuperAdmin) {
    suggestedDepartmentId = await resolveSuperAdminDepartment(supabase, ownDepartmentId)
  } else if (isDepartmentAdmin) {
    suggestedDepartmentId = ownDepartmentId
  }

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    role: role as 'teacher' | AdminRole,
    isSuperAdmin,
    isDepartmentAdmin,
    suggestedDepartmentId,
    ownDepartmentId,
  }
}

/** Schlanke Nachweis-Angaben, wie sie `can_view_assessment` in der Datenbank prüft. */
type ViewableAssessment = {
  department_id: string | null
  created_by: string | null
  shared_with_department: boolean
}

/**
 * Darf `auth` diesen Nachweis sehen? Spiegelt exakt die Datenbank-Funktion
 * `can_view_assessment` (PROJ-46 Tech Design E — eine Prüfung, zwei Stellen):
 * Super-Admin immer; die erstellende Person, solange sie eine Lehrer-Rolle
 * hat; jede Lehrer-Rolle für geteilte Nachweise des Bereichs aus ihrem
 * Profil (PROJ-127, vorher nur der Bereichs-Admin).
 */
export function canViewAssessment(
  auth: Extract<TeacherAuthResult, { error: null }>,
  assessment: ViewableAssessment
): boolean {
  if (auth.isSuperAdmin) return true
  if (assessment.created_by && assessment.created_by === auth.user.id) return true
  return (
    assessment.shared_with_department &&
    !!assessment.department_id &&
    assessment.department_id === (auth.ownDepartmentId ?? null)
  )
}

/**
 * Wie `canViewAssessment`, aber gibt bei Ablehnung direkt die passende
 * NextResponse zurück (404 — verrät nicht, ob der Nachweis existiert).
 */
export function assertCanViewAssessment(
  auth: Extract<TeacherAuthResult, { error: null }>,
  assessment: ViewableAssessment
): NextResponse | null {
  if (canViewAssessment(auth, assessment)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export type AuditEntry = {
  admin_id: string
  action_type: string
  object_type: string
  object_id?: string | null
  object_label?: string | null
  details?: Record<string, unknown> | null
  /** Bereich des betroffenen Objekts; ohne Angabe der Bereich des Admins */
  department_id?: string | null
}

/** Lesbarer Name der handelnden Person: Vor- und Nachname, sonst Anzeigename */
export function actorNameOf(
  profile: { first_name?: string | null; last_name?: string | null; display_name?: string | null } | null
): string | null {
  const full = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(' ')
  return full || profile?.display_name?.trim() || null
}

/**
 * Baut die Zeile fürs Änderungsprotokoll. Der Name der handelnden Person
 * steht als Text darin (PROJ-127), damit er auch nach dem Löschen des
 * Kontos lesbar bleibt.
 */
async function buildAuditRow(supabase: SupabaseClient, entry: AuditEntry) {
  const { data } = await supabase
    .from('profiles')
    .select('department_id, first_name, last_name, display_name')
    .eq('id', entry.admin_id)
    .maybeSingle()
  const profile = data as {
    department_id?: string | null
    first_name?: string | null
    last_name?: string | null
    display_name?: string | null
  } | null
  return {
    admin_id: entry.admin_id,
    admin_name: actorNameOf(profile),
    action_type: entry.action_type,
    object_type: entry.object_type,
    object_id: entry.object_id ?? null,
    object_label: entry.object_label ?? null,
    details: entry.details ?? null,
    department_id: entry.department_id === undefined ? (profile?.department_id ?? null) : entry.department_id,
  }
}

/** Spalte admin_name fehlt (Migration PROJ-127 noch nicht eingespielt) */
function isMissingNameColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (error.code === 'PGRST204' || error.code === '42703') && /admin_name/.test(error.message ?? '')
}

async function insertAuditRow(
  supabase: SupabaseClient,
  row: Awaited<ReturnType<typeof buildAuditRow>>
): Promise<{ code?: string; message?: string } | null> {
  const { error } = await supabase.from('admin_audit_log').insert(row)
  if (!error) return null
  if (isMissingNameColumn(error)) {
    const { admin_name: _ignored, ...withoutName } = row
    const retry = await supabase.from('admin_audit_log').insert(withoutName)
    return retry.error ?? null
  }
  return error
}

/**
 * Best-effort audit log insert. Never throws. Nur für Aktionen des
 * Super-Admins und für Inhalte; Verwaltungsaktionen von Lehrkräften nutzen
 * `writeAuditLogStrict` (PROJ-127).
 */
export async function writeAuditLog(supabase: SupabaseClient, entry: AuditEntry) {
  try {
    const error = await insertAuditRow(supabase, await buildAuditRow(supabase, entry))
    if (error) console.error('[writeAuditLog]', entry.action_type, error.message)
  } catch {
    // Swallow — Protokoll darf hier die Aktion nicht verhindern.
  }
}

/** Antwort, wenn das Änderungsprotokoll nicht geschrieben werden konnte (PROJ-127) */
export const AUDIT_FAILED_MESSAGE =
  'Die Änderung konnte nicht protokolliert werden und wurde deshalb nicht gespeichert. Bitte versuche es erneut.'

export function auditFailedResponse(): NextResponse {
  return NextResponse.json({ error: AUDIT_FAILED_MESSAGE }, { status: 503 })
}

/**
 * Strenge Protokoll-Hilfe (PROJ-127): liefert `true`, wenn der Eintrag
 * geschrieben ist, sonst `false`. Die Route darf dann nicht stillschweigend
 * weitermachen: Sie nimmt ihre Änderung zurück (oder hat sie noch nicht
 * ausgeführt) und antwortet mit `auditFailedResponse()`.
 */
export async function writeAuditLogStrict(supabase: SupabaseClient, entry: AuditEntry): Promise<boolean> {
  try {
    const error = await insertAuditRow(supabase, await buildAuditRow(supabase, entry))
    if (error) {
      console.error('[writeAuditLogStrict]', entry.action_type, error.code, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[writeAuditLogStrict] threw', entry.action_type, err instanceof Error ? err.message : err)
    return false
  }
}

/** Nur die Felder, die sich wirklich ändern: { feld: { alt, neu } } für `details` */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { alt: unknown; neu: unknown }> {
  const out: Record<string, { alt: unknown; neu: unknown }> = {}
  for (const [key, neu] of Object.entries(after)) {
    const alt = before[key] ?? null
    if (JSON.stringify(alt) !== JSON.stringify(neu ?? null)) out[key] = { alt, neu: neu ?? null }
  }
  return out
}
