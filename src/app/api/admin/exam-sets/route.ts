import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireContentAdmin, assertCanAdminDepartmentContent } from '../_lib/auth'
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
  const { supabase, departmentIds } = auth

  // Eine Lehrkraft sieht die Sets aller Bereiche, in denen sie mindestens
  // eine Zuständigkeit hat (PROJ-48) — Admin/Bereichs-Admin wie bisher nur
  // ihren einen Arbeits-Bereich.
  const { data, error } = await supabase
    .from('exam_question_sets')
    .select('*')
    .in('department_id', departmentIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: 'Failed to fetch exam sets' }, { status: 500 })
  return NextResponse.json({ sets: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, user, isTeacher } = auth

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

  const departmentId = isTeacher ? parsed.data.department_id ?? null : auth.departmentIds[0]
  if (!departmentId) {
    return NextResponse.json({ error: 'Fachbereich fehlt.' }, { status: 400 })
  }
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
