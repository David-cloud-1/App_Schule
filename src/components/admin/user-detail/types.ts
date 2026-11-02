import type { ActivityDay, SubjectStat } from '@/lib/user-detail'

/** Antworten von /api/admin/users/[id]/detail/[section] (PROJ-59) */

export type UserOverview = {
  id: string
  displayName: string | null
  pseudonym: string | null
  email: string | null
  emailConfirmed: boolean
  role: 'student' | 'teacher' | 'department_admin' | 'admin'
  departmentId: string | null
  departmentName: string | null
  banned: boolean
  registeredAt: string
  lastSignInAt: string | null
  lastSessionDate: string | null
  totalXp: number
  level: number
  currentStreak: number
  longestStreak: number
  coins: number
  linkedMain: { id: string; name: string | null } | null
}

export type LearningData = { subjects: SubjectStat[]; activity: ActivityDay[] }

export type BadgeEntry = { id: string; name: string; icon: string | null; unlockedAt: string }
export type BadgesData = { badges: BadgeEntry[] }

export type AssessmentEntry = {
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
}
export type AssessmentsData = { assessments: AssessmentEntry[] }

export type LogEntry = {
  id: string
  createdAt: string
  actionType: string
  label: string
  adminName: string | null
  details: Record<string, unknown> | null
}
export type LogData = { total: number; entries: LogEntry[] }

export type SectionState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; notFound: boolean }
