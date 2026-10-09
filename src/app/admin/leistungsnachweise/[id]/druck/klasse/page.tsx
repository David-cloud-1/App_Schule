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
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#9CA3AF]" />
      </div>
    )
  }

  if (state === 'failed' || !data) {
    return (
      <div className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563]">
        <p className="text-[#9CA3AF]">Die Klassenauswertung konnte nicht geladen werden.</p>
        <Button variant="outline" size="sm" onClick={load} className="mt-4 rounded-xl border-[#4B5563] text-[#9CA3AF]">
          Erneut versuchen
        </Button>
      </div>
    )
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
        <p className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563] text-[#9CA3AF]">
          Noch keine Abgaben.
        </p>
      )}
    </div>
  )
}
