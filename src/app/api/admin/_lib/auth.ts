import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    }
  }

  return {
    error: null,
    user: { id: user.id, email: user.email },
    supabase: supabase as unknown as SupabaseClient,
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
  }
) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: entry.admin_id,
      action_type: entry.action_type,
      object_type: entry.object_type,
      object_id: entry.object_id ?? null,
      object_label: entry.object_label ?? null,
      details: entry.details ?? null,
    })
  } catch {
    // Swallow — table may not exist yet.
  }
}
