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
    const cookieStore = await cookies()
    const chosen = cookieStore.get(ADMIN_DEPARTMENT_COOKIE)?.value ?? null
    if (chosen) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('id', chosen)
        .maybeSingle()
      departmentId = (dept as { id: string } | null)?.id ?? null
    }
    if (!departmentId) {
      departmentId =
        ownDepartmentId ??
        (await getFallbackDepartment(supabase as unknown as SupabaseClient))?.id ??
        null
    }
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
