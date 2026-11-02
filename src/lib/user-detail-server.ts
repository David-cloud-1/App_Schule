import type { SupabaseClient } from '@supabase/supabase-js'
import { getLevelFromXp } from '@/lib/xp-utils'
import { fetchAnswerKey } from '@/lib/answer-key'
import {
  applyGrading,
  buildParticipantRows,
  snapshotQuestionIds,
  type GradeBoundary,
  type SessionRow,
} from '@/lib/graded-assessments'
import {
  aggregateSubjectStats,
  ACTIVITY_DAYS,
  berlinDateStr,
  buildActivityStrip,
  userActionLabel,
  type UserSectionKey,
} from '@/lib/user-detail'

/**
 * Daten der Nutzer-Detailseite (PROJ-59), Abschnitt für Abschnitt. Jede
 * Funktion bekommt den Service-Client (nach der Super-Admin-Prüfung der
 * Route) und das schon geladene Profil. Reine Lese-Abfragen mit Obergrenzen.
 */

type Target = {
  id: string
  display_name: string | null
  role: string
  pseudonym: string | null
  department_id: string | null
  created_at: string
  total_xp: number
  current_streak: number
  longest_streak: number
  last_session_date: string | null
  coin_balance: number
  linked_main_user_id: string | null
}

const SESSION_LIMIT = 5000
const ASSESSMENT_LIMIT = 50
const LOG_LIMIT = 20

