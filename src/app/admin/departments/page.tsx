'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Plus, Building2 } from 'lucide-react'
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
import {
  DepartmentFormModal,
  type AdminDepartmentRow,
} from '@/components/admin/department-form-modal'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState, AdminEmptyState } from '@/components/admin/admin-states'

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<AdminDepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminDepartmentRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch('/api/admin/departments')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = await res.json()
      setDepartments(json.departments ?? [])
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Fachbereiche"
        description={<>{departments.length} {departments.length === 1 ? 'Fachbereich' : 'Fachbereiche'}</>}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Fachbereich
          </Button>
        }
      />

      {loadFailed ? (
        <AdminErrorState message="Die Fachbereiche konnten gerade nicht geladen werden." onRetry={load} />
      ) : !loading && departments.length === 0 ? (
        <AdminEmptyState
          icon={Building2}
          title="Noch keine Fachbereiche"
          description="Lege den ersten Fachbereich an."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl min-h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neuer Fachbereich
            </Button>
          }
        />
      ) : (
        <div className="ws-table-scroll border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="text-ws-muted">Name</TableHead>
                <TableHead className="text-ws-muted">Kürzel</TableHead>
                <TableHead className="text-ws-muted">Adresse</TableHead>
                <TableHead className="text-right text-ws-muted">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : departments.length === 0 ? (
                <TableRow className="border-ws-line">
                  <TableCell colSpan={4} className="text-center text-ws-muted py-10">
                    Keine Fachbereiche angelegt.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((d) => (
                  <TableRow key={d.id} className="border-ws-line hover:bg-ws-bg/40">
                    <TableCell className="text-ws-text font-medium">
                      {d.name}
                      <span className="block text-xs text-ws-muted">{d.appName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-ws-line text-ws-green font-mono">
                        {d.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-ws-muted font-mono">
                      {d.domain ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(d)
                          setFormOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DepartmentFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        department={editing}
        onSuccess={load}
      />
    </div>
  )
}
