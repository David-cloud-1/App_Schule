'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Edit,
  FileUp,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

type QuestionsResponse = {
  questions: AdminQuestion[]
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

export default function AdminQuestionsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 300)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | 'leicht' | 'mittel' | 'schwer'
  >('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<QuestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, subjectFilter, statusFilter, difficultyFilter])

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) return
      const json = await res.json()
      const list: AdminSubject[] = (json.subjects ?? []).map(
        (s: { id: string; code: string; name: string }) => ({
          id: s.id,
          code: s.code,
          name: s.name,
        })
      )
      setSubjects(list)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
      if (subjectFilter !== 'all') params.set('subject', subjectFilter)
      params.set('status', statusFilter)
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/questions?${params.toString()}`)
      if (!res.ok) {
        toast.error('Fragen konnten nicht geladen werden.')
        return
      }
      const json = (await res.json()) as QuestionsResponse
      setData(json)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, subjectFilter, statusFilter, difficultyFilter, page])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  async function toggleActive(q: AdminQuestion, next: boolean) {
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/questions/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error('Löschen fehlgeschlagen')
        return
      }
      toast.success('Frage gelöscht')
      setDeleteTarget(null)
      fetchQuestions()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setDeleting(false)
    }
  }

  const rows = data?.questions ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Fragen</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {total} {total === 1 ? 'Frage' : 'Fragen'} insgesamt
          </p>
        </div>
        <div className="flex gap-2">
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
            className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Frage
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nach Fragetext suchen…"
            className="pl-9 bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              <SelectValue placeholder="Fach" />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
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
            <SelectTrigger className="w-[140px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={difficultyFilter}
            onValueChange={(v) => setDifficultyFilter(v as typeof difficultyFilter)}
          >
            <SelectTrigger className="w-[160px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              <SelectValue placeholder="Schwierigkeit" />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              <SelectItem value="all">Alle Schwierigkeiten</SelectItem>
              <SelectItem value="leicht">Leicht</SelectItem>
              <SelectItem value="mittel">Mittel</SelectItem>
              <SelectItem value="schwer">Schwer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Fragetext</TableHead>
              <TableHead className="text-[#9CA3AF]">Fach</TableHead>
              <TableHead className="text-[#9CA3AF]">Schwierigkeit</TableHead>
              <TableHead className="text-[#9CA3AF]">Status</TableHead>
              <TableHead className="text-[#9CA3AF]">Erstellt</TableHead>
              <TableHead className="text-right text-[#9CA3AF]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.length === 0
              ? (
                <TableRow className="border-[#4B5563]">
                  <TableCell colSpan={6} className="text-center text-[#9CA3AF] py-10">
                    Keine Fragen gefunden.
                  </TableCell>
                </TableRow>
              )
              : rows.map((q) => {
                  const truncated =
                    q.question_text.length > 60
                      ? q.question_text.slice(0, 60) + '…'
                      : q.question_text
                  const codes = q.question_subjects
                    .map((qs) => qs.subjects?.code)
                    .filter(Boolean) as string[]
                  const created = q.id
                  return (
                    <TableRow key={q.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                      <TableCell className="text-[#F9FAFB] max-w-[360px]">
                        {truncated}
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-1">
                        {codes.map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="border-[#4B5563] text-[#9CA3AF]"
                          >
                            {c}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-xs text-[#9CA3AF]">
                        {formatCreatedAt(created, q)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                            className="text-[#FF4B4B] hover:text-[#FF4B4B]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </div>

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

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
              Diese Aktion kann nicht rückgängig gemacht werden. Die Frage und alle ihre
              Antworten werden unwiderruflich entfernt.
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
              className="bg-[#FF4B4B] hover:bg-[#ee3b3b] text-white"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatCreatedAt(_id: string, q: AdminQuestion & { created_at?: string }): string {
  const created = (q as AdminQuestion & { created_at?: string }).created_at
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
