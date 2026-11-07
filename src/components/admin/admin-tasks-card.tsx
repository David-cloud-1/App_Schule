'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, FileQuestion, Flag, RefreshCw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { useTaskCounts } from '@/components/admin/use-task-counts'
import { buildTaskEntries, type TaskId } from '@/lib/teacher-tasks'

const ICON: Record<TaskId, LucideIcon> = {
  upcomingDrafts: CalendarClock,
  openReports: Flag,
  draftQuestions: FileQuestion,
  unreleasedAssessments: ClipboardCheck,
}

const VISIBLE = 5

const rowLink =
  'group flex min-h-14 items-center gap-4 px-4 py-3 transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ws-green'

/**
 * „Zu erledigen“ auf der Startseite (PROJ-81): was gerade auf die Person wartet,
 * mit Anzahl und Link. Ohne offene Punkte steht „Alles erledigt“. Quellen, die
 * es nicht gibt oder die ausfallen, fehlen still.
 */
export function AdminTasksCard() {
  const { counts, status, reload } = useTaskCounts('home')
  const [showAll, setShowAll] = useState(false)
  const entries = useMemo(() => buildTaskEntries(counts), [counts])
  const shown = showAll ? entries : entries.slice(0, VISIBLE)

  return (
    <section aria-labelledby="home-tasks" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-tasks" className="text-base font-semibold text-ws-text">
          Zu erledigen
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void reload()}
          aria-label="Aktualisieren"
          className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
        >
          <RefreshCw className="size-4" aria-hidden />
        </Button>
      </div>

      {status === 'loading' ? (
        <AdminLoadingState variant="list" rows={2} />
      ) : status === 'error' ? (
        <p className="text-sm text-ws-muted">
          Konnte gerade nicht geladen werden.{' '}
          <button type="button" onClick={() => void reload()} className="font-semibold text-ws-blue hover:underline">
            Erneut versuchen
          </button>
        </p>
      ) : entries.length === 0 ? (
        <p className="flex items-center gap-3 rounded-xl border border-dashed border-ws-line px-4 py-5 text-sm text-ws-muted">
          <CheckCircle2 className="size-5 shrink-0 text-ws-green" aria-hidden />
          Alles erledigt. Gerade wartet nichts auf dich.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-ws-line overflow-hidden rounded-xl border border-ws-line bg-ws-surface">
            {shown.map((e) => {
              const Icon = ICON[e.id]
              return (
                <li key={e.id}>
                  <Link href={e.href} className={rowLink}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ws-orange/15 text-ws-orange">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ws-text">{e.text}</span>
                    <ChevronRight
                      className="size-5 shrink-0 text-ws-faint transition-colors duration-200 group-hover:text-ws-text"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
          {entries.length > VISIBLE && !showAll && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAll(true)}
              className="min-h-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
            >
              Weitere anzeigen
            </Button>
          )}
        </>
      )}
    </section>
  )
}
