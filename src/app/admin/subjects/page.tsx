'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, History, Plus, FolderKanban } from 'lucide-react'
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
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ContentHistorySheet } from '@/components/admin/content-history-sheet'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { DepartmentTag, LastChangedLine, showVersionConflict, useEmptyScopeText } from '@/components/admin/content-meta'
import { AdminErrorState, AdminEmptyState } from '@/components/admin/admin-states'

type SubjectListItem = {
  id: string
  name: string
  code: string
  color: string
  icon_name: string
  is_active: boolean
  active_question_count: number
  version_number?: number
  department_name?: string | null
  department_code?: string | null
  last_changed_by?: string | null
  last_changed_at?: string | null
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSubjectRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<SubjectListItem | null>(null)
  const emptyScopeText = useEmptyScopeText('Fächer')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = await res.json()
      setSubjects(json.subjects ?? [])
    } catch (err) {
      console.error(err)
      setLoadFailed(true)
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
        body: JSON.stringify({ is_active: next, expected_version: s.version_number }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (showVersionConflict(res, data, () => setHistoryTarget(s))) {
          load()
          return
        }
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

  // Leere Liste: die Hauptaktion steht dann im Leerzustand, nicht doppelt im Seitenkopf
  const showEmpty = !loadFailed && !loading && subjects.length === 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Fächer"
        description={
          loading && subjects.length === 0 ? 'Wird geladen …' : <>{subjects.length} {subjects.length === 1 ? 'Fach' : 'Fächer'}</>
        }
        actions={
          showEmpty ? undefined : (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Fach
            </Button>
          )
        }
      />

      {loadFailed ? (
        <AdminErrorState message="Die Fächer konnten gerade nicht geladen werden." onRetry={load} />
      ) : showEmpty ? (
        <AdminEmptyState
          icon={FolderKanban}
          title="Noch keine Fächer"
          description={`${emptyScopeText} Lege das erste Fach an, damit du Fragen und Themen zuordnen kannst.`}
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl min-h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Fach
            </Button>
          }
        />
      ) : (
        <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="text-ws-muted">Name</TableHead>
                <TableHead className="text-ws-muted">Code</TableHead>
                <TableHead className="text-ws-muted">Aktive Fragen</TableHead>
                <TableHead className="text-ws-muted">Status</TableHead>
                <TableHead className="text-right text-ws-muted">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
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
                <TableRow className="border-ws-line">
                  <TableCell colSpan={5} className="text-center text-ws-muted py-10">
                    Keine Fächer angelegt.
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((s) => {
                  const blockDeactivate = s.is_active && s.active_question_count > 0
                  return (
                    <TableRow key={s.id} className="border-ws-line hover:bg-ws-bg/40">
                      <TableCell className="text-ws-text font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{s.name}</span>
                          <DepartmentTag name={s.department_name} code={s.department_code} />
                        </div>
                        <LastChangedLine by={s.last_changed_by} at={s.last_changed_at} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-ws-line text-ws-green font-mono"
                        >
                          {s.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ws-text">
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
                              <TooltipContent className="bg-ws-bg text-ws-text border-ws-line">
                                Deaktivieren nicht möglich: Fach hat aktive Fragen.
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <AdminRowActions
                          subject={`Fach ${s.name}`}
                          editLabel="Fach bearbeiten"
                          editIcon={<Edit className="size-4" />}
                          onEdit={() => {
                            setEditing({ id: s.id, name: s.name, code: s.code, version_number: s.version_number })
                            setFormOpen(true)
                          }}
                          items={[
                            {
                              key: 'history',
                              label: 'Verlauf',
                              icon: <History className="text-ws-muted" />,
                              onSelect: () => setHistoryTarget(s),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <SubjectFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        subject={editing}
        onSuccess={load}
        onOpenHistory={() => {
          const target = subjects.find((x) => x.id === editing?.id)
          if (target) setHistoryTarget(target)
        }}
      />

      {historyTarget && (
        <ContentHistorySheet
          open
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          contentType="subject"
          contentId={historyTarget.id}
          title={historyTarget.name}
          onRestored={load}
        />
      )}
    </div>
  )
}
