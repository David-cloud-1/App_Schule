import { NextResponse } from 'next/server'
import { requireAdmin } from '../_lib/auth'
import { getDepartmentById } from '@/lib/departments'
import { fetchDepartmentSubjects } from '@/lib/subjects'
import { buildQuestionPrompt } from '@/lib/question-prompt'

export interface QuestionPromptResponse {
  /** Fertiger Prompt zum Kopieren in eine externe KI */
  prompt: string
  /** Für den Korrekturauftrag (buildFixPrompt) */
  targetGroup: string
  /** Erlaubte `fach_code`-Werte beim Import (aktive Fächer des Bereichs) */
  subjects: { code: string; name: string }[]
  classLevels: number[]
}

/**
 * GET /api/admin/question-prompt (PROJ-22)
 *
 * Der kopierbare Fragen-Prompt, zusammengesetzt aus dem Fachbereich des
 * Admins und dessen aktiven Fächern. Kein KI-Aufruf — kostet nichts.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, departmentId } = auth

  const department = await getDepartmentById(supabase, departmentId)
  if (!department) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 404 })
  }

  let subjects
  try {
    subjects = await fetchDepartmentSubjects(supabase, departmentId, { activeOnly: true })
  } catch (err) {
    console.error('[GET /api/admin/question-prompt]', err)
    return NextResponse.json({ error: 'Fächer konnten nicht geladen werden' }, { status: 500 })
  }

  const body: QuestionPromptResponse = {
    prompt: buildQuestionPrompt(department, subjects),
    targetGroup: department.targetGroup,
    subjects: subjects.map(({ code, name }) => ({ code, name })),
    classLevels: department.classLevels,
  }
  return NextResponse.json(body)
}
