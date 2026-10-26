'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatFocusDuration, formatFocusSummary, type ParticipantFocus } from '@/lib/focus-tracking'
import {
  FocusSettingsFields,
  focusFormFromDetail,
  focusFormToPayload,
  validateFocusForm,
  type FocusFormValue,
} from './focus-settings-fields'

// Anzeige des Fokus-Verlust-Protokolls für die Lehrkraft (PROJ-30).

type FocusEventRow = {
  id: string
  leftAt: string
  returnedAt: string | null
  durationSeconds: number | null
  questionNumber: number | null
  counted: boolean
}

type FocusDetailResponse = {
  focusTracking: boolean
  autoSubmitAfter: number | null
  summary: {
    countedSwitches: number
    countedSeconds: number
    shortCount: number
    autoSubmitted: boolean
    trackingUnavailable: boolean
  }
  events: FocusEventRow[]
  truncated: boolean
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

/** Zelle „Fokus" in der Teilnehmerliste: Zähler plus klar erkennbare Hinweise. */
export function FocusCell({
  focus,
  expanded,
  onToggle,
}: {
  focus: ParticipantFocus | null
  expanded: boolean
  onToggle: () => void
}) {
  if (!focus) return <span className="text-ws-faint">—</span>
  if (focus.trackingUnavailable && focus.countedSwitches === 0 && focus.shortCount === 0) {
    return (
      <Badge className="bg-ws-raised text-ws-text border-0 gap-1 whitespace-normal text-left" title="Der Browser dieses Teilnehmers kann Wechsel nicht erkennen.">
        <EyeOff size={12} aria-hidden="true" className="flex-shrink-0" />
        Keine Überwachung möglich
      </Badge>
    )
  }
  const hasDetail = focus.countedSwitches > 0 || focus.shortCount > 0 || focus.away
  return (
    <div className="flex flex-col items-start gap-1.5 min-w-40">
      <span className={cn('text-sm', focus.conspicuous ? 'text-ws-text font-medium' : 'text-ws-muted')}>
        {formatFocusSummary(focus.countedSwitches, focus.countedSeconds)}
      </span>
      {focus.conspicuous && (
        <Badge className="bg-ws-orange/20 text-ws-orange border-0 gap-1">
          <AlertTriangle size={12} aria-hidden="true" />
          Auffällig
        </Badge>
      )}
      {focus.away && (
        <Badge className="bg-ws-blue/20 text-ws-blue border-0 gap-1">
          <Eye size={12} aria-hidden="true" />
          Gerade nicht in der Prüfung
        </Badge>
      )}
      {focus.autoSubmitted && (
        <Badge className="bg-ws-red/15 text-ws-red border-0">
          Automatisch abgegeben (Fokus-Grenze)
        </Badge>
      )}
      {hasDetail && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-expanded={expanded}
          className="h-8 px-2 text-xs text-ws-muted hover:text-ws-text"
        >
          {expanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
          Details
        </Button>
      )}
    </div>
  )
}

/** Aufgeklappte Detailliste eines Teilnehmers: Uhrzeit, Dauer, Frage. */
export function FocusDetailPanel({ assessmentId, sessionId }: { assessmentId: string; sessionId: string }) {
  const [data, setData] = useState<FocusDetailResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/assessments/${assessmentId}/participants/${sessionId}/focus`)
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as FocusDetailResponse
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assessmentId, sessionId])

  if (failed) return <p className="text-sm text-ws-red">Das Protokoll konnte nicht geladen werden.</p>
  if (!data) return <Skeleton className="h-16 w-full rounded-xl" />

  return (
    <div className="space-y-3">
      {data.summary.trackingUnavailable && (
        <p className="flex items-start gap-2 rounded-xl border border-ws-line bg-ws-bg p-3 text-sm text-ws-text">
          <EyeOff size={16} className="mt-0.5 flex-shrink-0 text-ws-muted" aria-hidden="true" />
          Keine Überwachung möglich: Der Browser dieses Teilnehmers kann Wechsel nicht erkennen. Ein leeres Protokoll
          bedeutet hier nicht, dass die Prüfung nicht verlassen wurde.
        </p>
      )}
      {data.events.length === 0 ? (
        <p className="text-sm text-ws-muted">Keine Einträge.</p>
      ) : (
        <ul className="divide-y divide-ws-raised rounded-xl border border-ws-raised bg-ws-bg">
          {data.events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className="text-ws-muted tabular-nums">
                {new Date(e.leftAt).toLocaleString('de-DE', TIME_FORMAT)}
              </span>
              <span className={cn('tabular-nums', e.counted ? 'text-ws-text font-medium' : 'text-ws-faint')}>
                {e.durationSeconds != null ? formatFocusDuration(e.durationSeconds) : 'noch weg'}
              </span>
              <span className="text-ws-muted">
                {e.questionNumber != null ? `bei Frage ${e.questionNumber}` : 'Frage unbekannt'}
              </span>
              {!e.counted && e.returnedAt && (
                <Badge className="bg-ws-raised text-ws-muted border-0">kurz</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.truncated && (
        <p className="text-xs text-ws-orange">
          Es werden die ersten {data.events.length} Einträge gezeigt. Die Zähler enthalten alle Wechsel.
        </p>
      )}
      <p className="text-xs text-ws-faint">
        Ein Eintrag beweist kein Nachschlagen. Benachrichtigungen, Anrufe oder ein Gerätewechsel können ebenfalls
        einen Eintrag erzeugen. Abwesenheiten unter 3 Sekunden sind als „kurz" markiert und zählen nicht.
      </p>
    </div>
  )
}

/** Einstellungen im Entwurf änderbar; danach nur noch als Hinweis. */
export function FocusDraftSettings({
  assessmentId,
  focusTracking,
  focusAutoSubmitAfter,
  onSaved,
}: {
  assessmentId: string
  focusTracking: boolean
  focusAutoSubmitAfter: number | null
  onSaved: () => void
}) {
  const [value, setValue] = useState<FocusFormValue>(() => focusFormFromDetail(focusTracking, focusAutoSubmitAfter))
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function save() {
    const validation = validateFocusForm(value)
    if (validation) {
      setError(validation)
      return
    }
    setError(undefined)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(focusFormToPayload(value)),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Einstellungen gespeichert')
      onSaved()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <FocusSettingsFields value={value} onChange={setValue} error={error} />
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="rounded-xl bg-ws-blue hover:bg-ws-blue-hover text-ws-on-accent">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Einstellungen speichern
        </Button>
      </div>
    </div>
  )
}
