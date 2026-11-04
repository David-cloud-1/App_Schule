import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireContentAdmin,
  assertCanAdminDepartmentContent,
  resolveTargetDepartment,
  targetDepartmentMissing,
} from '../_lib/auth'
import { loadLastChanges } from '@/lib/content-history'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'

const CreateSetSchema = z.object({
  name: z.string().min(1).max(100),
  // Teil-Nummer im Bereich; welche es gibt, steht in exam_parts (PROJ-22)
  part: z.number().int().min(1).max(20),
  question_ids: z.array(z.string()).min(1),
  is_active: z.boolean().default(false),
  duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
  // Nur relevant für eine Lehrkraft mit Zuständigkeiten in mehreren
  // Bereichen (PROJ-48) — Admin/Bereichs-Admin nutzen immer ihren eigenen
  // Arbeits-Bereich, ein mitgeschickter Wert wird für sie ignoriert.
  department_id: z.string().uuid().optional(),
})

export async function GET() {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  // Sets des Bereichs der Bereichsleiste, in „Alle Bereiche“ alle (PROJ-70).
  let query = supabase
    .from('exam_question_sets')
    .select('*, departments ( name, code )')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500)
  if (auth.scopeDepartmentIds) {
    query = query.in('department_id', auth.scopeDepartmentIds)
  }
  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch exam sets' }, { status: 500 })

  const rows = (data ?? []) as { id: string; departments?: { name: string; code: string } | null }[]
  const lastChanges = await loadLastChanges(supabase, 'exam_question_set', rows.map((r) => r.id))
  const sets = rows.map(({ departments, ...rest }) => ({
    ...rest,
    department_name: departments?.name ?? null,
    department_code: departments?.code ?? null,
    last_changed_by: lastChanges.get(rest.id)?.name ?? null,
    last_changed_at: lastChanges.get(rest.id)?.at ?? null,
  }))
  return NextResponse.json({ sets })
}

export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CreateSetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const departmentId = resolveTargetDepartment(auth, parsed.data.department_id)
  if (!departmentId) return targetDepartmentMissing()
  const forbidden = assertCanAdminDepartmentContent(auth, departmentId)
  if (forbidden) return forbidden

  const parts = await fetchExamParts(supabase, departmentId).catch(() => [])
  if (!findExamPart(parts, parsed.data.part)) {
    return NextResponse.json({ error: `Prüfungsteil ${parsed.data.part} gibt es in diesem Fachbereich nicht.` }, { status: 400 })
  }

  const { name, part, question_ids, is_active, duration_minutes } = parsed.data
  const { data, error } = await supabase
    .from('exam_question_sets')
    .insert({ name, part, question_ids, is_active, duration_minutes, created_by: user.id, department_id: departmentId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create exam set' }, { status: 500 })
  return NextResponse.json({ set: data }, { status: 201 })
}
