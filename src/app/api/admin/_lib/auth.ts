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
 * Zugangs-Check für die Fragen-/Themen-/Fächer-/Prüfungsset-Routen (PROJ-48):
 * zusätzlich zu Super-Admin und Bereichs-Admin darf hier eine Lehrkraft mit
 * mindestens einer eigenen Fach-Zuständigkeit herein. Welche konkreten Fächer
 * und Bereiche das sind, steht in `departmentIds`/`subjectIds` — die eigentliche
 * Grenze pro Objekt ziehen `canAdminSubject`/`canAdminDepartmentContent`
 * unten (gespiegelt in der RLS, siehe Migration 20261027_proj48).
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
      /**
       * Bereiche, in denen diese Person Inhalte verwalten darf.
       * Admin/Bereichs-Admin: genau ihr Arbeits-Bereich (ein Eintrag, wie
       * bei `departmentId` aus requireAdmin). Lehrkraft: alle Bereiche, in
       * denen sie mindestens eine Zuständigkeit hat (Fach oder bereichsweit).
       */
      departmentIds: string[]
      /**
       * Fächer, für die eine Lehrkraft konkret zuständig ist (ohne
       * bereichsweite Einträge ohne Fach). `null` für Admin/Bereichs-Admin —
       * die sind nicht auf einzelne Fächer eingeschränkt.
       */
      subjectIds: string[] | null
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
  const isDepartmentAdmin = role === 'department_admin'
  const isTeacher = role === 'teacher'
  const ownDepartmentId = (profile as { department_id?: string | null }).department_id ?? null

  if (!isTeacher) {
    const departmentId = isSuperAdmin
      ? await resolveSuperAdminDepartment(supabase, ownDepartmentId)
      : ownDepartmentId
    if (!departmentId) {
      console.error('[requireContentAdmin] no department found', { userId: user.id, role })
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
      isDepartmentAdmin,
      isTeacher: false,
      departmentIds: [departmentId],
      subjectIds: null,
    }
  }

  // Lehrkraft: ihre eigenen Zuständigkeiten bestimmen Bereiche und Fächer.
  const { data: assignments } = await supabase
    .from('teacher_subject_assignments')
    .select('department_id, subject_id')
    .eq('teacher_id', user.id)

  const rows = (assignments ?? []) as { department_id: string; subject_id: string | null }[]
  if (rows.length === 0) {
    return {
      error: NextResponse.json({ error: 'Keine Fach-Zuständigkeit eingetragen' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  const departmentIds = [...new Set(rows.map((r) => r.department_id))]
  const subjectIds = [...new Set(rows.filter((r) => r.subject_id).map((r) => r.subject_id as string))]

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    isTeacher: true,
    departmentIds,
    subjectIds,
  }
}

/**
 * Darf `auth` dieses Fach verwalten (PROJ-48)? Admin: immer. Bereichs-Admin:
 * eigener Bereich. Lehrkraft: NUR mit eigener Zuständigkeit für genau dieses
 * Fach — bloße Mitgliedschaft im Bereich reicht nicht.
 */
export function canAdminSubject(
  auth: Extract<ContentAuthResult, { error: null }>,
  subjectId: string | null | undefined,
  subjectDepartmentId: string | null | undefined
): boolean {
  if (auth.isSuperAdmin) return true
  if (auth.isDepartmentAdmin) return !!subjectDepartmentId && subjectDepartmentId === auth.departmentIds[0]
  return !!subjectId && !!auth.subjectIds?.includes(subjectId)
}

export function assertCanAdminSubject(
  auth: Extract<ContentAuthResult, { error: null }>,
  subjectId: string | null | undefined,
  subjectDepartmentId: string | null | undefined
): NextResponse | null {
  if (canAdminSubject(auth, subjectId, subjectDepartmentId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Darf `auth` in diesem Bereich grundsätzlich etwas anlegen (ein neues Fach,
 * E3, oder ein Prüfungsset des Bereichs)? Für eine Lehrkraft reicht hier
 * jede Zuständigkeit im Bereich, auch eine bereichsweite ohne eigenes Fach.
 */
export function canAdminDepartmentContent(
  auth: Extract<ContentAuthResult, { error: null }>,
  departmentId: string | null | undefined
): boolean {
  if (auth.isSuperAdmin) return true
  if (auth.isDepartmentAdmin) return !!departmentId && departmentId === auth.departmentIds[0]
  return !!departmentId && auth.departmentIds.includes(departmentId)
}

export function assertCanAdminDepartmentContent(
  auth: Extract<ContentAuthResult, { error: null }>,
  departmentId: string | null | undefined
): NextResponse | null {
  if (canAdminDepartmentContent(auth, departmentId)) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Darf `auth` diese Frage verwalten? Prüft ALLE verknüpften Fächer — bei
 * einer Frage mit mehreren Fächern reicht die Zuständigkeit für eines davon
 * (gespiegelt in der RLS-Funktion `can_admin_question`).
 */
export async function canAdminQuestion(
  auth: Extract<ContentAuthResult, { error: null }>,
  questionId: string
): Promise<boolean> {
  if (auth.isSuperAdmin) return true
  const { data } = await auth.supabase
    .from('question_subjects')
    .select('subject_id, subjects!inner(department_id)')
    .eq('question_id', questionId)
  const rows = (data ?? []) as unknown as { subject_id: string; subjects: { department_id: string } }[]
  if (rows.length === 0) return false
  if (auth.isDepartmentAdmin) return rows.some((r) => r.subjects.department_id === auth.departmentIds[0])
  return rows.some((r) => !!auth.subjectIds?.includes(r.subject_id))
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
