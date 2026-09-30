import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireAdmin, writeAuditLog } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { getDepartmentById } from '@/lib/departments'
import { DEPARTMENTS_CACHE_TAG } from '@/lib/departments-server'

const UpdateSchema = z
  .object({
    prompt_notes: z.string().max(2000).nullable().optional(),
    currency_name: z.string().min(1).max(40).optional(),
    hof_name: z.string().min(1).max(40).optional(),
    hof_short_name: z.string().min(1).max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields provided' })

/**
 * Fachbereich-Einstellungen (PROJ-24) — die Felder, die eine Lehrkraft für
 * den eigenen Bereich pflegen darf: Zusatzhinweise für den Prompt, Münz- und
 * Hof-Name. Alles andere (Adresse, Branding, Klassenstufen, …) ist Super-
 * Admin-only und läuft über /api/admin/departments.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const department = await getDepartmentById(auth.supabase, auth.departmentId)
  if (!department) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({
    id: department.id,
    name: department.name,
    appName: department.appName,
    domain: department.domain,
    promptNotes: department.promptNotes,
    currencyName: department.currencyName,
    hofName: department.hofName,
    hofShortName: department.hofShortName,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user, departmentId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.prompt_notes !== undefined) update.prompt_notes = parsed.data.prompt_notes
  if (parsed.data.currency_name !== undefined) update.currency_name = parsed.data.currency_name
  if (parsed.data.hof_name !== undefined) update.hof_name = parsed.data.hof_name
  if (parsed.data.hof_short_name !== undefined) update.hof_short_name = parsed.data.hof_short_name

  // departments erlaubt per RLS nur dem Super-Admin direktes Schreiben — ein
  // department_admin pflegt hier ausschließlich die eigenen, unkritischen
  // Branding-Felder. Die Bereichsgrenze (nur der eigene departmentId) wird
  // deshalb im Code erzwungen (Service-Role-Route, wie admin/users).
  const service = createServiceClient()
  const { error } = await service.from('departments').update(update).eq('id', departmentId)
  if (error) {
    console.error('[PATCH /api/admin/department-settings]', error)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
  }

  revalidateTag(DEPARTMENTS_CACHE_TAG, { expire: 0 })

  await writeAuditLog(auth.supabase, {
    admin_id: user.id,
    action_type: 'department.settings_update',
    object_type: 'department',
    object_id: departmentId,
    department_id: departmentId,
  })

  return NextResponse.json({ ok: true })
}
