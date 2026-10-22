import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { ExamHistorySession } from '@/lib/exam-history'
import { cn } from '@/lib/utils'

/** Liste eigener Simulationen bzw. Leistungsnachweise (PROJ-43, vorher Prüfungsverlauf). */
export function ExamSessionList({ sessions }: { sessions: ExamHistorySession[] }) {
  return (
    <ul className="space-y-3">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/exam/${session.id}/results`}
            className="block rounded-2xl border border-[#4B5563] bg-[#1F2937] p-4 transition-colors hover:border-[#6B7280]"
          >
            <SessionContent session={session} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function formatDate(iso: string) {
  const date = new Date(iso)
  const opts = { timeZone: 'Europe/Berlin' } as const
  return `${date.toLocaleDateString('de-DE', { ...opts, day: '2-digit', month: '2-digit', year: 'numeric' })} · ${date.toLocaleTimeString('de-DE', { ...opts, hour: '2-digit', minute: '2-digit' })} Uhr`
}

function SessionContent({ session }: { session: ExamHistorySession }) {
  const parts = session.parts_selected ?? []
  const partResults = session.results_json?.parts ?? {}
  const assessment = session.results_json?.assessment

  if (assessment) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#F9FAFB]">{assessment.title}</p>
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{formatDate(session.started_at)}</p>
        </div>
        {assessment.released ? (
          <span className="shrink-0 text-lg font-bold text-[#F9FAFB]">Note {assessment.grade}</span>
        ) : (
          <Badge className="shrink-0 border-0 bg-[#4B5563]/40 text-xs text-[#9CA3AF]">Note ausstehend</Badge>
        )}
      </div>
    )
  }

  const scores = parts.map((p) => partResults[String(p)]?.score ?? null).filter((s): s is number => s != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const allPassed = parts.every((p) => partResults[String(p)]?.passed)

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {parts.map((p) => (
            <Badge key={p} variant="outline" className="border-[#4B5563] text-xs text-[#9CA3AF]">
              {`Teil ${p}`}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-[#9CA3AF]">{formatDate(session.started_at)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {avgScore != null && <span className="text-lg font-bold text-[#F9FAFB]">{avgScore}%</span>}
        <Badge
          className={cn(
            'border-0 text-xs',
            session.status === 'aborted'
              ? 'bg-[#FF9600]/20 text-[#FF9600]'
              : allPassed
                ? 'bg-[#58CC02]/20 text-[#58CC02]'
                : 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
          )}
        >
          {session.status === 'aborted' ? 'Abgebrochen' : allPassed ? 'Bestanden' : 'Nicht bestanden'}
        </Badge>
      </div>
    </div>
  )
}
