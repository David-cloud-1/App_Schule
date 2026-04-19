'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SubjectFormModal,
  type AdminSubjectRow,
} from '@/components/admin/subject-form-modal'

type SubjectListItem = {
  id: string
  name: string
  code: string
  color: string
  icon_name: string
  is_active: boolean
  active_question_count: number
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSubjectRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) {
        toast.error('Fächer konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setSubjects(json.subjects ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(s: SubjectListItem, next: boolean) {
    try {
      const res = await fetch(`/api/admin/subjects/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Status konnte nicht geändert werden.')
        return
      }
      toast.success(next ? 'Fach aktiviert' : 'Fach deaktiviert')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Fächer</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {subjects.length} {subjects.length === 1 ? 'Fach' : 'Fächer'}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Fach
        </Button>
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Name</TableHead>
              <TableHead className="text-[#9CA3AF]">Code</TableHead>
              <TableHead className="text-[#9CA3AF]">Aktive Fragen</TableHead>
              <TableHead className="text-[#9CA3AF]">Status</TableHead>
              <TableHead className="text-right text-[#9CA3AF]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-10 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : subjects.length === 0 ? (
              <TableRow className="border-[#4B5563]">
                <TableCell colSpan={5} className="text-center text-[#9CA3AF] py-10">
                  Keine Fächer angelegt.
                </TableCell>
              </TableRow>
            ) : (
              subjects.map((s) => {
                const blockDeactivate = s.is_active && s.active_question_count > 0
                return (
                  <TableRow key={s.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                    <TableCell className="text-[#F9FAFB] font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[#4B5563] text-[#58CC02] font-mono"
                      >
                        {s.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#F9FAFB]">
                      {s.active_question_count}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={s.is_active}
                                disabled={blockDeactivate}
                                onCheckedChange={(v) => toggleActive(s, v)}
                                aria-label="Aktiv/Inaktiv"
                              />
                            </span>
                          </TooltipTrigger>
                          {blockDeactivate && (
                            <TooltipContent className="bg-[#111827] text-[#F9FAFB] border-[#4B5563]">
                              Deaktivieren nicht möglich: Fach hat aktive Fragen.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing({ id: s.id, name: s.name, code: s.code })
                          setFormOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SubjectFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        subject={editing}
        onSuccess={load}
      />
    </div>
  )
}
