import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { getDepartmentById } from '@/lib/departments'
import { fetchDepartmentSubjects } from '@/lib/subjects'
import { buildAssessmentImportPrompt, MAX_PROMPT_CHARS, MIN_MATERIAL_CHARS } from '@/lib/assessment-import'

const PromptSchema = z.object({
  departmentId: z.string().uuid(),
  task: z.string().trim().min(MIN_MATERIAL_CHARS, 'Aufgabentext ist zu kurz.').max(200_000),
  solution: z.string().trim().max(100_000).nullish(),
})

/**
 * PROJ-38: der kopierbare Prompt für den Nachweis-Import. Kein KI-Aufruf — der
 * Ausbilder fügt ihn selbst in einen kostenlosen Chat ein.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PromptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { departmentId } = parsed.data

  const department = await getDepartmentById(supabase, departmentId)
  if (!department) return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 404 })

  let subjects
  try {
    subjects = await fetchDepartmentSubjects(supabase, departmentId, { activeOnly: true })
  } catch (err) {
    console.error('[POST /api/admin/assessments/questions/prompt]', err)
    return NextResponse.json({ error: 'Fächer konnten nicht geladen werden.' }, { status: 500 })
  }

  const prompt = buildAssessmentImportPrompt(department, subjects, parsed.data)
  return NextResponse.json({
    prompt,
    length: prompt.length,
    tooLong: prompt.length > MAX_PROMPT_CHARS,
    targetGroup: department.targetGroup,
  })
}
