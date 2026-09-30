'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Plus } from 'lucide-react'
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

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<AdminDepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminDepartmentRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/departments')
      if (!res.ok) {
        toast.error('Fachbereiche konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setDepartments(json.departments ?? [])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Fachbereiche</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {departments.length} {departments.length === 1 ? 'Fachbereich' : 'Fachbereiche'}
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
          Neuer Fachbereich
        </Button>
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Name</TableHead>
              <TableHead className="text-[#9CA3AF]">Kürzel</TableHead>
              <TableHead className="text-[#9CA3AF]">Adresse</TableHead>
              <TableHead className="text-right text-[#9CA3AF]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : departments.length === 0 ? (
              <TableRow className="border-[#4B5563]">
                <TableCell colSpan={4} className="text-center text-[#9CA3AF] py-10">
                  Keine Fachbereiche angelegt.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((d) => (
                <TableRow key={d.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                  <TableCell className="text-[#F9FAFB] font-medium">
                    {d.name}
                    <span className="block text-xs text-[#9CA3AF]">{d.appName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[#4B5563] text-[#58CC02] font-mono">
                      {d.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#9CA3AF] font-mono">
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

      <DepartmentFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        department={editing}
        onSuccess={load}
      />
    </div>
  )
}
