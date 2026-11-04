import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFallbackDepartment } from '@/lib/departments'

/** Cookie, in dem der Super-Admin seine aktuell gewählte Arbeits-Fachbereich ablegt (PROJ-24). */
export const ADMIN_DEPARTMENT_COOKIE = 'admin_department_id'

export type AdminRole = 'admin' | 'department_admin'

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
       * Fachbereich, in dem der Admin gerade arbeitet (PROJ-22/24).
       * Bereichs-Admin: immer der eigene Bereich aus dem Profil.
       * Super-Admin: der im Bereichs-Umschalter gewählte Bereich
       * (ADMIN_DEPARTMENT_COOKIE), sonst der Rückfall-Bereich.
       */
      departmentId: string
    }

/**
 * Fachbereich, in dem der Super-Admin laut Bereichs-Umschalter (PROJ-24)
 * gerade arbeitet: ungültige/gelöschte Bereiche und „noch nie gewählt"
 * fallen auf den Rückfall-Bereich zurück, statt die Anfrage scheitern zu
 * lassen. Geteilt von requireAdmin und requireTeacherOrAdmin.
 */
async function resolveSuperAdminDepartment(
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
 * Require an authenticated admin (Super-Admin oder Bereichs-Admin, PROJ-24).
 * Returns either a short-circuit `NextResponse` (401/403) or the supabase
 * client + user + effektiver Arbeits-Fachbereich.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
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
  if (!profile || (role !== 'admin' && role !== 'department_admin')) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  const isSuperAdmin = role === 'admin'
  const ownDepartmentId = (profile as { department_id?: string | null }).department_id ?? null

  let departmentId: string | null = null

  if (isSuperAdmin) {
    // Bereichs-Umschalter: der Super-Admin arbeitet im zuletzt gewählten
    // Bereich. Ungültige/gelöschte Bereiche und "noch nie gewählt" fallen
    // auf den Standardbereich zurück, statt die Anfrage scheitern zu lassen.
    departmentId = await resolveSuperAdminDepartment(supabase, ownDepartmentId)
  } else {
    // Bereichs-Admin: fest der eigene Bereich, kein Umschalter, KEIN
    // Rückfall auf den Standardbereich — ein department_admin ohne eigenen
    // Bereich darf nirgends etwas sehen/ändern (fail closed, Edge Case Spec).
    departmentId = ownDepartmentId
  }

  if (!departmentId) {
    console.error('[requireAdmin] no department found', { userId: user.id, role })
    return {
      error: NextResponse.json({ error: 'Kein Fachbereich zugeordnet' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    role,
    isSuperAdmin,
    departmentId,
  }
}

/**
 * Darf `auth` ein Objekt verwalten, das zu `objectDepartmentId` gehört?
 * Super-Admin: immer. Bereichs-Admin: nur der eigene (gewählte) Bereich.
 * `objectDepartmentId` null/undefined (z. B. verwaistes Objekt) → nur Super-Admin.
 */
export function canAdminDepartment(
  auth: Extract<AdminAuthResult, { error: null }>,
  objectDepartmentId: string | null | undefined
): boolean {
  if (auth.isSuperAdmin) return true
  return !!objectDepartmentId && objectDepartmentId === auth.departmentId
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
 * hat; ein Bereichs-Admin nur für geteilte Nachweise seines eigenen Bereichs.
 */
export function canViewAssessment(
  auth: Extract<TeacherAuthResult, { error: null }>,
  assessment: ViewableAssessment
): boolean {
  if (auth.isSuperAdmin) return true
  if (assessment.created_by && assessment.created_by === auth.user.id) return true
  return (
    auth.isDepartmentAdmin &&
    assessment.shared_with_department &&
    !!assessment.department_id &&
    assessment.department_id === auth.suggestedDepartmentId
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

/**
 * Best-effort audit log insert. Never throws — safe to call even if the
 * `admin_audit_log` table is not yet present.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: {
    admin_id: string
    action_type: string
    object_type: string
    object_id?: string | null
    object_label?: string | null
    details?: Record<string, unknown> | null
    /** Bereich des betroffenen Objekts; ohne Angabe der Bereich des Admins */
    department_id?: string | null
  }
) {
  try {
    let departmentId = entry.department_id
    if (departmentId === undefined) {
      const { data } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', entry.admin_id)
        .maybeSingle()
      departmentId = (data as { department_id?: string | null } | null)?.department_id ?? null
    }
    await supabase.from('admin_audit_log').insert({
      admin_id: entry.admin_id,
      action_type: entry.action_type,
      object_type: entry.object_type,
      object_id: entry.object_id ?? null,
      object_label: entry.object_label ?? null,
      details: entry.details ?? null,
      department_id: departmentId,
    })
  } catch {
    // Swallow — table may not exist yet.
  }
}
