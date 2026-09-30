import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

const BanSchema = z.object({ banned: z.boolean() })

// Rollen vergeben/entziehen ist Super-Admin-only (PROJ-24, E9); department_id
// ist bei department_admin Pflicht — eine Bereichs-Admin-Rolle ohne Bereich
// wäre fail-closed nutzlos, aber besser, das schon hier abzulehnen.
const RoleSchema = z
  .object({
    role: z.enum(['student', 'department_admin', 'admin']),
    department_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.role !== 'department_admin' || !!v.department_id, {
    message: 'Bereichs-Admin braucht einen Fachbereich.',
    path: ['department_id'],
  })

// Reine Bereichs-Verschiebung (kein Rollenwechsel) — auch für department_admin
// erlaubt, der eigene Azubis in einen anderen Bereich abgeben darf.
const MoveSchema = z.object({ department_id: z.string().uuid() })

const UpdateSchema = z.union([BanSchema, RoleSchema, MoveSchema])

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user, supabase, isSuperAdmin, departmentId } = auth

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
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Service-Role-Route (umgeht RLS) — Bereichstrennung muss hier im Code
  // passieren (Plan-Abschnitt 2.1).
  const service = createServiceClient()
  const { data: target } = await service
    .from('profiles')
    .select('department_id, role')
    .eq('id', id)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isSuperAdmin) {
    // Bereichs-Admin: nur eigene Azubis, nie andere Admins, nie Rollen.
    if (target.department_id !== departmentId || target.role !== 'student') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if ('role' in parsed.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if ('banned' in parsed.data) {
    const banDuration = parsed.data.banned ? '876000h' : 'none'
    const { error } = await service.auth.admin.updateUserById(id, {
      ban_duration: banDuration,
    })
    if (error) {
      console.error('[PATCH /api/admin/users/:id] ban', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: parsed.data.banned ? 'user.ban' : 'user.unban',
      object_type: 'user',
      object_id: id,
      department_id: target.department_id,
    })
  } else if ('role' in parsed.data) {
    const update: { role: string; department_id?: string | null } = { role: parsed.data.role }
    if (parsed.data.department_id !== undefined) update.department_id = parsed.data.department_id
    const { error } = await service.from('profiles').update(update).eq('id', id)
    if (error) {
      console.error('[PATCH /api/admin/users/:id] role', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'user.role_change',
      object_type: 'user',
      object_id: id,
      details: { from: target.role, to: parsed.data.role },
      department_id: update.department_id ?? target.department_id,
    })
  } else {
    const { error } = await service
      .from('profiles')
      .update({ department_id: parsed.data.department_id })
      .eq('id', id)
    if (error) {
      console.error('[PATCH /api/admin/users/:id] move department', error)
      return NextResponse.json({ error: 'Failed to move user' }, { status: 500 })
    }
    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'user.move_department',
      object_type: 'user',
      object_id: id,
      details: { from: target.department_id, to: parsed.data.department_id },
      department_id: parsed.data.department_id,
    })
  }

  return NextResponse.json({ ok: true })
}
