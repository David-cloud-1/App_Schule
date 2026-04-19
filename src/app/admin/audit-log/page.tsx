'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

type AuditEntry = {
  id: string
  created_at: string
  admin_id: string
  admin_name: string | null
  action_type: string
  object_type: string
  object_id: string | null
  object_label: string | null
  details: Record<string, unknown> | null
}

type AuditResponse = {
  entries: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

const ACTION_TYPES = [
  { value: 'all', label: 'Alle Aktionen' },
  { value: 'question.create', label: 'Frage erstellt' },
  { value: 'question.update', label: 'Frage aktualisiert' },
  { value: 'question.delete', label: 'Frage gelöscht' },
  { value: 'question.activate', label: 'Frage aktiviert' },
  { value: 'question.deactivate', label: 'Frage deaktiviert' },
  { value: 'question.bulk_import', label: 'CSV-Import' },
  { value: 'subject.create', label: 'Fach erstellt' },
  { value: 'subject.update', label: 'Fach aktualisiert' },
  { value: 'subject.activate', label: 'Fach aktiviert' },
  { value: 'subject.deactivate', label: 'Fach deaktiviert' },
  { value: 'user.ban', label: 'Nutzer gesperrt' },
  { value: 'user.unban', label: 'Nutzer entsperrt' },
]

export default function AdminAuditLogPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const [actionType, setActionType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [period, actionType])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      if (actionType !== 'all') params.set('action_type', actionType)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`)
      if (!res.ok) {
        toast.error('Audit-Log konnte nicht geladen werden.')
        return
      }
      const json = (await res.json()) as AuditResponse
      setData(json)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [period, actionType, page])

  useEffect(() => {
    load()
  }, [load])

  const entries = data?.entries ?? []
  const totalPages = data?.totalPages ?? 0
  const total = data?.total ?? 0

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
      <div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Audit-Log</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {total} {total === 1 ? 'Eintrag' : 'Einträge'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[180px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
            <SelectItem value="7d">Letzte 7 Tage</SelectItem>
            <SelectItem value="30d">Letzte 30 Tage</SelectItem>
            <SelectItem value="all">Alle Zeiträume</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-[220px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Zeitstempel</TableHead>
              <TableHead className="text-[#9CA3AF]">Admin</TableHead>
              <TableHead className="text-[#9CA3AF]">Aktion</TableHead>
              <TableHead className="text-[#9CA3AF]">Objekt-Typ</TableHead>
              <TableHead className="text-[#9CA3AF]">Objekt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow className="border-[#4B5563]">
                <TableCell colSpan={5} className="py-10">
                  <div className="flex flex-col items-center gap-2 text-[#9CA3AF] text-sm">
                    <Info className="w-5 h-5" />
                    Audit-Log wird nach erster Admin-Aktion befüllt.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                  <TableCell className="text-xs text-[#9CA3AF]">
                    {formatDateTime(e.created_at)}
                  </TableCell>
                  <TableCell className="text-[#F9FAFB] text-sm">
                    {e.admin_name ?? e.admin_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-[#4B5563] text-[#58CC02] font-mono text-xs"
                    >
                      {e.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#9CA3AF] text-sm">{e.object_type}</TableCell>
                  <TableCell className="text-[#F9FAFB] text-sm max-w-[280px] truncate">
                    {e.object_label ?? e.object_id ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
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
    </div>
  )
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}
