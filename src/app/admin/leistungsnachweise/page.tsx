'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { AssessmentFilterBar } from '@/components/admin/assessment-filter-bar'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { schoolYearFor } from '@/lib/assessment-category'
import { saveListQuery } from '@/lib/assessment-list-memory'
import {
  FILTER_ALL,
  classOptions,
  creatorOptions,
  defaultFilters,
  departmentOptions,
  filterAssessments,
  filtersFromParams,
  filtersToParams,
  schoolYearOptions,
  subjectOptions,
  type AssessmentFilters,
} from '@/lib/assessment-filter'
import { cn } from '@/lib/utils'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states'

type AssessmentListItem = {
  id: string
  title: string
  examSetName: string | null
  part: number
  status: 'draft' | 'open' | 'closed'
  accessCode: string
  participantCount: number
  submittedCount: number
  createdAt: string
  /** PROJ-39: Ablage */
  schoolYear: string
  className: string | null
  subjectId: string | null
  subjectName: string | null
  /** PROJ-46: Zielbereich */
  departmentId: string | null
  departmentName: string | null
  departmentCode: string | null
  /** PROJ-46: nur für den Super-Admin befüllt */
  createdBy?: string | null
  createdByName?: string | null
  createdByFormer?: boolean
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
  draft: 'bg-ws-line/40 text-ws-muted',
  open: 'bg-ws-green/20 text-ws-green',
  closed: 'bg-ws-orange/20 text-ws-orange',
}

function AssessmentsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isSuperAdmin } = useAdminRole()
  const currentSchoolYear = useMemo(() => schoolYearFor(new Date()), [])
  // Filter stehen in der Adresszeile (bleiben beim Wechsel in die Detailansicht erhalten); die Suche bleibt lokal
  const [query, setQuery] = useState('')
  const filters = useMemo<AssessmentFilters>(
    () => ({ ...filtersFromParams(new URLSearchParams(searchParams.toString()), currentSchoolYear), query }),
    [searchParams, currentSchoolYear, query],
  )
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
      if (!assessmentsRes.ok) {
        setFailed(true)
        return
      }
      const assessmentsJson = await assessmentsRes.json()
      // Sets sind nur optionale Startauswahl des eigenen Arbeitsbereichs — eine
      // Lehrkraft ohne Fachbereich bekommt hier 403 (kein eigener Bereich) und
      // das blockiert die Seite nicht
      const setsJson = setsRes.ok ? await setsRes.json() : { sets: [] }
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

  function changeFilters(next: AssessmentFilters) {
    setQuery(next.query)
    const params = filtersToParams(next, currentSchoolYear, new URLSearchParams(searchParams.toString()))
    const qs = params.toString()
    // Die Suche bleibt lokal: ohne geänderte Adress-Parameter keine Navigation (sonst eine Server-Anfrage pro Tastendruck)
    if (qs === searchParams.toString()) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Filterzustand für den Zurück-Pfeil der Detailseite merken
  useEffect(() => {
    saveListQuery(filtersToParams(filters, currentSchoolYear, new URLSearchParams()).toString())
  }, [filters, currentSchoolYear])

  const visible = useMemo(() => filterAssessments(assessments, filters), [assessments, filters])
  const filterOptions = useMemo(
    () => ({
      schoolYears: schoolYearOptions(assessments.map((a) => a.schoolYear), currentSchoolYear),
      classes: classOptions(assessments),
      subjects: subjectOptions(assessments),
      departments: departmentOptions(assessments),
      creators: isSuperAdmin ? creatorOptions(assessments) : [],
      hasUnassignedClass: assessments.some((a) => a.className === null),
      hasUnassignedSubject: assessments.some((a) => a.subjectId === null),
    }),
    [assessments, currentSchoolYear, isSuperAdmin],
  )

  useEffect(() => {
    const fromSet = searchParams.get('createFromSet')
    if (fromSet) {
      setPreselectedSetId(fromSet)
      setCreateOpen(true)
    }
    // „Neuer Leistungsnachweis“ aus der Schnellsuche (PROJ-45): Dialog öffnen, Parameter wieder entfernen
    if (searchParams.get('neu') === '1') {
      setPreselectedSetId(null)
      setCreateOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('neu')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  // Leere Liste: die Hauptaktion steht dann im Leerzustand, nicht doppelt im Seitenkopf
  const showEmpty = !failed && !loading && assessments.length === 0
  const columnCount = 6 + (isSuperAdmin ? 1 : 0)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leistungsnachweise"
        description="Benotete Tests für deine Klasse: Die Azubis treten per Code bei, du siehst Noten und Auswertung. Nicht zu verwechseln mit der Prüfungssimulation, die Azubis ohne Note selbst üben."
        actions={
          showEmpty ? undefined : (
            <Button
              onClick={() => {
                setPreselectedSetId(null)
                setCreateOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neu erstellen
            </Button>
          )
        }
      />

      {!failed && assessments.length > 0 && (
        <AssessmentFilterBar
          filters={filters}
          onChange={changeFilters}
          schoolYears={filterOptions.schoolYears}
          classes={filterOptions.classes}
          subjects={filterOptions.subjects}
          departments={filterOptions.departments}
          creators={filterOptions.creators}
          hasUnassignedClass={filterOptions.hasUnassignedClass}
          hasUnassignedSubject={filterOptions.hasUnassignedSubject}
        />
      )}

      {failed ? (
        <AdminErrorState message="Die Leistungsnachweise konnten gerade nicht geladen werden." onRetry={load} />
      ) : showEmpty ? (
        <AdminEmptyState
          icon={GraduationCap}
          title="Noch keine Leistungsnachweise"
          description="Lege deinen ersten an — die Klasse tritt danach per Code bei."
          action={
            <Button
              onClick={() => {
                setPreselectedSetId(null)
                setCreateOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl min-h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neu erstellen
            </Button>
          }
        />
      ) : (
        <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="text-ws-muted">Titel</TableHead>
                <TableHead className="text-ws-muted">Status</TableHead>
                <TableHead className="text-ws-muted">Zielbereich</TableHead>
                {isSuperAdmin && <TableHead className="text-ws-muted">Erstellt von</TableHead>}
                <TableHead className="text-ws-muted">Code</TableHead>
                <TableHead className="text-ws-muted">Teilnehmer</TableHead>
                <TableHead className="text-ws-muted">Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    {isSuperAdmin && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : visible.length === 0 ? (
                <TableRow className="border-ws-line">
                  <TableCell colSpan={columnCount} className="text-center text-ws-muted py-10">
                    <GraduationCap size={32} className="mx-auto mb-2 text-ws-raised" />
                    <p>
                      {filters.schoolYear !== FILTER_ALL && filters.className === FILTER_ALL && filters.subjectId === FILTER_ALL && filters.status === FILTER_ALL && !filters.query
                        ? `Im Schuljahr ${filters.schoolYear} gibt es noch keine Leistungsnachweise.`
                        : 'Keine Leistungsnachweise passen zu diesen Filtern.'}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {filters.schoolYear !== FILTER_ALL && (
                        <Button
                          variant="outline"
                          onClick={() => changeFilters({ ...filters, schoolYear: FILTER_ALL })}
                          className="h-11 rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
                        >
                          Alle Schuljahre anzeigen
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => changeFilters(defaultFilters(currentSchoolYear))}
                        className="h-11 rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
                      >
                        Filter zurücksetzen
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((a) => (
                  <TableRow key={a.id} className="border-ws-line hover:bg-ws-bg/40">
                    <TableCell className="text-ws-text font-medium">
                      <Link href={`/admin/leistungsnachweise/${a.id}`} className="hover:underline">
                        {a.title}
                      </Link>
                      {(a.className || a.subjectName) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {a.className && (
                            <Badge className="text-xs border-0 bg-ws-blue/15 text-ws-blue">{a.className}</Badge>
                          )}
                          {a.subjectName && (
                            <Badge className="text-xs border-0 bg-ws-raised text-ws-text">{a.subjectName}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border-0', STATUS_STYLES[a.status])}>
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.departmentName && (
                        <Badge className="text-xs border-0 bg-ws-blue/15 text-ws-blue">{a.departmentName}</Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-ws-muted text-sm">
                        {a.createdByName ?? '—'}
                        {a.createdByFormer && <span className="text-ws-faint"> (ehemalig)</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-ws-text font-mono text-sm">{a.accessCode}</TableCell>
                    <TableCell className="text-ws-text text-sm">
                      {a.submittedCount}/{a.participantCount}
                    </TableCell>
                    <TableCell className="text-ws-muted text-sm">
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
        classSuggestions={filterOptions.classes}
        usedSchoolYears={assessments.map((a) => a.schoolYear)}
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
