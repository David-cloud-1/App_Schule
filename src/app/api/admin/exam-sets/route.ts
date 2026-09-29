import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../_lib/auth'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'

const CreateSetSchema = z.object({
  name: z.string().min(1).max(100),
  // Teil-Nummer im Bereich; welche es gibt, steht in exam_parts (PROJ-22)
  part: z.number().int().min(1).max(20),
  question_ids: z.array(z.string()).min(1),
  is_active: z.boolean().default(false),
  duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
})

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  const { data, error } = await supabase
    .from('exam_question_sets')
    .select('*')
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: 'Failed to fetch exam sets' }, { status: 500 })
  return NextResponse.json({ sets: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, departmentId } = auth

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

  const parts = await fetchExamParts(supabase, departmentId).catch(() => [])
  if (!findExamPart(parts, parsed.data.part)) {
    return NextResponse.json({ error: `Prüfungsteil ${parsed.data.part} gibt es in diesem Fachbereich nicht.` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('exam_question_sets')
    .insert({ ...parsed.data, created_by: user.id, department_id: departmentId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create exam set' }, { status: 500 })
  return NextResponse.json({ set: data }, { status: 201 })
}
