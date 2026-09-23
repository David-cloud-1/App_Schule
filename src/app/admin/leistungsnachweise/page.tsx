'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { GraduationCap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateAssessmentModal } from '@/components/admin/create-assessment-modal'
import { cn } from '@/lib/utils'

type AssessmentListItem = {
  id: string
  title: string
  examSetName: string
  part: number
  status: 'draft' | 'open' | 'closed'
  accessCode: string
  participantCount: number
  submittedCount: number
  createdAt: string
}

type ExamSetOption = {
  id: string
  name: string
  part: number
  question_ids: string[]
  duration_minutes: number | null
}

const STATUS_LABELS: Record<AssessmentListItem['status'], string> = {
  draft: 'Entwurf',
  open: 'Offen',
  closed: 'Geschlossen',
}

const STATUS_STYLES: Record<AssessmentListItem['status'], string> = {
  draft: 'bg-[#4B5563]/40 text-[#9CA3AF]',
  open: 'bg-[#58CC02]/20 text-[#58CC02]',
  closed: 'bg-[#FF9600]/20 text-[#FF9600]',
}

function AssessmentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [sets, setSets] = useState<ExamSetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [preselectedSetId, setPreselectedSetId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const [assessmentsRes, setsRes] = await Promise.all([
        fetch('/api/admin/assessments'),
        fetch('/api/admin/exam-sets'),
      ])
      if (!assessmentsRes.ok || !setsRes.ok) {
        setFailed(true)
        return
      }
      const assessmentsJson = await assessmentsRes.json()
      const setsJson = await setsRes.json()
      setAssessments(assessmentsJson.assessments ?? [])
      setSets(setsJson.sets ?? [])
    } catch (err) {
      console.error('[AdminAssessments] load failed:', err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const fromSet = searchParams.get('createFromSet')
    if (fromSet) {
      setPreselectedSetId(fromSet)
      setCreateOpen(true)
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Leistungsnachweise</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Benotete Durchläufe zu bestehenden Prüfungssets — Zugang per Code, keine Klassenzuordnung.
          </p>
        </div>
        <Button
          onClick={() => {
            setPreselectedSetId(null)
            setCreateOpen(true)
          }}
          disabled={sets.length === 0}
          className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neu erstellen
        </Button>
      </div>

      {failed ? (
        <div className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563]">
          <p className="text-[#9CA3AF]">Leistungsnachweise konnten nicht geladen werden.</p>
          <Button variant="outline" size="sm" onClick={load} className="mt-4 rounded-xl border-[#4B5563] text-[#9CA3AF]">
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
                <TableHead className="text-[#9CA3AF]">Titel</TableHead>
                <TableHead className="text-[#9CA3AF]">Set</TableHead>
                <TableHead className="text-[#9CA3AF]">Status</TableHead>
                <TableHead className="text-[#9CA3AF]">Code</TableHead>
                <TableHead className="text-[#9CA3AF]">Teilnehmer</TableHead>
                <TableHead className="text-[#9CA3AF]">Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : assessments.length === 0 ? (
                <TableRow className="border-[#4B5563]">
                  <TableCell colSpan={6} className="text-center text-[#9CA3AF] py-10">
                    <GraduationCap size={32} className="mx-auto mb-2 text-[#374151]" />
                    Noch keine Leistungsnachweise angelegt.
                    {sets.length === 0 && (
                      <p className="text-xs text-[#6B7280] mt-2">
                        Lege zuerst unter „Prüfungssets" ein Set mit mindestens 5 Multiple-Choice-Fragen an.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((a) => (
                  <TableRow key={a.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                    <TableCell className="text-[#F9FAFB] font-medium">
                      <Link href={`/admin/leistungsnachweise/${a.id}`} className="hover:underline">
                        {a.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[#9CA3AF] text-sm">{a.examSetName}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border-0', STATUS_STYLES[a.status])}>
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#F9FAFB] font-mono text-sm">{a.accessCode}</TableCell>
                    <TableCell className="text-[#F9FAFB] text-sm">
                      {a.submittedCount}/{a.participantCount}
                    </TableCell>
                    <TableCell className="text-[#9CA3AF] text-sm">
                      {new Date(a.createdAt).toLocaleDateString('de-DE')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateAssessmentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        sets={sets}
        preselectedSetId={preselectedSetId}
        onSuccess={(id) => router.push(`/admin/leistungsnachweise/${id}`)}
      />
    </div>
  )
}

export default function AdminAssessmentsPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentsPageContent />
    </Suspense>
  )
}
