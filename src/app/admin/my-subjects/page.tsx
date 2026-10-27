'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, UserCog } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { SubjectFormModal } from '@/components/admin/subject-form-modal'

type Department = { id: string; name: string; code: string }
type Subject = { id: string; name: string; code: string; department_id: string }
type Assignment = { id: string; department_id: string; subject_id: string | null }

type Catalog = {
  departments: Department[]
  subjects: Subject[]
  assignments: Assignment[]
}

/**
 * „Meine Fächer" (PROJ-48): eine Lehrkraft trägt sich selbst für Fächer (oder
 * nur einen Fachbereich, für Bereiche ohne eigene Fächer) ein. Keine Freigabe
 * nötig (E1) — jede Änderung gilt sofort.
 */
export default function MySubjectsPage() {
  const [data, setData] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [newSubjectDeptId, setNewSubjectDeptId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch('/api/admin/my-subjects')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      setData(await res.json())
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

  const subjectsByDept = useMemo(() => {
    const map = new Map<string, Subject[]>()
    for (const s of data?.subjects ?? []) {
      const list = map.get(s.department_id) ?? []
      list.push(s)
      map.set(s.department_id, list)
    }
    return map
  }, [data])

  const assignmentFor = useCallback(
    (departmentId: string, subjectId: string | null) =>
      data?.assignments.find((a) => a.department_id === departmentId && a.subject_id === subjectId) ?? null,
    [data]
  )

  const hasAnyAssignmentIn = useCallback(
    (departmentId: string) => !!data?.assignments.some((a) => a.department_id === departmentId),
    [data]
  )

  async function setChecked(key: string, departmentId: string, subjectId: string | null, next: boolean) {
    setPending((prev) => new Set(prev).add(key))
    try {
      if (next) {
        const res = await fetch('/api/admin/my-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department_id: departmentId, subject_id: subjectId }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body?.error ?? 'Eintragen fehlgeschlagen.')
          return
        }
      } else {
        const existing = assignmentFor(departmentId, subjectId)
        if (!existing) return
        const res = await fetch(`/api/admin/my-subjects/${existing.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          toast.error(body?.error ?? 'Austragen fehlgeschlagen.')
          return
        }
      }
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Meine Fächer"
        description="Kreuze an, in welchen Fachbereichen und Fächern du unterrichtest. Änderungen gelten sofort — keine Freigabe nötig."
      />

      {loading && <AdminLoadingState variant="cards" rows={3} />}
      {!loading && loadFailed && <AdminErrorState onRetry={load} />}

      {!loading && !loadFailed && data && (
        <div className="space-y-4">
          {data.departments.map((dept) => {
            const subjects = subjectsByDept.get(dept.id) ?? []
            const deptKey = `dept:${dept.id}`
            const deptAssignment = assignmentFor(dept.id, null)

            return (
              <div key={dept.id} className="rounded-2xl border border-ws-line bg-ws-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ws-text">{dept.name}</p>
                    <p className="text-sm text-ws-muted">{dept.code}</p>
                  </div>
                  {hasAnyAssignmentIn(dept.id) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
                      onClick={() => setNewSubjectDeptId(dept.id)}
                    >
                      <Plus className="mr-2 size-4" />
                      Neues Fach anlegen
                    </Button>
                  )}
                </div>

                <Separator className="my-4 bg-ws-line" />

                <div className="flex items-center gap-3">
                  <Checkbox
                    id={deptKey}
                    checked={!!deptAssignment}
                    disabled={pending.has(deptKey)}
                    onCheckedChange={(v) => setChecked(deptKey, dept.id, null, v === true)}
                    className="size-5"
                  />
                  <Label htmlFor={deptKey} className="text-sm font-medium text-ws-text">
                    Ich unterrichte in diesem Bereich (noch ohne eigenes Fach)
                  </Label>
                </div>

                {subjects.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {subjects.map((subject) => {
                      const key = `subj:${subject.id}`
                      const assignment = assignmentFor(dept.id, subject.id)
                      return (
                        <div key={subject.id} className="flex items-center gap-3">
                          <Checkbox
                            id={key}
                            checked={!!assignment}
                            disabled={pending.has(key)}
                            onCheckedChange={(v) => setChecked(key, dept.id, subject.id, v === true)}
                            className="size-5"
                          />
                          <Label htmlFor={key} className="text-sm text-ws-text">
                            {subject.name}{' '}
                            <span className="text-ws-muted">({subject.code})</span>
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                )}

                {subjects.length === 0 && (
                  <p className="mt-3 text-sm text-ws-muted">
                    Noch keine Fächer in diesem Bereich. Kreuze oben an, dann kannst du eines anlegen.
                  </p>
                )}
              </div>
            )
          })}

          {data.departments.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ws-line bg-ws-surface/50 px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-ws-raised text-ws-muted">
                <UserCog className="size-6" aria-hidden />
              </span>
              <p className="text-base font-semibold text-ws-text">Keine Fachbereiche verfügbar</p>
            </div>
          )}
        </div>
      )}

      {newSubjectDeptId && (
        <SubjectFormModal
          open
          departmentId={newSubjectDeptId}
          onOpenChange={(open) => {
            if (!open) setNewSubjectDeptId(null)
          }}
          onSuccess={() => {
            setNewSubjectDeptId(null)
            load()
          }}
        />
      )}
    </div>
  )
}
