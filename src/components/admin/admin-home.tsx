'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ExternalLink, Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { adminHomeActionsFor } from '@/lib/admin-nav'
import { BLOCKED_PAGE_MESSAGE, BLOCKED_PARAM, SUPER_ADMIN_ONLY_MESSAGE } from '@/lib/roles'
import { TeacherWelcomeDialog } from '@/components/admin/teacher-welcome-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminLoadingState } from '@/components/admin/admin-states'

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

/** Eine Liste in einem gemeinsamen Rahmen: Zeilen statt lose Karten, getrennt durch feine Linien */
const listBox = 'divide-y divide-ws-line overflow-hidden rounded-xl border border-ws-line bg-ws-surface'

const rowLink =
  'group flex min-h-14 items-center gap-4 px-4 py-3 transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ws-green'

const sectionTitle = 'text-base font-semibold text-ws-text'

/** Aus einer Anmelde-Adresse („david.zach@…“) einen Vornamen machen; echte Namen bleiben unverändert. */
function greetingName(displayName?: string): string {
  if (!displayName) return ''
  if (!displayName.includes('@')) return displayName
  const first = displayName.split('@')[0].split(/[._-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : ''
}

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
    fetch('/api/admin/assessments?scope=workspace')
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
export function AdminHome({
  blocked = false,
  blockedBy = 'admin',
}: {
  blocked?: boolean
  /** Wer die gesperrte Seite verwaltet: Bereichs-Admin (PROJ-49) oder nur der Super-Admin (PROJ-59) */
  blockedBy?: 'admin' | 'super'
}) {
  const { role, displayName, showTeacherWelcome } = useAdminRole()
  const actions = adminHomeActionsFor(role)
  const mySubjects = useMySubjectTiles(role === 'teacher')
  const running = useRunningAssessments()

  // PROJ-49: Hinweis nach der Umleitung einmal zeigen, dann die Markierung aus der Adresse nehmen
  useEffect(() => {
    if (!blocked) return
    const url = new URL(window.location.href)
    if (url.searchParams.has(BLOCKED_PARAM)) {
      url.searchParams.delete(BLOCKED_PARAM)
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [blocked])

  const name = greetingName(displayName)
  const primary = actions.find((a) => a.id === 'neuer-nachweis')
  const others = actions.filter((a) => a.id !== 'neuer-nachweis')

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <AdminPageHeader
        title={name ? `Hallo, ${name}` : 'Hallo'}
        description="Hier siehst du, was gerade läuft, und kommst schnell zu deinen nächsten Aufgaben."
        actions={
          primary && (
            <Button
              asChild
              className="min-h-11 rounded-xl bg-ws-green px-5 font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
            >
              <Link href={primary.href}>
                <Plus className="size-5" aria-hidden />
                {primary.label}
              </Link>
            </Button>
          )
        }
      />

      {blocked && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-4 text-sm text-ws-blue"
        >
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            {blockedBy === 'super' ? (
              <>
                <span className="font-semibold">Diese Seite ist nur für den Super-Admin.</span> {SUPER_ADMIN_ONLY_MESSAGE}
              </>
            ) : (
              <>
                <span className="font-semibold">Diese Seite ist nur für Admins.</span> {BLOCKED_PAGE_MESSAGE}
              </>
            )}
          </span>
        </p>
      )}


      <section aria-labelledby="home-running" className="space-y-3">
        <h2 id="home-running" className={sectionTitle}>
          Läuft gerade
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
          <p className="rounded-xl border border-dashed border-ws-line px-4 py-5 text-sm text-ws-muted">
            Gerade läuft kein Leistungsnachweis.
          </p>
        ) : (
          <ul className={listBox}>
            {running.data.map((a) => {
              const writing = Math.max(0, a.participantCount - a.submittedCount)
              return (
                <li key={a.id}>
                  <Link href={`/admin/leistungsnachweise/${a.id}`} className={rowLink}>
                    <span className="relative flex size-2.5 shrink-0" aria-hidden>
                      <span className="absolute inline-flex size-full rounded-full bg-ws-green" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ws-text" title={a.title}>
                        {a.title}
                      </span>
                      <span className="block truncate text-sm text-ws-muted">
                        {[a.className, `Code ${a.accessCode}`].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm leading-snug text-ws-muted">
                      <span className="block">
                        <span className="font-semibold text-ws-text">{writing}</span> schreiben
                      </span>
                      <span className="block">
                        <span className="font-semibold text-ws-text">{a.submittedCount}</span> abgegeben
                      </span>
                    </span>
                    <ChevronRight
                      className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="home-actions" className="space-y-3">
          <h2 id="home-actions" className={sectionTitle}>
            Das kannst du als Nächstes tun
          </h2>
          <ul className={listBox}>
            {others.map((action) => {
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ws-text">{action.label}</span>
                    <span className="block text-sm text-ws-muted">{action.description}</span>
                  </span>
                  {action.external ? (
                    <ExternalLink className="size-4 shrink-0 text-ws-muted" aria-label="öffnet in neuem Tab" />
                  ) : (
                    <ChevronRight
                      className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  )}
                </>
              )
              return (
                <li key={action.id}>
                  {action.external ? (
                    <a href={action.href} target="_blank" rel="noopener noreferrer" className={rowLink}>
                      {content}
                    </a>
                  ) : (
                    <Link href={action.href} className={rowLink}>
                      {content}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {mySubjects.length > 0 && (
        <section aria-labelledby="home-subjects" className="space-y-3">
          <h2 id="home-subjects" className={sectionTitle}>
            Meine Fächer
          </h2>
          <ul className={listBox}>
            {mySubjects.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/questions?subject=${encodeURIComponent(s.code)}`} className={rowLink}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ws-text" title={s.name}>
                      {s.name}
                    </span>
                    {s.department_name && (
                      <span className="block truncate text-sm text-ws-muted">{s.department_name}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-ws-muted">{s.active_question_count} aktiv</span>
                  <ChevronRight className="size-5 shrink-0 text-ws-muted" aria-hidden />
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
