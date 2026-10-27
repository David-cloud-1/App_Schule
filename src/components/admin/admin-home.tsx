'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ExternalLink, GraduationCap, UserCog } from 'lucide-react'
import { useAdminRole, useHasSubjects } from '@/components/admin/admin-role-provider'
import { adminHomeActionsFor } from '@/lib/admin-nav'
import { TeacherWelcomeDialog } from '@/components/admin/teacher-welcome-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'

type MySubjectTile = {
  id: string
  name: string
  code: string
  department_name: string | null
  active_question_count: number
}

type RunningAssessment = {
  id: string
  title: string
  status: 'draft' | 'open' | 'closed'
  accessCode: string
  className: string | null
  participantCount: number
  submittedCount: number
}

const cardLink =
  'group flex items-center gap-4 rounded-2xl border border-ws-line bg-ws-surface p-4 shadow-lg transition-all duration-200 hover:border-ws-green hover:bg-ws-raised active:scale-95'

const sectionTitle = 'text-sm font-semibold uppercase tracking-wider text-ws-faint'

/** „Meine Fächer"-Kacheln (PROJ-48) — nur für eine Lehrkraft mit Zuständigkeiten. */
function useMySubjectTiles(enabled: boolean): MySubjectTile[] {
  const [tiles, setTiles] = useState<MySubjectTile[]>([])
  useEffect(() => {
    if (!enabled) return
    fetch('/api/admin/subjects')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.subjects) setTiles(json.subjects)
      })
      .catch(() => {})
  }, [enabled])
  return tiles
}

/** Offene Leistungsnachweise mit Live-Stand; `null` = lädt noch, `'error'` = fehlgeschlagen. */
function useRunningAssessments(): { data: RunningAssessment[] | null | 'error'; reload: () => void } {
  const [data, setData] = useState<RunningAssessment[] | null | 'error'>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/assessments')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: { assessments?: RunningAssessment[] }) => {
        if (!cancelled) setData((json.assessments ?? []).filter((a) => a.status === 'open'))
      })
      .catch(() => {
        if (!cancelled) setData('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])
  const reload = useCallback(() => {
    setData(null)
    setAttempt((n) => n + 1)
  }, [])
  return { data, reload }
}

/**
 * Startseite des Lehrkräfte-Bereichs: was gerade läuft (offene Nachweise mit
 * Live-Stand), dann Schnellaktionen — keine zweite Kopie der Navigation.
 */
export function AdminHome() {
  const { role, displayName, showTeacherWelcome } = useAdminRole()
  const hasSubjects = useHasSubjects()
  const isApple = useIsApplePlatform()
  const actions = adminHomeActionsFor(role, hasSubjects)
  const mySubjects = useMySubjectTiles(role === 'teacher' && hasSubjects)
  const running = useRunningAssessments()

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={displayName ? `Hallo, ${displayName}` : 'Hallo'}
        description={`Was möchtest du heute tun? Mit ${isApple ? '⌘K' : 'Strg+K'} findest du jede Seite.`}
      />

      {!hasSubjects && (
        <Link href="/admin/my-subjects" className={`${cardLink} border-ws-green/40`}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
            <UserCog className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-ws-text">Trag deine Fächer ein</span>
            <span className="block text-sm text-ws-muted">
              Danach siehst und pflegst du die Fragen, Themen und Prüfungssimulationen deiner Fächer.
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}

      <section aria-labelledby="home-running" className="space-y-3">
        <h2 id="home-running" className={sectionTitle}>
          Laufende Leistungsnachweise
        </h2>
        {running.data === null ? (
          <AdminLoadingState variant="list" rows={1} />
        ) : running.data === 'error' ? (
          <p className="text-sm text-ws-muted">
            Konnte gerade nicht geladen werden.{' '}
            <button type="button" onClick={running.reload} className="font-semibold text-ws-blue hover:underline">
              Erneut versuchen
            </button>
          </p>
        ) : running.data.length === 0 ? (
          <p className="text-sm text-ws-muted">Gerade läuft kein Leistungsnachweis.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {running.data.map((a) => {
              const writing = Math.max(0, a.participantCount - a.submittedCount)
              return (
                <li key={a.id}>
                  <Link href={`/admin/leistungsnachweise/${a.id}`} className={cardLink}>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
                      <GraduationCap className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-ws-text" title={a.title}>
                        {a.title}
                      </span>
                      <span className="block truncate text-sm text-ws-muted">
                        {[a.className, `Code ${a.accessCode}`].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm leading-tight">
                      <span className="block font-semibold text-ws-blue">{writing} schreiben</span>
                      <span className="block font-semibold text-ws-green">{a.submittedCount} abgegeben</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="home-actions" className="space-y-3">
        <h2 id="home-actions" className={sectionTitle}>
          Schnellaktionen
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const content = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ws-raised text-ws-text">
                  <action.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ws-text">{action.label}</span>
                  <span className="block text-sm text-ws-muted">{action.description}</span>
                </span>
                {action.external ? (
                  <ExternalLink className="size-4 shrink-0 text-ws-muted" aria-label="öffnet in neuem Tab" />
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-hover:translate-x-1" />
                )}
              </>
            )
            return (
              <li key={action.id}>
                {action.external ? (
                  <a href={action.href} target="_blank" rel="noopener noreferrer" className={cardLink}>
                    {content}
                  </a>
                ) : (
                  <Link href={action.href} className={cardLink}>
                    {content}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {mySubjects.length > 0 && (
        <section aria-labelledby="home-subjects" className="space-y-3">
          <h2 id="home-subjects" className={sectionTitle}>
            Meine Fächer
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mySubjects.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/questions?subject=${encodeURIComponent(s.code)}`}
                  className={`${cardLink} justify-between gap-3`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ws-muted">{s.department_name ?? ''}</span>
                    <span className="block truncate text-base font-semibold text-ws-text" title={s.name}>
                      {s.name}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ws-green/15 px-3 py-1 text-xs font-semibold text-ws-green">
                    {s.active_question_count} aktiv
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {role === 'teacher' && showTeacherWelcome && <TeacherWelcomeDialog initialOpen />}
    </div>
  )
}
