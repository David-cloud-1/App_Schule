'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Edit,
  FileUp,
  History,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { ContentHistorySheet } from '@/components/admin/content-history-sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { DifficultyBadge } from '@/components/difficulty-badge'
import {
  QuestionFormModal,
  type AdminQuestion,
  type AdminSubject,
} from '@/components/admin/question-form-modal'
import { CsvImportDialog } from '@/components/admin/csv-import-dialog'
import { useClassLevelOptions } from '@/components/department-provider'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState } from '@/components/admin/admin-states'

type SortColumn = 'created_at' | 'difficulty' | 'question_text'
type SortDir = 'asc' | 'desc'

type TopicWithSubject = {
  id: string
  name: string
  subject_id: string
  class_levels?: number[]
  subjects?: { id: string; code: string; name: string } | null
}

type QuestionWithTopic = AdminQuestion & {
  topics?: { id: string; name: string } | null
  created_at?: string
  last_changed_by?: string | null
  last_changed_at?: string | null
}

type QuestionsResponse = {
  questions: QuestionWithTopic[]
  total: number
  page: number
  totalPages: number
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SortIcon({ col, current, dir }: { col: SortColumn; current: SortColumn; dir: SortDir }) {
  if (col !== current) return <ChevronsUpDown className="w-3 h-3 opacity-40 inline ml-1" />
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 inline ml-1 text-ws-green" />
    : <ChevronDown className="w-3 h-3 inline ml-1 text-ws-green" />
}

export default function AdminQuestionsPage() {
  const classLevelOptions = useClassLevelOptions()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 300)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'leicht' | 'mittel' | 'schwer'>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all') // 'all', 'none', or topic UUID
  const [classLevelFilter, setClassLevelFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState<SortColumn>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<QuestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithTopic | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QuestionWithTopic | null>(null)
  const [historyTarget, setHistoryTarget] = useState<QuestionWithTopic | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Inline preview
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allTopics, setAllTopics] = useState<TopicWithSubject[]>([])
  // Themenliste im Filter: folgt Fach- und Klassen-Auswahl
  const filterTopics = allTopics.filter((t) => {
    if (subjectFilter !== 'all' && t.subjects?.code !== subjectFilter) return false
    if (classLevelFilter !== 'all' && !(t.class_levels ?? []).includes(Number(classLevelFilter))) return false
    return true
  })
  useEffect(() => {
    if (topicFilter === 'all' || topicFilter === 'none' || allTopics.length === 0) return
    if (!filterTopics.some((t) => t.id === topicFilter)) setTopicFilter('all')
  }, [filterTopics, topicFilter, allTopics.length])
  const [bulkTopicId, setBulkTopicId] = useState<string>('')
  const [bulkClassLevel, setBulkClassLevel] = useState<string>('')
  const [bulkSubjectId, setBulkSubjectId] = useState<string>('')
  const [bulkDifficulty, setBulkDifficulty] = useState<string>('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<boolean | null>(null)

  // Stats per question (loaded lazily on expand)
  type QuestionStats = { total: number; correct: number; correctRate: number | null }
  const [statsMap, setStatsMap] = useState<Record<string, QuestionStats>>({})
  const [loadingStatsId, setLoadingStatsId] = useState<string | null>(null)

  // Reset page when filters or sort changes
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
    setExpandedId(null)
  }, [debouncedSearch, subjectFilter, statusFilter, difficultyFilter, topicFilter, classLevelFilter, sortCol, sortDir])

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set())
    setExpandedId(null)
  }, [page])

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) {
        toast.error('Fächer konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setSubjects(
        (json.subjects ?? []).map((s: { id: string; code: string; name: string }) => ({
          id: s.id,
          code: s.code,
          name: s.name,
        }))
      )
    } catch (err) {
      console.error(err)
      toast.error('Fächer konnten nicht geladen werden.')
    }
  }, [])

  const fetchAllTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) {
        toast.error('Themen konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setAllTopics(json.topics ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Themen konnten nicht geladen werden.')
    }
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
      if (subjectFilter !== 'all') params.set('subject', subjectFilter)
      params.set('status', statusFilter)
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)
      if (classLevelFilter !== 'all') params.set('class_level', classLevelFilter)
      if (topicFilter === 'none') params.set('missing_topic', 'true')
      else if (topicFilter !== 'all') params.set('topic_id', topicFilter)
      params.set('sort', sortCol)
      params.set('sort_dir', sortDir)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/questions?${params.toString()}`)
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      setData((await res.json()) as QuestionsResponse)
    } catch (err) {
      console.error(err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, subjectFilter, statusFilter, difficultyFilter, topicFilter, classLevelFilter, sortCol, sortDir, page])

  useEffect(() => {
    fetchSubjects()
    fetchAllTopics()
  }, [fetchSubjects, fetchAllTopics])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  async function toggleActive(q: QuestionWithTopic, next: boolean) {
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) {
        toast.error('Status konnte nicht geändert werden.')
        return
      }
      toast.success(next ? 'Frage aktiviert' : 'Frage deaktiviert')
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    }
  }

  async function releaseForPractice(q: QuestionWithTopic) {
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_only: false }),
      })
      if (!res.ok) {
        toast.error('Freigabe fehlgeschlagen.')
        return
      }
      toast.success('Frage für den Übungsbetrieb freigegeben')
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Löschen fehlgeschlagen')
        return
      }
      const json = await res.json()
      if (json.softDeleted) {
        toast.info('Frage deaktiviert (hat Lernhistorie und wurde nicht endgültig gelöscht)')
      } else {
        toast.success('Frage gelöscht')
      }
      setDeleteTarget(null)
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkApply() {
    if (selectedIds.size === 0) return

    const payload: Record<string, unknown> = { ids: Array.from(selectedIds) }
    let hasField = false

    if (bulkTopicId) {
      payload.topic_id = bulkTopicId === '_none' ? null : bulkTopicId
      hasField = true
    }
    if (bulkClassLevel) {
      payload.class_level = bulkClassLevel === '_all' ? null : Number(bulkClassLevel)
      hasField = true
    }
    if (bulkSubjectId) {
      payload.subject_id = bulkSubjectId
      hasField = true
    }
    if (bulkDifficulty) {
      payload.difficulty = bulkDifficulty
      hasField = true
    }

    if (!hasField) {
      toast.error('Bitte mindestens ein Feld auswählen.')
      return
    }

    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast.error('Zuweisung fehlgeschlagen.')
        return
      }
      const json = await res.json()
      toast.success(`${json.updated} Fragen aktualisiert`)
      setSelectedIds(new Set())
      setBulkTopicId('')
      setBulkClassLevel('')
      setBulkSubjectId('')
      setBulkDifficulty('')
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setBulkSubmitting(false)
    }
  }

  async function handleBulkStatus(active: boolean) {
    if (selectedIds.size === 0) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), is_active: active }),
      })
      if (!res.ok) {
        toast.error('Status-Änderung fehlgeschlagen.')
        return
      }
      const json = await res.json()
      toast.success(`${json.updated} Fragen ${active ? 'aktiviert' : 'deaktiviert'}`)
      setSelectedIds(new Set())
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setBulkSubmitting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        toast.error('Löschen fehlgeschlagen.')
        return
      }
      const json = await res.json()
      const parts: string[] = []
      if (json.deleted > 0) parts.push(`${json.deleted} gelöscht`)
      if (json.softDeleted > 0) parts.push(`${json.softDeleted} deaktiviert (Lernhistorie)`)
      toast.success(parts.join(', '))
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
      if (subjectFilter !== 'all') params.set('subject', subjectFilter)
      params.set('status', statusFilter)
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)
      if (classLevelFilter !== 'all') params.set('class_level', classLevelFilter)
      if (topicFilter === 'none') params.set('missing_topic', 'true')
      else if (topicFilter !== 'all') params.set('topic_id', topicFilter)

      const res = await fetch(`/api/admin/questions/export?${params.toString()}`)
      if (!res.ok) {
        toast.error('Export fehlgeschlagen.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fragen-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportiert')
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setExporting(false)
    }
  }

  async function fetchStats(questionId: string) {
    if (statsMap[questionId]) return
    setLoadingStatsId(questionId)
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/stats`)
      if (res.ok) {
        const data = await res.json()
        setStatsMap((prev) => ({ ...prev, [questionId]: data }))
      }
    } finally {
      setLoadingStatsId(null)
    }
  }

  const rows = data?.questions ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0

  const allOnPageSelected = rows.length > 0 && rows.every((q) => selectedIds.has(q.id))
  const someOnPageSelected = rows.some((q) => selectedIds.has(q.id))

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        rows.forEach((q) => next.delete(q.id))
      } else {
        rows.forEach((q) => next.add(q.id))
      }
      return next
    })
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return []
    const result: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) result.push(i)
    return result
  }, [totalPages, page])

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Fragen"
        description={`${total} ${total === 1 ? 'Frage' : 'Fragen'} insgesamt`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              CSV Export
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="rounded-xl"
            >
              <FileUp className="w-4 h-4 mr-2" />
              CSV Import
            </Button>
            <Button
              onClick={() => {
                setEditingQuestion(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Frage
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ws-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nach Fragetext suchen…"
            className="pl-9 bg-ws-surface border-ws-line text-ws-text"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[150px] bg-ws-surface border-ws-line text-ws-text">
              <SelectValue placeholder="Fach" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Fächer</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.code}>
                  {s.code} – {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[130px] bg-ws-surface border-ws-line text-ws-text">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={difficultyFilter}
            onValueChange={(v) => setDifficultyFilter(v as typeof difficultyFilter)}
          >
            <SelectTrigger className="w-[150px] bg-ws-surface border-ws-line text-ws-text">
              <SelectValue placeholder="Schwierigkeit" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Schwierigkeiten</SelectItem>
              <SelectItem value="leicht">Leicht</SelectItem>
              <SelectItem value="mittel">Mittel</SelectItem>
              <SelectItem value="schwer">Schwer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classLevelFilter} onValueChange={setClassLevelFilter}>
            <SelectTrigger className="w-[140px] bg-ws-surface border-ws-line text-ws-text">
              <SelectValue placeholder="Klasse" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Klassen</SelectItem>
              {classLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[180px] bg-ws-surface border-ws-line text-ws-text">
              <SelectValue placeholder="Thema" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Themen</SelectItem>
              <SelectItem value="none">Ohne Thema</SelectItem>
              {filterTopics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.subjects?.code ? `${t.subjects.code} – ` : ''}{t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3 bg-ws-raised border border-ws-line rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ws-text">
              {selectedIds.size} {selectedIds.size === 1 ? 'Frage' : 'Fragen'} ausgewählt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-ws-muted"
            >
              <X className="w-4 h-4 mr-1" />
              Aufheben
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
              <SelectTrigger className="w-[150px] bg-ws-surface border-ws-line text-ws-text">
                <SelectValue placeholder="Fach…" />
              </SelectTrigger>
              <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} – {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bulkClassLevel} onValueChange={setBulkClassLevel}>
              <SelectTrigger className="w-[150px] bg-ws-surface border-ws-line text-ws-text">
                <SelectValue placeholder="Jahrgangsstufe…" />
              </SelectTrigger>
              <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                <SelectItem value="_all">Alle Klassen</SelectItem>
                {classLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bulkDifficulty} onValueChange={setBulkDifficulty}>
              <SelectTrigger className="w-[150px] bg-ws-surface border-ws-line text-ws-text">
                <SelectValue placeholder="Schwierigkeit…" />
              </SelectTrigger>
              <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                <SelectItem value="leicht">Leicht</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="schwer">Schwer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkTopicId} onValueChange={setBulkTopicId}>
              <SelectTrigger className="w-[200px] bg-ws-surface border-ws-line text-ws-text">
                <SelectValue placeholder="Thema…" />
              </SelectTrigger>
              <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                <SelectItem value="_none">Kein Thema (entfernen)</SelectItem>
                {allTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.subjects?.code ? `${t.subjects.code} – ` : ''}
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkApply}
              disabled={bulkSubmitting || (!bulkTopicId && !bulkClassLevel && !bulkSubjectId && !bulkDifficulty)}
              size="sm"
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              {bulkSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Anwenden
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-ws-line pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkSubmitting}
              onClick={() => setBulkStatusConfirm(true)}
              className="rounded-xl border-ws-line text-ws-text hover:bg-ws-surface"
            >
              Alle aktivieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkSubmitting}
              onClick={() => setBulkStatusConfirm(false)}
              className="rounded-xl border-ws-line text-ws-muted hover:bg-ws-surface"
            >
              Alle deaktivieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkSubmitting || bulkDeleting}
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-xl border-ws-red/40 text-ws-red hover:bg-ws-red/10 ml-auto"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {selectedIds.size} löschen
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loadFailed ? (
        <AdminErrorState message="Die Fragen konnten gerade nicht geladen werden." onRetry={fetchQuestions} />
      ) : (
        <div className="ws-table-scroll border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allOnPageSelected}
                    data-state={someOnPageSelected && !allOnPageSelected ? 'indeterminate' : undefined}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Alle auswählen"
                    className="border-ws-line"
                  />
                </TableHead>
                <TableHead className="text-ws-muted">
                  <button
                    onClick={() => handleSort('question_text')}
                    className="flex items-center hover:text-ws-text transition-colors"
                  >
                    Fragetext
                    <SortIcon col="question_text" current={sortCol} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-ws-muted hidden lg:table-cell">Thema</TableHead>
                <TableHead className="text-ws-muted">Fach</TableHead>
                <TableHead className="text-ws-muted hidden md:table-cell">Klasse</TableHead>
                <TableHead className="text-ws-muted hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('difficulty')}
                    className="flex items-center hover:text-ws-text transition-colors"
                  >
                    Schwierigkeit
                    <SortIcon col="difficulty" current={sortCol} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-ws-muted">Status</TableHead>
                <TableHead className="text-ws-muted hidden md:table-cell">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center hover:text-ws-text transition-colors"
                  >
                    Erstellt
                    <SortIcon col="created_at" current={sortCol} dir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-right text-ws-muted">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-ws-line">
                      <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                : rows.length === 0
                ? (
                  <TableRow className="border-ws-line">
                    <TableCell colSpan={9} className="text-center text-ws-muted py-10">
                      Keine Fragen gefunden.
                    </TableCell>
                  </TableRow>
                )
                : rows.map((q) => {
                    const codes = q.question_subjects
                      .map((qs) => qs.subjects?.code)
                      .filter(Boolean) as string[]
                    const isSelected = selectedIds.has(q.id)
                    const isExpanded = expandedId === q.id
                    const hasNoTopic = !q.topics

                    return (
                      <Fragment key={q.id}>
                        <TableRow
                          className={`border-ws-line hover:bg-ws-bg/40 transition-colors ${
                            isSelected ? 'bg-ws-surface/80 border-l-2 border-l-ws-green' : ''
                          } ${isExpanded ? 'bg-ws-bg/30' : ''}`}
                        >
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectOne(q.id)}
                              aria-label="Frage auswählen"
                              className="border-ws-line"
                            />
                          </TableCell>
                          <TableCell
                            className="text-ws-text max-w-[280px] cursor-pointer select-none"
                            onClick={() => {
                              const nextId = isExpanded ? null : q.id
                              setExpandedId(nextId)
                              if (nextId) fetchStats(nextId)
                            }}
                            title="Klicken für Vorschau"
                          >
                            <span className="hover:text-ws-green transition-colors line-clamp-3">
                              {q.question_text}
                            </span>
                            {q.assessment_only && (
                              <Badge variant="outline" className="mt-1 border-ws-orange text-ws-orange">
                                Nur für Nachweise
                              </Badge>
                            )}
                            {q.is_private && (
                              <Badge
                                variant="outline"
                                className="mt-1 ml-1.5 border-ws-gold text-ws-gold"
                                title="Private Nachweis-Frage einer Lehrkraft — kann nie für den Übungsbetrieb freigegeben werden"
                              >
                                Privat
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {hasNoTopic ? (
                              <span className="flex items-center gap-1 text-xs text-ws-orange italic">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Kein Thema
                              </span>
                            ) : (
                              <span className="text-sm text-ws-muted">{q.topics!.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="flex flex-wrap gap-1">
                            {codes.map((c) => (
                              <Badge
                                key={c}
                                variant="outline"
                                className="border-ws-line text-ws-muted"
                              >
                                {c}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-ws-muted">
                            {q.class_level != null ? (
                              <span>Kl. {q.class_level}</span>
                            ) : (
                              <span className="text-ws-line">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <DifficultyBadge
                              difficulty={q.difficulty as 'leicht' | 'mittel' | 'schwer'}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={q.is_active}
                              onCheckedChange={(v) => toggleActive(q, v)}
                              aria-label="Aktiv/Inaktiv"
                            />
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-ws-muted">
                            {formatCreatedAt(q)}
                            {q.last_changed_by && (
                              <div className="text-ws-faint">
                                Zuletzt: {q.last_changed_by}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHistoryTarget(q)}
                                title="Verlauf"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              {q.assessment_only && !q.is_private && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => releaseForPractice(q)}
                                  className="min-h-11 border-ws-green text-ws-green"
                                  title="Frage auch im Quiz und in den Übungsmodi anzeigen"
                                >
                                  Für Übung freigeben
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingQuestion(q)
                                  setFormOpen(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(q)}
                                className="text-ws-red hover:text-ws-red"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="border-ws-line bg-ws-bg/60">
                            <TableCell colSpan={9} className="p-4">
                              {/* Vollständiger Fragetext */}
                              <p className="mb-3 max-w-2xl text-base font-medium text-ws-text whitespace-pre-line">
                                {q.question_text}
                              </p>
                              {/* Lernstatistiken */}
                              <div className="mb-3 flex items-center gap-3 text-xs text-ws-muted">
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                {loadingStatsId === q.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : statsMap[q.id] ? (
                                  <>
                                    <span>{statsMap[q.id].total} {statsMap[q.id].total === 1 ? 'Antwort' : 'Antworten'}</span>
                                    {statsMap[q.id].correctRate !== null && (
                                      <>
                                        <span className="text-ws-line">·</span>
                                        <span className={
                                          statsMap[q.id].correctRate! >= 70
                                            ? 'text-ws-green'
                                            : statsMap[q.id].correctRate! >= 40
                                            ? 'text-ws-orange'
                                            : 'text-ws-red'
                                        }>
                                          {statsMap[q.id].correctRate}% richtig
                                        </span>
                                      </>
                                    )}
                                    {statsMap[q.id].total === 0 && (
                                      <span className="italic">Noch nicht beantwortet</span>
                                    )}
                                  </>
                                ) : null}
                              </div>

                            {q.answer_options.length > 0 ? (
                                <div className="space-y-2 max-w-2xl">
                                  {q.answer_options.map((a, idx) => (
                                    <div
                                      key={a.id ?? idx}
                                      className={`flex items-start gap-3 p-2 rounded-lg ${
                                        a.is_correct
                                          ? 'bg-ws-green/10 border border-ws-green/30'
                                          : 'bg-ws-surface'
                                      }`}
                                    >
                                      <span className="text-xs font-bold text-ws-muted w-4 shrink-0 mt-0.5">
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span
                                        className={`text-sm flex-1 ${
                                          a.is_correct ? 'text-ws-green' : 'text-ws-text'
                                        }`}
                                      >
                                        {a.option_text}
                                      </span>
                                      {a.is_correct && (
                                        <Badge className="bg-ws-green/20 text-ws-green text-xs border-0 shrink-0">
                                          Richtig
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                  {q.explanation && (
                                    <div className="mt-3 p-3 bg-ws-raised rounded-lg">
                                      <p className="text-xs text-ws-muted font-medium mb-1">Erklärung</p>
                                      <p className="text-sm text-ws-text">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-ws-muted italic">Keine Antwortoptionen.</p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {pageNumbers.map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  href="#"
                  isActive={n === page}
                  onClick={(e) => {
                    e.preventDefault()
                    setPage(n)
                  }}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) setPage(page + 1)
                }}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <QuestionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        question={editingQuestion}
        subjects={subjects}
        onSuccess={fetchQuestions}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        subjects={subjects}
        onSuccess={fetchQuestions}
      />

      {/* Single delete dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Die Frage wandert in den Papierkorb und lässt sich von dort wiederherstellen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk status confirmation dialog */}
      <AlertDialog
        open={bulkStatusConfirm !== null}
        onOpenChange={(v) => { if (!v) setBulkStatusConfirm(null) }}
      >
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIds.size} {selectedIds.size === 1 ? 'Frage' : 'Fragen'}{' '}
              {bulkStatusConfirm ? 'aktivieren' : 'deaktivieren'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Der Status aller ausgewählten Fragen wird geändert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (bulkStatusConfirm !== null) {
                  handleBulkStatus(bulkStatusConfirm)
                  setBulkStatusConfirm(null)
                }
              }}
              disabled={bulkSubmitting}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
            >
              {bulkSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bulkStatusConfirm ? 'Aktivieren' : 'Deaktivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIds.size} {selectedIds.size === 1 ? 'Frage' : 'Fragen'} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Alle ausgewählten Fragen wandern in den Papierkorb und lassen sich von dort
              wiederherstellen — einzeln oder als ganzer Vorgang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleBulkDelete()
              }}
              disabled={bulkDeleting}
              className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent"
            >
              {bulkDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedIds.size} {selectedIds.size === 1 ? 'Frage' : 'Fragen'} löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {historyTarget && (
        <ContentHistorySheet
          open={historyTarget !== null}
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          contentType="question"
          contentId={historyTarget.id}
          title={historyTarget.question_text}
          onRestored={fetchQuestions}
        />
      )}
    </div>
  )
}

function formatCreatedAt(q: QuestionWithTopic): string {
  const created = q.created_at
  if (!created) return '—'
  try {
    return new Date(created).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