export async function loadOverview(service: SupabaseClient, target: Target) {
  const { data: authData } = await service.auth.admin.getUserById(target.id)
  const authUser = authData?.user ?? null
  const bannedUntil = (authUser as unknown as { banned_until?: string | null } | null)?.banned_until ?? null

  let departmentName: string | null = null
  if (target.department_id) {
    const { data } = await service.from('departments').select('name').eq('id', target.department_id).maybeSingle()
    departmentName = (data as { name: string } | null)?.name ?? null
  }

  let linkedMain: { id: string; name: string | null } | null = null
  if (target.linked_main_user_id) {
    const { data } = await service
      .from('profiles')
      .select('id, display_name')
      .eq('id', target.linked_main_user_id)
      .maybeSingle()
    linkedMain = {
      id: target.linked_main_user_id,
      name: (data as { display_name: string | null } | null)?.display_name ?? null,
    }
  }

  return {
    id: target.id,
    displayName: target.display_name,
    pseudonym: target.pseudonym,
    email: authUser?.email ?? null,
    emailConfirmed: !!authUser?.email_confirmed_at,
    role: target.role,
    departmentId: target.department_id,
    departmentName,
    banned: !!(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
    registeredAt: target.created_at,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    lastSessionDate: target.last_session_date,
    totalXp: target.total_xp,
    level: getLevelFromXp(target.total_xp),
    currentStreak: target.current_streak,
    longestStreak: target.longest_streak,
    coins: target.coin_balance,
    linkedMain,
  }
}

export async function loadLearning(service: SupabaseClient, target: Target) {
  const since = berlinDateStr(new Date(Date.now() - (ACTIVITY_DAYS + 1) * 86_400_000))

  const [sessionsRes, blitzRes] = await Promise.all([
    service
      .from('quiz_sessions')
      .select('subject_id, score, total, completed_at')
      .eq('user_id', target.id)
      .order('completed_at', { ascending: false })
      .limit(SESSION_LIMIT),
    service.from('blitz_rounds').select('calendar_day').eq('user_id', target.id).gte('calendar_day', since).limit(100),
  ])
  if (sessionsRes.error) throw new Error(`quiz_sessions: ${sessionsRes.error.message}`)

  const sessions = (sessionsRes.data ?? []) as {
    subject_id: string | null
    score: number
    total: number
    completed_at: string
  }[]

  const subjectIds = [...new Set(sessions.map((s) => s.subject_id).filter((v): v is string => !!v))]
  const names = new Map<string, string>()
  if (subjectIds.length > 0) {
    const { data } = await service.from('subjects').select('id, name').in('id', subjectIds)
    for (const s of (data ?? []) as { id: string; name: string }[]) names.set(s.id, s.name)
  }

  const learnedDates = [
    ...sessions.map((s) => berlinDateStr(new Date(s.completed_at))),
    ...((blitzRes.data ?? []) as { calendar_day: string }[]).map((r) => r.calendar_day),
  ]

  return {
    subjects: aggregateSubjectStats(sessions, names),
    activity: buildActivityStrip(learnedDates),
  }
}

export async function loadBadges(service: SupabaseClient, target: Target) {
  const { data, error } = await service
    .from('user_badges')
    .select('badge_id, unlocked_at')
    .eq('user_id', target.id)
    .order('unlocked_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`user_badges: ${error.message}`)

  const rows = (data ?? []) as { badge_id: string; unlocked_at: string }[]
  const info = new Map<string, { name: string; icon: string | null }>()
  if (rows.length > 0) {
    const { data: badges } = await service
      .from('badges')
      .select('id, name, icon')
      .in(
        'id',
        rows.map((r) => r.badge_id),
      )
    for (const b of (badges ?? []) as { id: string; name: string; icon: string | null }[]) {
      info.set(b.id, { name: b.name, icon: b.icon })
    }
  }

  return {
    badges: rows.map((r) => ({
      id: r.badge_id,
      name: info.get(r.badge_id)?.name ?? r.badge_id,
      icon: info.get(r.badge_id)?.icon ?? null,
      unlockedAt: r.unlocked_at,
    })),
  }
}

type AssessmentSession = SessionRow & { assessment_id: string }

export async function loadAssessments(service: SupabaseClient, target: Target) {
  const { data, error } = await service
    .from('exam_sessions')
    .select('id, assessment_id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
    .eq('user_id', target.id)
    .not('assessment_id', 'is', null)
    .order('started_at', { ascending: false })
    .limit(ASSESSMENT_LIMIT)
  if (error) throw new Error(`exam_sessions: ${error.message}`)

  const sessions = (data ?? []) as unknown as AssessmentSession[]
  if (sessions.length === 0) return { assessments: [] }

  const assessmentIds = [...new Set(sessions.map((s) => s.assessment_id))]
  const { data: assessmentRows } = await service
    .from('graded_assessments')
    .select('id, title, part, grading_scale, focus_tracking')
    .in('id', assessmentIds)
  const assessments = new Map(
    (
      (assessmentRows ?? []) as {
        id: string
        title: string
        part: number
        grading_scale: GradeBoundary[]
        focus_tracking: boolean
      }[]
    ).map((a) => [a.id, a]),
  )

  const trackedSessionIds = sessions.filter((s) => assessments.get(s.assessment_id)?.focus_tracking).map((s) => s.id)
  const focusBySession = new Map<string, number>()
  if (trackedSessionIds.length > 0) {
    const { data: focus } = await service
      .from('assessment_focus_summary')
      .select('session_id, counted_switches')
      .in('session_id', trackedSessionIds)
    for (const f of (focus ?? []) as { session_id: string; counted_switches: number }[]) {
      focusBySession.set(f.session_id, f.counted_switches)
    }
  }

  const rows: {
    sessionId: string
    assessmentId: string
    title: string
    date: string
    status: 'in_progress' | 'completed'
    excluded: boolean
    points: number | null
    totalPoints: number | null
    grade: number | null
    focusSwitches: number | null
  }[] = []

  // Je Nachweis bewerten (jeder hat Teil und Notenschlüssel), Antwortschlüssel einmal je Nachweis holen
  for (const assessmentId of assessmentIds) {
    const assessment = assessments.get(assessmentId)
    const own = sessions.filter((s) => s.assessment_id === assessmentId)
    if (!assessment) {
      for (const s of own) {
        rows.push({
          sessionId: s.id,
          assessmentId,
          title: 'Nachweis nicht mehr vorhanden',
          date: s.started_at,
          status: s.status === 'in_progress' ? 'in_progress' : 'completed',
          excluded: s.excluded_from_grading,
          points: null,
          totalPoints: null,
          grade: null,
          focusSwitches: null,
        })
      }
      continue
    }
    const key = await fetchAnswerKey(snapshotQuestionIds(own, assessment.part))
    const graded = applyGrading(own, assessment.part, key, assessment.grading_scale)
    const participants = buildParticipantRows(graded, assessment.part, assessment.grading_scale)
    graded.forEach((s, i) => {
      const p = participants[i]
      rows.push({
        sessionId: s.id,
        assessmentId,
        title: assessment.title,
        date: s.ended_at ?? s.started_at,
        status: p.status,
        excluded: p.excluded,
        points: p.points,
        totalPoints: p.totalPoints,
        grade: p.grade,
        focusSwitches: assessment.focus_tracking ? (focusBySession.get(s.id) ?? 0) : null,
      })
    })
  }

  rows.sort((a, b) => b.date.localeCompare(a.date))
  return { assessments: rows }
}

export async function loadLog(service: SupabaseClient, target: Target) {
  const { data, error, count } = await service
    .from('admin_audit_log')
    .select('id, created_at, admin_id, action_type, details', { count: 'exact' })
    .eq('object_type', 'user')
    .eq('object_id', target.id)
    .order('created_at', { ascending: false })
    .limit(LOG_LIMIT)
  if (error) throw new Error(`admin_audit_log: ${error.message}`)

  const entries = (data ?? []) as {
    id: string
    created_at: string
    admin_id: string
    action_type: string
    details: Record<string, unknown> | null
  }[]

  const adminIds = [...new Set(entries.map((e) => e.admin_id).filter(Boolean))]
  const adminNames = new Map<string, string | null>()
  if (adminIds.length > 0) {
    const { data: admins } = await service.from('profiles').select('id, display_name').in('id', adminIds)
    for (const a of (admins ?? []) as { id: string; display_name: string | null }[]) {
      adminNames.set(a.id, a.display_name)
    }
  }

  return {
    total: count ?? entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      createdAt: e.created_at,
      actionType: e.action_type,
      label: userActionLabel(e.action_type),
      adminName: adminNames.get(e.admin_id) ?? null,
      details: e.details,
    })),
  }
}

export const SECTION_LOADERS: Record<UserSectionKey, (service: SupabaseClient, target: Target) => Promise<unknown>> = {
  overview: loadOverview,
  learning: loadLearning,
  badges: loadBadges,
  assessments: loadAssessments,
  log: loadLog,
}
