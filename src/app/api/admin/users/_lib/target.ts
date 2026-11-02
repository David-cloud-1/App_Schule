import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, type AdminAuthResult } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

/** Spalten des Profils, die die Detailseite und ihre Aktionen brauchen (PROJ-59) */
export const TARGET_COLUMNS =
  'id, display_name, role, pseudonym, department_id, created_at, total_xp, current_streak, longest_streak, last_session_date, coin_balance, linked_main_user_id'

export type TargetProfile = {
  id: string
  display_name: string | null
  role: string
  pseudonym: string | null
  department_id: string | null
  created_at: string
  total_xp: number
  current_streak: number
  longest_streak: number
  last_session_date: string | null
  coin_balance: number
  linked_main_user_id: string | null
}

export type SuperAdminTarget =
  | { error: NextResponse }
  | {
      error: null
      auth: Extract<AdminAuthResult, { error: null }>
      /** Service-Rolle (umgeht RLS) — nur hier nach der Super-Admin-Prüfung ausgegeben */
      service: SupabaseClient
      target: TargetProfile
      isSelf: boolean
    }

/**
 * Gemeinsamer Zugang der Nutzer-Detailseite (PROJ-59): nur der Super-Admin
 * (Bereichs-Admin und Lehrkräfte bekommen 403), die Ziel-Id muss eine UUID
 * sein, und das Konto muss existieren. Mit `blockSelf` sind Aktionen am
 * eigenen Konto gesperrt (wie bei Sperren und Rollen).
 */
export async function requireSuperAdminTarget(
  id: string,
  options: { blockSelf?: boolean } = {},
): Promise<SuperAdminTarget> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }
  if (!auth.isSuperAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { error: NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 }) }
  }

  const isSelf = id === auth.user.id
  if (options.blockSelf && isSelf) {
    return { error: NextResponse.json({ error: 'Du kannst dich nicht selbst bearbeiten.' }, { status: 400 }) }
  }

  const service = createServiceClient()
  const { data, error } = await service.from('profiles').select(TARGET_COLUMNS).eq('id', id).maybeSingle()
  if (error) {
    console.error('[admin/users/:id] profile', error.message)
    return { error: NextResponse.json({ error: 'Das Konto konnte nicht geladen werden.' }, { status: 500 }) }
  }
  if (!data) {
    return { error: NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 }) }
  }

  return { error: null, auth, service, target: data as unknown as TargetProfile, isSelf }
}

export async function readJsonBody(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}
