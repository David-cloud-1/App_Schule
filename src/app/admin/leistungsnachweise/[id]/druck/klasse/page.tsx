'use client'

import { use, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExamParts } from '@/components/department-provider'
import { examPartLabel, findExamPart } from '@/lib/exam-parts'
import type { GradeBoundary } from '@/lib/graded-assessments'
import {
  ClassReportSheet,
  PrintToolbar,
  formatDate,
  type ClassParticipant,
  type ClassQuestionStat,
} from '@/components/admin/assessment-print'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'

type Detail = { title: string; part: number; opensAt: string; gradingScale: GradeBoundary[] }
type Results = {
  participants: ClassParticipant[]
  gradeDistribution: { counts: Record<string, number>; average: number | null; passRate: number | null }
  questions: ClassQuestionStat[]
}

export default function ClassPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const examParts = useExamParts()
  const [data, setData] = useState<{ detail: Detail; results: Results } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  async function load() {
    setState('loading')
    try {
      const [d, r] = await Promise.all([fetch(`/api/admin/assessments/${id}`), fetch(`/api/admin/assessments/${id}/results`)])
      if (!d.ok || !r.ok) throw new Error('load failed')
      setData({ detail: (await d.json()) as Detail, results: (await r.json()) as Results })
      setState('ready')
    } catch {
      setState('failed')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const back = `/admin/leistungsnachweise/${id}`

  if (state === 'loading') {
    return <AdminLoadingState variant="cards" rows={2} label="Auswertung wird geladen …" />
  }

  if (state === 'failed' || !data) {
    return <AdminErrorState message="Die Klassenauswertung konnte gerade nicht geladen werden." onRetry={load} />
  }


  const { detail, results } = data
  const hasSubmissions = results.participants.some((p) => p.status === 'completed')

  return (
    <div>
      <PrintToolbar backHref={back} printDisabled={!hasSubmissions} />
      {hasSubmissions ? (
        <ClassReportSheet
          title={detail.title}
          partLabel={examPartLabel(findExamPart(examParts, detail.part), detail.part)}
          date={formatDate(detail.opensAt)}
          scale={detail.gradingScale}
          participants={results.participants}
          gradeDistribution={results.gradeDistribution}
          questions={results.questions}
        />
      ) : (
        <p className="text-center py-16 bg-ws-surface rounded-2xl border border-ws-line text-ws-muted">
          Noch keine Abgaben.
        </p>
      )}
    </div>
  )
}
