'use client'

import { Suspense, use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useExamParts } from '@/components/department-provider'
import { examPartLabel, findExamPart } from '@/lib/exam-parts'
import type { GradeBoundary, StudentReport } from '@/lib/graded-assessments'
import { PrintToolbar, StudentReportSheet, formatDate } from '@/components/admin/assessment-print'

type ReportsResponse = {
  assessment: { title: string; part: number; opensAt: string; gradingScale: GradeBoundary[] }
  stillWriting: number
  reports: StudentReport[]
}

function SingleOrAllPrint({ id }: { id: string }) {
  const sessionId = useSearchParams().get('sessionId')
  const examParts = useExamParts()
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [showExplanations, setShowExplanations] = useState(false)

  async function load() {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/assessments/${id}/reports${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`)
      if (!res.ok) throw new Error('load failed')
      setData((await res.json()) as ReportsResponse)
      setState('ready')
    } catch {
      setState('failed')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId])

  if (state === 'loading') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#9CA3AF]" />
      </div>
    )
  }

  if (state === 'failed' || !data) {
    return (
      <div className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563]">
        <p className="text-[#9CA3AF]">Die Auswertung konnte nicht geladen werden.</p>
        <Button variant="outline" size="sm" onClick={load} className="mt-4 rounded-xl border-[#4B5563] text-[#9CA3AF]">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const { assessment, reports, stillWriting } = data
  const partLabel = examPartLabel(findExamPart(examParts, assessment.part), assessment.part)

  return (
    <div>
      <PrintToolbar backHref={`/admin/leistungsnachweise/${id}`} printDisabled={reports.length === 0}>
        <div className="flex items-center gap-2">
          <Switch id="explanations" checked={showExplanations} onCheckedChange={setShowExplanations} />
          <Label htmlFor="explanations" className="text-sm text-[#F9FAFB]">Erklärungen mitdrucken</Label>
        </div>
        {sessionId ? (
          <Link href={`/admin/leistungsnachweise/${id}/druck/einzeln`} className="text-sm text-[#1CB0F6] hover:underline">
            Alle Einzelauswertungen
          </Link>
        ) : (
          <span className="text-sm text-[#9CA3AF]">{reports.length} Einzelauswertungen, je Schüler eine Seite</span>
        )}
        {!sessionId && stillWriting > 0 && (
          <span className="text-sm text-[#FF9600]">{stillWriting} schreiben noch und fehlen hier</span>
        )}
      </PrintToolbar>

      {reports.length === 0 ? (
        <p className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563] text-[#9CA3AF]">
          Noch keine Abgaben.
        </p>
      ) : (
        reports.map((report, i) => (
          <StudentReportSheet
            key={report.sessionId}
            title={assessment.title}
            partLabel={partLabel}
            date={formatDate(assessment.opensAt)}
            scale={assessment.gradingScale}
            report={report}
            showExplanations={showExplanations}
            last={i === reports.length - 1}
          />
        ))
      )}
    </div>
  )
}

export default function SingleOrAllPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#9CA3AF]" />
        </div>
      }
    >
      <SingleOrAllPrint id={id} />
    </Suspense>
  )
}
