'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNeedsTargetDepartment } from '@/components/admin/target-department-field'

/**
 * „Fach und Thema“ (PROJ-132): ein Auswahlfeld, nach Fach gruppiert. Es zeigt
 * nur Themen aus dem gewählten Bereich und erlaubt keine Mehrfachauswahl. Es
 * wird in allen drei Wegen von „Fragen hinzufügen“ und im Fragen-Formular
 * verwendet.
 */
export interface TopicOption {
  id: string
  name: string
  subjectId: string
  subjectCode: string
  subjectName: string
  departmentName: string | null
  /** Stufen, in denen das Thema schon Fragen hat (Themen haben selbst keine Stufe) */
  classLevels: number[]
}

type TopicRow = {
  id: string
  name: string
  subject_id: string
  class_levels?: number[]
  subjects?: { id: string; code: string; name: string; departments?: { name: string } | { name: string }[] | null } | null
}

/** Wert für „Fach ohne Thema“ beim Bearbeiten einer Frage, die noch kein Thema hat */
export const noTopicValue = (subjectId: string) => `none:${subjectId}`
export const isNoTopicValue = (value: string) => value.startsWith('none:')
export const subjectOfNoTopic = (value: string) => value.slice('none:'.length)

/** Lädt alle Themen im Bereich der Bereichsleiste, solange `active` gilt */
export function useTopicOptions(active: boolean) {
  const [options, setOptions] = useState<TopicOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { topics?: TopicRow[] }
      const next: TopicOption[] = (data.topics ?? [])
        .filter((t) => t.subjects)
        .map((t) => {
          const dep = t.subjects!.departments
          return {
            id: t.id,
            name: t.name,
            subjectId: t.subject_id,
            subjectCode: t.subjects!.code,
            subjectName: t.subjects!.name,
            departmentName: (Array.isArray(dep) ? dep[0]?.name : dep?.name) ?? null,
            classLevels: t.class_levels ?? [],
          }
        })
        .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, 'de') || a.name.localeCompare(b.name, 'de'))
      setOptions(next)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (active) void load()
  }, [active, load])

  return { options, loading, failed, reload: load }
}

export function FachThemaSelect({
  id = 'fach-thema',
  value,
  onChange,
  options,
  loading,
  failed,
  onRetry,
  error,
  noTopicFor,
  label = 'Fach und Thema',
}: {
  id?: string
  /** Themen-ID, `none:<Fach-ID>` oder leer */
  value: string
  onChange: (value: string, option: TopicOption | null) => void
  options: TopicOption[]
  loading: boolean
  failed: boolean
  onRetry?: () => void
  error?: string
  /** Fach einer bestehenden Frage ohne Thema: erlaubt „Ohne Thema“ für dieses Fach */
  noTopicFor?: { subjectId: string; subjectCode: string } | null
  label?: string
}) {
  const multiDepartments = useNeedsTargetDepartment()
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; items: TopicOption[] }>()
    for (const o of options) {
      const g = map.get(o.subjectId) ?? {
        key: o.subjectId,
        title: `${o.subjectCode} · ${o.subjectName}${multiDepartments && o.departmentName ? ` (${o.departmentName})` : ''}`,
        items: [],
      }
      g.items.push(o)
      map.set(o.subjectId, g)
    }
    return [...map.values()]
  }, [options, multiDepartments])

  const known = value === '' || options.some((o) => o.id === value) || isNoTopicValue(value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} <span className="text-ws-red" aria-hidden>*</span>
      </Label>
      <Select
        value={value}
        // Radix meldet beim Befüllen kurz '' (Option noch nicht bekannt): ignorieren
        onValueChange={(v) => v && onChange(v, options.find((o) => o.id === v) ?? null)}
        disabled={loading || failed}
      >
        <SelectTrigger id={id} className="min-h-11 border-ws-line bg-ws-bg text-ws-text" aria-invalid={Boolean(error)}>
          {loading ? <span className="text-sm text-ws-muted">Wird geladen …</span> : <SelectValue placeholder="Fach und Thema wählen" />}
        </SelectTrigger>
        <SelectContent className="max-h-72 border-ws-line bg-ws-surface text-ws-text">
          {groups.map((g) => (
            <SelectGroup key={g.key}>
              <SelectLabel className="text-xs text-ws-faint">{g.title}</SelectLabel>
              {g.items.map((o) => (
                <SelectItem key={o.id} value={o.id} className="min-h-11" title={o.name}>
                  {o.name}
                </SelectItem>
              ))}
              {noTopicFor?.subjectId === g.key && (
                <SelectItem value={noTopicValue(g.key)} className="min-h-11">
                  Ohne Thema
                </SelectItem>
              )}
            </SelectGroup>
          ))}
          {!known && value && <SelectItem value={value}>Dieses Thema gibt es nicht mehr</SelectItem>}
        </SelectContent>
      </Select>
      {failed && (
        <p className="text-xs text-ws-red">
          Die Themen konnten nicht geladen werden.{' '}
          {onRetry && (
            <button type="button" onClick={onRetry} className="min-h-11 underline underline-offset-2">
              Erneut versuchen
            </button>
          )}
        </p>
      )}
      {!loading && !failed && options.length === 0 && (
        <p className="text-xs text-ws-muted">Es gibt noch kein Thema. Lege zuerst im Baum ein Thema an.</p>
      )}
      {error && <p className="text-xs text-ws-red">{error}</p>}
    </div>
  )
}
