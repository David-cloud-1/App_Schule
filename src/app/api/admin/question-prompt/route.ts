import { NextRequest, NextResponse } from 'next/server'
import { requireContentAdmin, assertCanAdminDepartmentContent } from '../_lib/auth'
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
 * Der kopierbare Fragen-Prompt, zusammengesetzt aus einem Fachbereich und
 * dessen aktiven Fächern. Admin/Bereichs-Admin: immer ihr Arbeits-Bereich.
 * Eine Lehrkraft mit Zuständigkeiten in mehreren Bereichen (PROJ-48) gibt den
 * gewünschten Bereich über `?department_id=` an. Kein KI-Aufruf — kostet nichts.
 */
export async function GET(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error
  const { supabase, isTeacher } = auth

  const requestedDepartmentId = request.nextUrl.searchParams.get('department_id')
  const departmentId = isTeacher ? requestedDepartmentId : auth.departmentIds[0]
  if (!departmentId) {
    return NextResponse.json({ error: 'Fachbereich fehlt.' }, { status: 400 })
  }
  const forbidden = assertCanAdminDepartmentContent(auth, departmentId)
  if (forbidden) return forbidden

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
