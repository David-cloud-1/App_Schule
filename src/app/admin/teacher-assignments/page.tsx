'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'

type Assignment = {
  id: string
  createdAt: string
  teacher: { id: string; name: string } | null
  department: { id: string; name: string; code: string } | null
  subject: { id: string; name: string; code: string } | null
}

/** Übersicht „Zuständigkeiten" (PROJ-48) — nur für den Super-Admin. */
export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch('/api/admin/teacher-assignments')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = await res.json()
      setAssignments(json.assignments ?? [])
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

  const bySubject = useMemo(() => {
    const map = new Map<string, { label: string; rows: Assignment[] }>()
    for (const a of assignments) {
      const label = a.subject
        ? `${a.department?.name ?? ''} · ${a.subject.name}`
        : `${a.department?.name ?? ''} (ohne Fach)`
      const key = a.subject ? `s:${a.subject.id}` : `d:${a.department?.id}`
      const entry = map.get(key) ?? { label, rows: [] }
      entry.rows.push(a)
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [assignments])

  const byTeacher = useMemo(() => {
    const map = new Map<string, { label: string; rows: Assignment[] }>()
    for (const a of assignments) {
      const key = a.teacher?.id ?? 'unbekannt'
      const entry = map.get(key) ?? { label: a.teacher?.name ?? 'Unbekannt', rows: [] }
      entry.rows.push(a)
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [assignments])

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/teacher-assignments/${removeTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error ?? 'Entfernen fehlgeschlagen.')
        return
      }
      toast.success('Zuständigkeit entfernt')
      setRemoveTarget(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setRemoving(false)
    }
  }

  function row(a: Assignment, primary: string) {
    return (
      <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-ws-line bg-ws-surface px-4 py-3">
        <span className="min-w-0 truncate text-sm text-ws-text">{primary}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-ws-muted hover:bg-ws-red/15 hover:text-ws-red"
          onClick={() => setRemoveTarget(a)}
          aria-label="Zuständigkeit entfernen"
        >
          <Trash2 className="size-4" />
        </Button>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Zuständigkeiten"
        description="Wer hat sich für welches Fach eingetragen (PROJ-48)."
      />

      {loading && <AdminLoadingState variant="list" />}
      {!loading && loadFailed && <AdminErrorState onRetry={load} />}

      {!loading && !loadFailed && assignments.length === 0 && (
        <AdminEmptyState icon={Users} title="Noch keine Zuständigkeiten" description="Noch keine Lehrkraft hat sich für ein Fach eingetragen." />
      )}

      {!loading && !loadFailed && assignments.length > 0 && (
        <Tabs defaultValue="subject">
          <TabsList className="bg-ws-raised">
            <TabsTrigger value="subject">Nach Fach</TabsTrigger>
            <TabsTrigger value="teacher">Nach Lehrkraft</TabsTrigger>
          </TabsList>
          <TabsContent value="subject" className="mt-4 space-y-4">
            {bySubject.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-sm font-semibold text-ws-text">{group.label}</h3>
                <ul className="space-y-2">{group.rows.map((a) => row(a, a.teacher?.name ?? 'Unbekannt'))}</ul>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="teacher" className="mt-4 space-y-4">
            {byTeacher.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-sm font-semibold text-ws-text">{group.label}</h3>
                <ul className="space-y-2">
                  {group.rows.map((a) =>
                    row(a, a.subject ? `${a.department?.name ?? ''} · ${a.subject.name}` : `${a.department?.name ?? ''} (ohne Fach)`)
                  )}
                </ul>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Zuständigkeit entfernen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {removeTarget?.teacher?.name} verliert damit sofort die Rechte für{' '}
              {removeTarget?.subject ? removeTarget.subject.name : `den Bereich ${removeTarget?.department?.name}`}. Bereits
              angelegte Inhalte bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRemove()
              }}
              disabled={removing}
              className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent"
            >
              {removing && <Loader2 className="mr-2 size-4 animate-spin" />}
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
