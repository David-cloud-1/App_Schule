'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Printer, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AdminErrorState } from '@/components/admin/admin-states'

// Gruppen A/B (PROJ-76): im Entwurf einstellbar mit Vorschau von Gruppe B,
// nach dem Öffnen nur noch als Hinweis mit Link zum Lösungsschlüssel.

type GroupRow = { number: number; id: string; text: string; options: string[]; correctLetter: string | null }
type GroupsResponse = {
  frozen: boolean
  groups: { A: GroupRow[]; B: GroupRow[] }
  counts: { A: number; B: number }
  reviewQuestionIds: string[]
}

export function AssessmentGroupsCard({
  assessmentId,
  status,
  groupsEnabled,
  onChanged,
}: {
  assessmentId: string
  status: 'draft' | 'open' | 'closed'
  groupsEnabled: boolean
  onChanged: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<GroupsResponse | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle')

  const loadGroups = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/groups`)
      if (!res.ok) throw new Error('load failed')
      setData((await res.json()) as GroupsResponse)
      setState('idle')
    } catch {
      setState('failed')
    }
  }, [assessmentId])

  useEffect(() => {
    if (groupsEnabled) void loadGroups()
    else setData(null)
  }, [groupsEnabled, loadGroups])

  async function patch(body: Record<string, unknown>, success?: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      if (success) toast.success(success)
      onChanged()
      if (groupsEnabled && body.remixGroups) void loadGroups()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  if (status !== 'draft') {
    if (!groupsEnabled) return null
    return (
      <p className="text-xs text-ws-muted flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Gruppen: <span className="text-ws-text">A und B aktiv</span>
          {data && <> · Gruppe A: {data.counts.A} · Gruppe B: {data.counts.B}</>}
        </span>
        <Link href={`/admin/leistungsnachweise/${assessmentId}/druck/loesung`} className="text-ws-blue hover:underline inline-flex items-center gap-1">
          <Printer size={12} /> Lösungsschlüssel
        </Link>
      </p>
    )
  }

  const review = new Set(data?.reviewQuestionIds ?? [])
  const preview = data?.groups.B ?? []

  return (
    <div className="bg-ws-surface border border-ws-line rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Switch
          id="groups-enabled"
          checked={groupsEnabled}
          disabled={saving}
          onCheckedChange={(v) => void patch({ groupsEnabled: v })}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor="groups-enabled" className="text-ws-text font-medium">Gruppen A und B</Label>
          <p className="text-xs text-ws-muted max-w-prose">
            Gleiche Fragen, aber andere Reihenfolge der Fragen und Antworten in Gruppe B. Die Azubis werden beim Beitritt
            abwechselnd A und B zugeteilt. Ohne Gruppen mischt jeder Azubi einzeln. Nach dem Öffnen lässt sich das nicht
            mehr ändern.
          </p>
        </div>
      </div>

      {groupsEnabled && (
        <div className="space-y-3 border-t border-ws-line pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void patch({ remixGroups: true }, 'Gruppe B neu gemischt')}
              className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
            >
              {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Shuffle size={14} className="mr-1.5" />}
              Neu mischen
            </Button>
            <span className="text-xs text-ws-muted">Gruppe A bleibt in deiner Reihenfolge.</span>
          </div>

          {state === 'failed' && <AdminErrorState message="Die Vorschau konnte nicht geladen werden." onRetry={loadGroups} />}
          {state === 'loading' && !data && <p className="text-xs text-ws-muted">Vorschau wird geladen …</p>}

          {review.size > 0 && (
            <p className="text-xs rounded-xl border border-ws-orange/30 bg-ws-orange/15 text-ws-orange px-3 py-2">
              {review.size} Frage{review.size === 1 ? '' : 'n'} mit Antworten wie „Alle oben genannten“ oder „A und B“:
              Solche Antworten bleiben am Ende bzw. werden nicht gemischt. Bitte kurz prüfen.
            </p>
          )}

          {preview.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-ws-blue min-h-11 flex items-center">Vorschau Gruppe B ansehen</summary>
              <ol className="mt-2 space-y-2 text-ws-text max-h-72 overflow-y-auto pr-2">
                {preview.map((q) => (
                  <li key={q.id} className="text-xs">
                    <span className="font-semibold">{q.number}.</span> <span title={q.text}>{q.text.length > 110 ? `${q.text.slice(0, 110)} …` : q.text}</span>
                    {review.has(q.id) && <span className="ml-1 text-ws-orange">(prüfen)</span>}
                    <span className="text-ws-muted"> · richtig: {q.correctLetter ?? '—'}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
