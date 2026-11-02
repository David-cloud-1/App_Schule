import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeAuditLog } from '../../../_lib/auth'
import { readJsonBody, requireSuperAdminTarget } from '../../_lib/target'
import { RESET_TABLES, resetConfirmationMatches, resetConfirmLabel, USER_ACTIONS } from '@/lib/user-detail'

const BodySchema = z.object({ confirmName: z.string().max(200) })

const FAILED_MESSAGE = 'Das Zurücksetzen wurde unterbrochen. Bitte versuche es noch einmal.'

/**
 * POST /api/admin/users/[id]/reset-progress — Fortschritt auf den Nullstand
 * setzen (PROJ-59, nur Super-Admin). Löscht XP, Streak, Münzen, Lernverlauf,
 * Badges, Blitzrunden, Hof-/Betriebs-Items und Prüfungssimulationen der
 * Person. Leistungsnachweise (Noten) bleiben unberührt.
 *
 * Reihenfolge: erst die abhängigen Zeilen, zuletzt das Profil. Bricht ein
 * Schritt ab, steht das Profil noch auf dem alten Stand; ein zweiter Versuch
 * läuft sauber zu Ende (jeder Schritt ist wiederholbar).
 *
 * Laufende Lern-Sessions: Eine Runde existiert erst beim Abschluss und liest
 * dort den dann aktuellen Stand der Person. Sie startet also vom Nullstand
 * und schreibt keine alten Werte zurück.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await requireSuperAdminTarget(id, { blockSelf: true })
  if (access.error) return access.error
  const { auth, service, target } = access

  const parsed = BodySchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  // Der Server prüft die Bestätigung selbst; die Oberfläche ist nur eine Hilfe
  let email: string | null = null
  if (!target.display_name?.trim()) {
    const { data } = await service.auth.admin.getUserById(id)
    email = data?.user?.email ?? null
  }
  const label = resetConfirmLabel(target.display_name, email)
  if (!resetConfirmationMatches(parsed.data.confirmName, label)) {
    return NextResponse.json({ error: 'Der eingetippte Name stimmt nicht.' }, { status: 400 })
  }

  const deleted: Record<string, number> = {}
  for (const table of RESET_TABLES) {
    const { error, count } = await service.from(table).delete({ count: 'exact' }).eq('user_id', id)
    if (error) {
      console.error('[POST /api/admin/users/:id/reset-progress]', table, error.message)
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 })
    }
    deleted[table] = count ?? 0
  }

  // Prüfungssimulationen gehören zum Lernverlauf; Leistungsnachweise (mit Nachweis-Id) bleiben
  const { error: examError, count: examCount } = await service
    .from('exam_sessions')
    .delete({ count: 'exact' })
    .eq('user_id', id)
    .is('assessment_id', null)
  if (examError) {
    console.error('[POST /api/admin/users/:id/reset-progress] exam_sessions', examError.message)
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 })
  }
  deleted.exam_sessions = examCount ?? 0

  const { error: profileError } = await service
    .from('profiles')
    .update({
      total_xp: 0,
      current_streak: 0,
      longest_streak: 0,
      last_session_date: null,
      coin_balance: 0,
    })
    .eq('id', id)
  if (profileError) {
    console.error('[POST /api/admin/users/:id/reset-progress] profile', profileError.message)
    return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 })
  }

  await writeAuditLog(auth.supabase, {
    admin_id: auth.user.id,
    action_type: USER_ACTIONS.progressReset,
    object_type: 'user',
    object_id: id,
    object_label: target.display_name,
    details: {
      old: {
        total_xp: target.total_xp,
        current_streak: target.current_streak,
        longest_streak: target.longest_streak,
        coin_balance: target.coin_balance,
      },
      deleted,
    },
    department_id: target.department_id,
  })

  return NextResponse.json({ ok: true })
}
