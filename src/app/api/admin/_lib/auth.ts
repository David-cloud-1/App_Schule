import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFallbackDepartment } from '@/lib/departments'

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
      /**
       * Fachbereich, in dem der Admin arbeitet (PROJ-22). Heute der Bereich
       * aus dem eigenen Profil; mit PROJ-24 kommt der Bereichs-Umschalter.
       */
      departmentId: string
    }

/**
 * Require an authenticated admin user.
 * Returns either a short-circuit `NextResponse` (401/403) or the supabase client + user.
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

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  let departmentId = (profile as { department_id?: string | null }).department_id ?? null
  if (!departmentId) {
    departmentId = (await getFallbackDepartment(supabase as unknown as SupabaseClient))?.id ?? null
  }
  if (!departmentId) {
    console.error('[requireAdmin] no department found')
    return {
      error: NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 500 }),
      user: null,
      supabase: null,
    }
  }

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
    departmentId,
  }
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
