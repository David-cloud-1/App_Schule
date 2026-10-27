'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KontoCard, KontoSectionError } from '@/components/admin/konto-card'
import { AdminEmptyState, AdminLoadingState } from '@/components/admin/admin-states'
import { contentScopeText, type TeacherRole } from '@/lib/roles'

type Department = { id: string; name: string; code: string }
type Subject = { id: string; name: string; code: string; department_id: string }
type Assignment = { id: string; department_id: string; subject_id: string | null }
type Catalog = { departments: Department[]; subjects: Subject[]; assignments: Assignment[] }

/** Wert im Auswahlfeld: Bereich und (leeres) Fach, durch „|“ getrennt */
const encode = (departmentId: string, subjectId: string | null) => `${departmentId}|${subjectId ?? ''}`

/**
 * Karte „Meine Fächer“ (PROJ-50, Daten aus PROJ-48): eigene Zuständigkeiten
 * ansehen, hinzufügen und austragen — dieselben Schnittstellen und Regeln wie
 * auf der Seite „Meine Fächer“. Bereichs-Admin und Super-Admin tragen sich
 * nicht ein; für sie steht hier nur, was sie sehen dürfen.
 */
export function KontoFaecher({ role, departmentName }: { role: TeacherRole; departmentName: string | null }) {
  if (role !== 'teacher') {
    return (
      <KontoCard id="faecher" icon={BookOpen} title="Meine Fächer">
        <p className="text-sm text-ws-text">{contentScopeText(role, departmentName ?? '')}</p>
        <p className="text-sm text-ws-muted">Du musst dich nicht für Fächer eintragen, deine Rechte gelten für den ganzen Bereich.</p>
      </KontoCard>
    )
  }
  return <TeacherFaecher />
}

function TeacherFaecher() {
  const router = useRouter()
  const [data, setData] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const res = await fetch('/api/admin/my-subjects')
      if (!res.ok) {
        setFailed(true)
        return
      }
      setData(await res.json())
    } catch (err) {
      console.error(err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const deptById = useMemo(() => new Map((data?.departments ?? []).map((d) => [d.id, d])), [data])
  const subjectById = useMemo(() => new Map((data?.subjects ?? []).map((s) => [s.id, s])), [data])

  const chosen = useMemo(() => new Set((data?.assignments ?? []).map((a) => encode(a.department_id, a.subject_id))), [data])

  /** Noch nicht eingetragene Fächer, nach Bereich gruppiert */
  const options = useMemo(() => {
    if (!data) return []
    return data.departments
      .map((dept) => ({
        dept,
        subjects: data.subjects.filter((s) => s.department_id === dept.id && !chosen.has(encode(dept.id, s.id))),
        // Bereiche ohne eigene Fächer: nur den Bereich eintragen
        canAddDepartment: !chosen.has(encode(dept.id, null)),
      }))
      .filter((o) => o.subjects.length > 0 || o.canAddDepartment)
  }, [data, chosen])

  async function add(value: string) {
    const [departmentId, subjectId] = value.split('|')
    setPending(value)
    try {
      const res = await fetch('/api/admin/my-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: departmentId, subject_id: subjectId || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error ?? 'Eintragen fehlgeschlagen.')
        return
      }
      toast.success('Fach eingetragen.')
      await load()
      router.refresh() // Navigation und Konto-Menü zählen die Fächer mit
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setPending(null)
    }
  }

  async function remove(assignment: Assignment) {
    setPending(assignment.id)
    try {
      const res = await fetch(`/api/admin/my-subjects/${assignment.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error ?? 'Austragen fehlgeschlagen.')
        return
      }
      toast.success('Fach ausgetragen.')
      await load()
      router.refresh()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setPending(null)
    }
  }

  const assignments = data?.assignments ?? []

  return (
    <KontoCard id="faecher" icon={BookOpen} title="Meine Fächer" description="Hier siehst du nur die Inhalte der Fächer, in denen du unterrichtest.">
      {loading && <AdminLoadingState variant="list" rows={2} />}
      {!loading && failed && <KontoSectionError />}
      {!loading && !failed && data && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <AdminEmptyState icon={BookOpen} title="Noch kein Fach eingetragen" description="Wähle unten ein Fach, dann erscheinen die passenden Inhalte." />
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Eingetragene Fächer">
              {assignments.map((a) => {
                const dept = deptById.get(a.department_id)
                const subject = a.subject_id ? subjectById.get(a.subject_id) : null
                const label = subject ? subject.name : `${dept?.name ?? 'Bereich'} (ohne Fach)`
                return (
                  <li key={a.id} className="flex items-center gap-1 rounded-full border border-ws-line bg-ws-raised py-1 pl-3 pr-1 text-sm text-ws-text">
                    <span className="max-w-[16rem] truncate" title={subject && dept ? `${subject.name} (${dept.name})` : label}>
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(a)}
                      disabled={pending === a.id}
                      aria-label={`${label} austragen`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ws-muted transition-colors duration-200 hover:bg-ws-line/40 hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green disabled:opacity-50"
                    >
                      {pending === a.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {options.length > 0 && (
            <Select value="" onValueChange={add} disabled={pending !== null}>
              <SelectTrigger aria-label="Fach hinzufügen" className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus:ring-ws-green">
                <span className="flex items-center gap-2">
                  <Plus aria-hidden className="size-4 text-ws-muted" />
                  <SelectValue placeholder="Fach hinzufügen" />
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-72 border-ws-line bg-ws-surface text-ws-text">
                {options.map(({ dept, subjects, canAddDepartment }) => (
                  <SelectGroup key={dept.id}>
                    <SelectLabel className="text-xs uppercase tracking-wider text-ws-faint">{dept.name}</SelectLabel>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={encode(dept.id, s.id)} className="min-h-11 focus:bg-ws-raised focus:text-ws-text">
                        {s.name} <span className="text-ws-muted">({s.code})</span>
                      </SelectItem>
                    ))}
                    {subjects.length === 0 && canAddDepartment && (
                      <SelectItem value={encode(dept.id, null)} className="min-h-11 focus:bg-ws-raised focus:text-ws-text">
                        Im Bereich {dept.name} unterrichten
                      </SelectItem>
                    )}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button asChild variant="link" className="h-auto min-h-11 p-0 text-ws-blue">
            <Link href="/admin/my-subjects">Alle Fächer und Bereiche ansehen</Link>
          </Button>
        </div>
      )}
    </KontoCard>
  )
}
