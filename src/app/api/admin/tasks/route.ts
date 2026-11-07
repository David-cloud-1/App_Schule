import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { EMPTY_TASK_COUNTS, type TaskCounts } from '@/lib/teacher-tasks'

const ROUTE = 'api/admin/tasks'
const DAY_MS = 86_400_000
/** Ältere beendete Nachweise ohne Freigabe gelten als erledigt oder vergessen und nerven nicht mehr */
const UNRELEASED_LOOKBACK_DAYS = 90

/**
 * Zähler für „Zu erledigen“ (PROJ-81): nur Zahlen, keine Namen oder Inhalte.
 * Jede Quelle wird einzeln gelesen; fällt eine aus, bleibt ihr Wert `null` und
 * die übrigen erscheinen trotzdem. Gelesen wird mit dem Zeilenschutz der
 * Person, die fragt: sie sieht nur, was sie auch sonst sehen dürfte.
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth
  const isTeacher = auth.role === 'teacher'
  // Lehrkräfte haben keinen eigenen Bereich; Admins zählen für ihren (bzw. den gewählten) Bereich
  const departmentId = isTeacher ? null : auth.suggestedDepartmentId

  const counts: TaskCounts = { ...EMPTY_TASK_COUNTS }

  // ── gemeldete Fragen (PROJ-73) ───────────────────────────────────────
  try {
    let query = supabase
      .from('question_report_groups')
      .select('question_id', { count: 'exact', head: true })
      // Was ich gerade selbst prüfe, ist für mich nicht mehr „offen“
      .or(`status.eq.offen,and(status.eq.in_pruefung,handled_by.neq.${user.id})`)
    if (departmentId) query = query.eq('department_id', departmentId)
    const { count, error } = await query
    if (!error) counts.openReports = count ?? 0
    else console.error(`[${ROUTE}] openReports`, error)
  } catch (err) {
    console.error(`[${ROUTE}] openReports`, err)
  }

  // ── Nachweise: Entwürfe mit Termin, beendet ohne Freigabe ────────────
  try {
    const now = new Date()
    const since = new Date(now.getTime() - UNRELEASED_LOOKBACK_DAYS * DAY_MS).toISOString()
    const { data, error } = await supabase
      .from('graded_assessments')
      .select('id, status, opens_at, closes_at, created_by, department_id')
      .is('results_released_at', null)
      .gte('closes_at', since)
      .limit(500)
    if (error) throw error

    const own = (data ?? []).filter((a) => {
      if (isTeacher) return a.created_by === user.id
      return departmentId ? a.department_id === departmentId : true
    })

    const inSevenDays = now.getTime() + 7 * DAY_MS
    counts.upcomingDrafts = own.filter((a) => {
      if (a.status !== 'draft') return false
      const opens = new Date(a.opens_at as string).getTime()
      return opens >= now.getTime() && opens <= inSevenDays
    }).length

    const ended = own.filter(
      (a) => a.status === 'closed' || (a.status === 'open' && new Date(a.closes_at as string).getTime() < now.getTime()),
    )
    if (ended.length === 0) {
      counts.unreleasedAssessments = 0
    } else {
      // Nur Nachweise mit mindestens einer Abgabe zählen; Sitzungen liest nur der Dienst-Client,
      // und nur für Nachweise, die der Zeilenschutz oben schon freigegeben hat.
      const service = createServiceClient()
      const { data: sessions, error: sessionError } = await service
        .from('exam_sessions')
        .select('assessment_id')
        .in('assessment_id', ended.map((a) => a.id as string))
        .neq('status', 'in_progress')
        .limit(5000)
      if (sessionError) throw sessionError
      const withSubmissions = new Set((sessions ?? []).map((s) => s.assessment_id as string))
      counts.unreleasedAssessments = ended.filter((a) => withSubmissions.has(a.id as string)).length
    }
  } catch (err) {
    counts.upcomingDrafts = null
    counts.unreleasedAssessments = null
    console.error(`[${ROUTE}] assessments`, err)
  }

  // ── Fragen-Entwürfe aus KI oder Import (nur Admins) ──────────────────
  if (!isTeacher) {
    try {
      const { count, error } = await supabase
        .from('questions_draft')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
      if (!error) counts.draftQuestions = count ?? 0
      else console.error(`[${ROUTE}] draftQuestions`, error)
    } catch (err) {
      console.error(`[${ROUTE}] draftQuestions`, err)
    }
  }

  return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } })
}
