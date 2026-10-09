'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GradeBoundary, StudentReport } from '@/lib/graded-assessments'

// Druckansichten für Leistungsnachweise (PROJ-28). Bewusst hell auf weißem
// Grund — Ausnahme vom Dark-Mode-Grundsatz, weil das Ergebnis auf Papier
// landet. Alles, was nur am Bildschirm sinnvoll ist, trägt `print:hidden`.

const BERLIN = { timeZone: 'Europe/Berlin' } as const

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE', BERLIN) : '—'
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('de-DE', BERLIN) : '—'
}

/** „1 ab 92 % · 2 ab 81 % …" — der Schlüssel, nach dem benotet wurde. */
export function scaleLabel(scale: GradeBoundary[]): string {
  return [...scale]
    .sort((a, b) => a.grade - b.grade)
    .map((b) => (b.grade === 6 ? `6 unter ${[...scale].find((s) => s.grade === 5)?.minPercent ?? 0} %` : `${b.grade} ab ${b.minPercent} %`))
    .join(' · ')
}

/** A4 nur, solange eine Druckseite offen ist — andere Seiten der App bleiben unberührt. */
function PageSetup() {
  return <style>{'@page { size: A4; margin: 15mm; }'}</style>
}

export function PrintToolbar({
  backHref,
  children,
  printDisabled,
}: {
  backHref: string
  children?: React.ReactNode
  printDisabled?: boolean
}) {
  return (
    <>
    <PageSetup />
    <div className="print:hidden mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="text-[#9CA3AF] hover:text-[#F9FAFB]" aria-label="Zurück zum Leistungsnachweis">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 flex flex-wrap items-center gap-4">{children}</div>
        <Button
          onClick={() => {
            try {
              window.print()
            } catch {
              // Manche In-App-Browser können nicht drucken — der Hinweis unten erklärt das.
            }
          }}
          disabled={printDisabled}
          className="rounded-2xl bg-[#58CC02] hover:bg-[#4CAF00] text-white min-h-11"
        >
          <Printer size={16} className="mr-2" />
          Drucken / Als PDF sichern
        </Button>
      </div>
      <p className="text-xs text-[#9CA3AF]">
        Im Druckdialog wählst du den Drucker oder „Als PDF speichern“. Das klappt am besten im normalen Browser am
        Computer; in eingebetteten App-Browsern am Smartphone kann der Druck fehlen.
      </p>
    </div>
    </>
  )
}

function Sheet({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <article
      className={`bg-white text-black rounded-2xl shadow-lg p-6 sm:p-10 mx-auto max-w-[210mm] print:max-w-none print:rounded-none print:shadow-none print:p-0 ${
        last ? '' : 'print:break-after-page mb-6 print:mb-0'
      }`}
    >
      {children}
    </article>
  )
}

const RESULT_LABEL: Record<'correct' | 'wrong' | 'unanswered', string> = {
  correct: 'richtig',
  wrong: 'falsch',
  unanswered: 'nicht beantwortet',
}

export function StudentReportSheet({
  title,
  partLabel,
  date,
  scale,
  report,
  showExplanations,
  last,
}: {
  title: string
  partLabel: string
  date: string
  scale: GradeBoundary[]
  report: StudentReport
  showExplanations: boolean
  last?: boolean
}) {
  return (
    <Sheet last={last}>
      <header className="border-b-2 border-black pb-3 mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-600">Einzelauswertung · {partLabel}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-700">Datum: {date}</p>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600">Name</p>
          <p className="text-xl font-semibold">{report.name}</p>
        </div>
        {report.excluded ? (
          <p className="border border-gray-500 rounded px-3 py-2 text-sm font-semibold">Von der Wertung ausgeschlossen</p>
        ) : (
          <dl className="flex gap-6 border border-gray-500 rounded px-4 py-2 text-center">
            <div>
              <dt className="text-xs text-gray-600">Punkte</dt>
              <dd className="text-lg font-bold">{report.points}/{report.totalPoints}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Prozent</dt>
              <dd className="text-lg font-bold">{report.percent} %</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Note</dt>
              <dd className="text-2xl font-bold">{report.grade}</dd>
            </div>
          </dl>
        )}
      </section>
      <p className="text-xs text-gray-600 mb-5">Notenschlüssel: {scaleLabel(scale)}</p>

      {report.excluded ? null : (
        <ol className="space-y-4 list-decimal pl-5">
          {report.questions.map((q) => (
            <li key={q.id} className="print:break-inside-avoid">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{q.text}</p>
                <span className="text-xs font-bold border border-gray-500 rounded px-2 py-0.5 whitespace-nowrap">
                  {q.result === 'correct' ? '✓' : q.result === 'wrong' ? '✗' : '–'} {RESULT_LABEL[q.result]}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-sm">
                {q.options.map((o) => (
                  <li key={o.id} className={o.isCorrect ? 'font-semibold' : ''}>
                    <span aria-hidden="true">{o.selected ? '☒' : '☐'} </span>
                    {o.text}
                    {o.selected && ' (gewählt)'}
                    {o.isCorrect && ' (richtige Antwort)'}
                  </li>
                ))}
              </ul>
              {showExplanations && q.explanation && (
                <p className="mt-1.5 text-xs text-gray-700 border-l-2 border-gray-400 pl-2">Erklärung: {q.explanation}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  )
}

export type ClassParticipant = {
  sessionId: string
  name: string
  points: number | null
  totalPoints: number | null
  percent: number | null
  grade: number | null
  excluded: boolean
  status: 'in_progress' | 'completed'
}

export type ClassQuestionStat = { id: string; text: string; correctCount: number; totalCount: number }

export function ClassReportSheet({
  title,
  partLabel,
  date,
  scale,
  participants,
  gradeDistribution,
  questions,
}: {
  title: string
  partLabel: string
  date: string
  scale: GradeBoundary[]
  participants: ClassParticipant[]
  gradeDistribution: { counts: Record<string, number>; average: number | null; passRate: number | null }
  questions: ClassQuestionStat[]
}) {
  const byName = (a: ClassParticipant, b: ClassParticipant) => a.name.localeCompare(b.name, 'de')
  const graded = participants.filter((p) => p.status === 'completed' && !p.excluded && p.grade != null).sort(byName)
  const excluded = participants.filter((p) => p.status === 'completed' && p.excluded).sort(byName)
  const stillWriting = participants.filter((p) => p.status === 'in_progress').length
  const grades = graded.map((p) => p.grade as number)
  const avgPercent = graded.length > 0 ? graded.reduce((s, p) => s + (p.percent ?? 0), 0) / graded.length : null
  const maxCount = Math.max(1, ...Object.values(gradeDistribution.counts).map((n) => Number(n) || 0))
  const sortedQuestions = [...questions]
    .map((q) => ({ ...q, pct: q.totalCount > 0 ? Math.round((q.correctCount / q.totalCount) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)

  return (
    <Sheet last>
      <header className="border-b-2 border-black pb-3 mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-600">Klassenauswertung · {partLabel}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-700">
          Datum: {date} · {graded.length} gewertet
          {excluded.length > 0 && ` · ${excluded.length} ausgeschlossen`}
        </p>
        {stillWriting > 0 && (
          <p className="mt-2 inline-block border border-gray-600 rounded px-2 py-0.5 text-xs font-bold">
            Zwischenstand – {stillWriting} {stillWriting === 1 ? 'Teilnehmer schreibt' : 'Teilnehmer schreiben'} noch
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">Notenschlüssel: {scaleLabel(scale)}</p>
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Notenliste</h2>
        <table className="w-full text-sm border-collapse">
          <thead className="table-header-group">
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2">Name</th>
              <th className="py-1 pr-2">Punkte</th>
              <th className="py-1 pr-2">Prozent</th>
              <th className="py-1 text-right">Note</th>
            </tr>
          </thead>
          <tbody>
            {graded.map((p) => (
              <tr key={p.sessionId} className="border-b border-gray-300 print:break-inside-avoid">
                <td className="py-1 pr-2">{p.name}</td>
                <td className="py-1 pr-2">{p.points}/{p.totalPoints}</td>
                <td className="py-1 pr-2">{p.percent} %</td>
                <td className="py-1 text-right font-bold">{p.grade}</td>
              </tr>
            ))}
            {excluded.map((p) => (
              <tr key={p.sessionId} className="border-b border-gray-300 text-gray-600 print:break-inside-avoid">
                <td className="py-1 pr-2">{p.name}</td>
                <td className="py-1 pr-2 italic" colSpan={3}>von der Wertung ausgeschlossen</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {graded.length > 0 && (
        <section className="mb-6 print:break-inside-avoid">
          <h2 className="text-lg font-bold mb-2">Statistik</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 text-center">
            {[
              ['Ø-Note', gradeDistribution.average != null ? gradeDistribution.average.toFixed(2).replace('.', ',') : '—'],
              ['Bestanden (1–4)', gradeDistribution.passRate != null ? `${Math.round(gradeDistribution.passRate)} %` : '—'],
              ['Beste Note', String(Math.min(...grades))],
              ['Schlechteste Note', String(Math.max(...grades))],
              ['Ø-Prozent', avgPercent != null ? `${Math.round(avgPercent)} %` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="border border-gray-400 rounded px-2 py-2">
                <dt className="text-xs text-gray-600">{label}</dt>
                <dd className="text-lg font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-2 w-14">Note</th>
                <th className="py-1 pr-2 w-14">Anzahl</th>
                <th className="py-1">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((grade) => {
                const count = Number(gradeDistribution.counts[String(grade)] ?? 0)
                return (
                  <tr key={grade} className="border-b border-gray-300">
                    <td className="py-1 pr-2 font-bold">{grade}</td>
                    <td className="py-1 pr-2">{count}</td>
                    <td className="py-1">
                      <div
                        className="h-3 bg-gray-700"
                        style={{ width: `${(count / maxCount) * 100}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {sortedQuestions.length > 0 && graded.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-1">Fragenanalyse</h2>
          <p className="text-xs text-gray-600 mb-2">Anteil richtiger Antworten, schwächste Fragen zuerst.</p>
          <table className="w-full text-sm border-collapse">
            <thead className="table-header-group">
              <tr className="border-b border-black text-left">
                <th className="py-1 pr-2 w-16">Richtig</th>
                <th className="py-1">Frage</th>
              </tr>
            </thead>
            <tbody>
              {sortedQuestions.map((q) => (
                <tr key={q.id} className="border-b border-gray-300 align-top print:break-inside-avoid">
                  <td className="py-1 pr-2 font-bold whitespace-nowrap">{q.pct} %</td>
                  <td className="py-1">{q.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </Sheet>
  )
}
