import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireManager, writeAuditLogStrict, auditFailedResponse } from '../../_lib/auth'
import { mayManageUserTarget } from '../_lib/manage-target'
import { createServiceClient } from '@/lib/supabase-server'
import { ASSIGNABLE_ROLES } from '@/lib/roles'
import { ensurePseudonym } from '@/lib/pseudonym-server'

const BanSchema = z.object({ banned: z.boolean() }).strict()

// Rollen vergeben/entziehen ist Super-Admin-only (PROJ-24, E9, PROJ-44, PROJ-127).
// „Bereichs-Admin“ wird seit PROJ-127 nicht mehr neu vergeben.
const RoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES as unknown as [string, ...string[]]),
  department_id: z.string().uuid().nullable().optional(),
}).strict()

// Reine Bereichs-Verschiebung (kein Rollenwechsel) — auch für Lehrkräfte
// erlaubt, die einen Azubi in einen anderen Bereich abgeben (PROJ-127).
// strict: ein abgelehnter Rollenwunsch darf nicht still als Verschieben durchgehen
const MoveSchema = z.object({ department_id: z.string().uuid() }).strict()

const UpdateSchema = z.union([BanSchema, RoleSchema, MoveSchema])

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const { user, supabase, isSuperAdmin } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (id === user.id) {
    return NextResponse.json(
      { error: 'Du kannst dich nicht selbst bearbeiten.' },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    const b = body as { role?: unknown } | null
    const message =
      b?.role === 'department_admin'
        ? 'Die Rolle Bereichs-Admin wird nicht mehr vergeben. Bitte wähle „Lehrkraft“.'
        : 'Invalid payload'
    return NextResponse.json({ error: message, details: parsed.error.flatten() }, { status: 400 })
  }

  // Service-Role-Route (umgeht RLS) — Bereichstrennung muss hier im Code
  // passieren (Plan-Abschnitt 2.1).
  const service = createServiceClient()
  const { data: targetRow } = await service
    .from('profiles')
    .select('department_id, role, linked_main_user_id, display_name, first_name, last_name')
    .eq('id', id)
    .maybeSingle()
  const target = targetRow as {
    department_id: string | null
    role: string
    linked_main_user_id: string | null
    display_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isSuperAdmin) {
    // Lehrkraft (PROJ-127): nur Azubis im gewählten Bereich, nie andere
    // Lehrkräfte, Zweitkonten oder den Super-Admin, nie Rollen.
    if ('role' in parsed.data) {
      return NextResponse.json({ error: 'Rollen vergibt der Super-Admin.' }, { status: 403 })
    }
    if (!mayManageUserTarget(auth, target)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const label = userLabel(target)

  if ('banned' in parsed.data) {
    const banned = parsed.data.banned
    const { error } = await service.auth.admin.updateUserById(id, {
      ban_duration: banned ? '876000h' : 'none',
    })
    if (error) {
      console.error('[PATCH /api/admin/users/:id] ban', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    const logged = await writeAuditLogStrict(supabase, {
      admin_id: user.id,
      action_type: banned ? 'user.ban' : 'user.unban',
      object_type: 'user',
      object_id: id,
      object_label: label,
      details: { gesperrt: { alt: !banned, neu: banned } },
      department_id: target.department_id,
    })
    if (!logged) {
      // Ohne Eintrag keine Änderung: Sperre zurücknehmen
      await service.auth.admin.updateUserById(id, { ban_duration: banned ? 'none' : '876000h' })
      return auditFailedResponse()
    }
  } else if ('role' in parsed.data) {
    const update: { role: string; department_id?: string | null } = { role: parsed.data.role }
    if (parsed.data.department_id !== undefined) update.department_id = parsed.data.department_id
    const { error } = await service.from('profiles').update(update).eq('id', id)
    if (error) {
      console.error('[PATCH /api/admin/users/:id] role', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }
    const logged = await writeAuditLogStrict(supabase, {
      admin_id: user.id,
      action_type: 'user.role_change',
      object_type: 'user',
      object_id: id,
      object_label: label,
      details: {
        from: target.role,
        to: parsed.data.role,
        ...(update.department_id !== undefined ? { bereich: { alt: target.department_id, neu: update.department_id } } : {}),
      },
      department_id: update.department_id ?? target.department_id,
    })
    if (!logged) {
      await service.from('profiles').update({ role: target.role, department_id: target.department_id }).eq('id', id)
      return auditFailedResponse()
    }
    // Lehrer-Rollen erscheinen in der Rangliste nur unter Pseudonym (PROJ-44):
    // ein fehlendes Pseudonym wird beim Rollenwechsel nachgetragen.
    if (parsed.data.role !== 'student') {
      await ensurePseudonym(service, id)
    }
  } else {
    const newDepartment = parsed.data.department_id
    const { data: dept } = await service.from('departments').select('id').eq('id', newDepartment).maybeSingle()
    if (!dept) {
      return NextResponse.json({ error: 'Der gewählte Bereich existiert nicht.' }, { status: 400 })
    }
    const { error } = await service
      .from('profiles')
      .update({ department_id: newDepartment })
      .eq('id', id)
    if (error) {
      console.error('[PATCH /api/admin/users/:id] move department', error)
      return NextResponse.json({ error: 'Failed to move user' }, { status: 500 })
    }
    const logged = await writeAuditLogStrict(supabase, {
      admin_id: user.id,
      action_type: 'user.move_department',
      object_type: 'user',
      object_id: id,
      object_label: label,
      details: { from: target.department_id, to: newDepartment },
      department_id: newDepartment,
    })
    if (!logged) {
      await service.from('profiles').update({ department_id: target.department_id }).eq('id', id)
      return auditFailedResponse()
    }
  }

  return NextResponse.json({ ok: true })
}

/** Lesbarer Name des betroffenen Kontos fürs Protokoll */
function userLabel(t: { first_name: string | null; last_name: string | null; display_name: string | null }): string | null {
  const full = [t.first_name?.trim(), t.last_name?.trim()].filter(Boolean).join(' ')
  return full || t.display_name?.trim() || null
}
