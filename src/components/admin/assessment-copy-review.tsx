'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle, CopyIcon, Loader2, Repeat2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ANALYSIS_REASON_HINT, type AnalysisLight } from '@/lib/assessment-analysis'
import type { CopyReviewRow } from '@/lib/assessment-copy-types'
import { cn } from '@/lib/utils'

interface Replacement {
  id: string
  text: string
  topic: string | null
  level: 'leicht' | 'mittel' | 'schwer'
  correctRate: number | null
  rated: boolean
  isPrivate: boolean
}

interface ReviewResponse {
  isCopy: boolean
  sourceId: string | null
  sourceTitle: string
  analysisAvailable: boolean
  participants: number
  unavailableCount: number
  rows: CopyReviewRow[]
}

const LIGHT_LABEL: Record<AnalysisLight, string> = { red: 'Prüfen', yellow: 'Auffällig', green: 'Unauffällig', none: '' }
const LIGHT_STYLE: Record<AnalysisLight, string> = {
  red: 'border-ws-red/30 bg-ws-red/15 text-ws-red',
  yellow: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange',
  green: 'border-ws-green/30 bg-ws-green/15 text-ws-green',
  none: '',
}
const LEVEL_LABEL = { leicht: 'leicht', mittel: 'mittel', schwer: 'schwer' } as const

/** auffällig = rote/gelbe Ampel oder Frage fehlt */
function isConspicuous(row: CopyReviewRow): boolean {
  return !row.available || row.light === 'red' || row.light === 'yellow'
}

function shorten(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

async function post(assessmentId: string, body: unknown) {
  const res = await fetch(`/api/admin/assessments/${assessmentId}/replace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/**
 * PROJ-79: Prüfkarte für den Entwurf einer Kopie. Zeigt je Frage die Ampel aus dem Durchlauf des
 * Originals, Hinweise auf Änderungen, Platzhalter für nicht mehr verfügbare Fragen und bietet
 * „Ersetzen“ je Frage sowie „Alle auffälligen ersetzen“ mit Vorschau.
 */
export function AssessmentCopyReview({
  assessmentId,
  onChanged,
}: {
  assessmentId: string
  /** Nach jeder Änderung der Fragenliste (damit Anzahl und Start-Sperre aktuell bleiben) */
  onChanged: () => void
}) {
  const [data, setData] = useState<ReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [onlyConspicuous, setOnlyConspicuous] = useState(false)

  // Einzel-Ersetzen
  const [target, setTarget] = useState<CopyReviewRow | null>(null)
  const [alternatives, setAlternatives] = useState<Replacement[] | null>(null)
  const [topicKnown, setTopicKnown] = useState(true)
  const [loadingAlts, setLoadingAlts] = useState(false)

  // Sammel-Ersetzen
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkItems, setBulkItems] = useState<{ row: CopyReviewRow; replacement: Replacement | null; take: boolean }[] | null>(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/copy-review`)
      if (!res.ok) {
        setFailed(true)
        return
      }
      setData(await res.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const conspicuousRows = useMemo(() => (data?.rows ?? []).filter(isConspicuous), [data])
  const visibleRows = useMemo(
    () => (onlyConspicuous ? (data?.rows ?? []).filter(isConspicuous) : (data?.rows ?? [])),
    [data, onlyConspicuous],
  )

  async function openReplace(row: CopyReviewRow) {
    setTarget(row)
    setAlternatives(null)
    setTopicKnown(true)
    setLoadingAlts(true)
    try {
      const r = await post(assessmentId, { action: 'alternatives', questionId: row.id })
      if (!r.ok) {
        toast.error(r.data?.error ?? 'Ersatz konnte nicht geladen werden')
        setTarget(null)
        return
      }
      setAlternatives(r.data.alternatives ?? [])
      setTopicKnown(r.data.topicKnown !== false)
    } catch {
      toast.error('Netzwerkfehler')
      setTarget(null)
    } finally {
      setLoadingAlts(false)
    }
  }

  async function apply(body: { swaps: { from: string; to: string }[]; removes: string[] }, successText: string) {
    setWorking(true)
    try {
      const r = await post(assessmentId, { action: 'apply', ...body })
      if (!r.ok) {
        toast.error(r.data?.error ?? 'Speichern fehlgeschlagen')
        if (r.status === 409) void load()
        return false
      }
      toast.success(successText)
      await load()
      onChanged()
      return true
    } catch {
      toast.error('Netzwerkfehler')
      return false
    } finally {
      setWorking(false)
    }
  }

  async function chooseReplacement(alt: Replacement) {
    if (!target) return
    if (await apply({ swaps: [{ from: target.id, to: alt.id }], removes: [] }, 'Frage ersetzt')) setTarget(null)
  }

  async function removeRow(row: CopyReviewRow) {
    await apply({ swaps: [], removes: [row.id] }, 'Platzhalter entfernt')
  }

  async function openBulk() {
    setBulkOpen(true)
    setBulkItems(null)
    try {
      const r = await post(assessmentId, { action: 'bulk', questionIds: conspicuousRows.map((row) => row.id) })
      if (!r.ok) {
        toast.error(r.data?.error ?? 'Vorschau konnte nicht erstellt werden')
        setBulkOpen(false)
        return
      }
      const byId = new Map(conspicuousRows.map((row) => [row.id, row]))
      setBulkItems(
        (r.data.items as { questionId: string; replacement: Replacement | null }[])
          .filter((i) => byId.has(i.questionId))
          .map((i) => ({ row: byId.get(i.questionId)!, replacement: i.replacement, take: !!i.replacement })),
      )
    } catch {
      toast.error('Netzwerkfehler')
      setBulkOpen(false)
    }
  }

  async function applyBulk() {
    const chosen = (bulkItems ?? []).filter((i) => i.take && i.replacement)
    if (chosen.length === 0) return
    const ok = await apply(
      { swaps: chosen.map((i) => ({ from: i.row.id, to: i.replacement!.id })), removes: [] },
      `${chosen.length} Frage${chosen.length === 1 ? '' : 'n'} ersetzt`,
    )
    if (ok) setBulkOpen(false)
  }

  if (loading && !data) return <AdminLoadingState variant="list" />
  if (failed) return <AdminErrorState message="Der Prüfbericht konnte gerade nicht geladen werden." onRetry={load} />
  if (!data || !data.isCopy) return null

  const bulkTakeCount = (bulkItems ?? []).filter((i) => i.take && i.replacement).length

  return (
    <section className="space-y-4 rounded-2xl border border-ws-line bg-ws-surface p-4" aria-label="Prüfung der Kopie">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ws-text">
            <CopyIcon size={16} className="text-ws-muted" />
            Kopie von{' '}
            {data.sourceId ? (
              <Link href={`/admin/leistungsnachweise/${data.sourceId}`} className="truncate underline-offset-2 hover:underline" title={data.sourceTitle}>
                {data.sourceTitle}
              </Link>
            ) : (
              <span className="truncate" title={data.sourceTitle}>{data.sourceTitle}</span>
            )}
          </h2>
          <p className="max-w-prose text-sm text-ws-muted">
            {data.analysisAvailable
              ? `Die Ampel stammt aus dem Durchlauf des Originals (${data.participants} Abgabe${data.participants === 1 ? '' : 'n'}). Rote und gelbe Fragen solltest du prüfen.`
              : 'Das Original wurde nicht ausgewertet – es gibt keine Ampel. Ersetzen geht trotzdem von Hand.'}
          </p>
          <p className="max-w-prose text-sm text-ws-muted">
            Das Zeitfenster wurde auf sieben Tage ab dem Kopieren gesetzt. Bitte vor dem Öffnen prüfen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2">
            <Switch id="only-conspicuous" checked={onlyConspicuous} onCheckedChange={setOnlyConspicuous} />
            <Label htmlFor="only-conspicuous" className="cursor-pointer text-sm text-ws-text">
              Nur auffällige ({conspicuousRows.length})
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={openBulk}
            disabled={conspicuousRows.length === 0 || working}
            className="min-h-11 rounded-xl border-ws-line text-ws-text"
          >
            <Repeat2 size={14} className="mr-1.5" />
            Alle auffälligen ersetzen
          </Button>
        </div>
      </div>

      {data.unavailableCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            {data.unavailableCount} Frage{data.unavailableCount === 1 ? ' ist' : 'n sind'} nicht mehr verfügbar. Der
            Nachweis lässt sich erst öffnen, wenn sie ersetzt oder entfernt sind.
          </p>
        </div>
      )}

      {visibleRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ws-muted">Keine auffälligen Fragen. Alles sieht gut aus.</p>
      ) : (
        <ul className="divide-y divide-ws-line rounded-xl border border-ws-line">
          {visibleRows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start gap-3 p-3">
              <span className="w-7 shrink-0 pt-0.5 text-sm tabular-nums text-ws-faint">{row.position}.</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                {row.available ? (
                  <p className="text-sm text-ws-text" title={row.text ?? undefined}>{shorten(row.text ?? '')}</p>
                ) : (
                  <p className="text-sm font-medium text-ws-red">Frage nicht mehr verfügbar</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {row.topic && <Badge className="border-0 bg-ws-raised text-xs text-ws-text">{row.topic}</Badge>}
                  {row.light !== 'none' && (
                    <Badge className={cn('border text-xs', LIGHT_STYLE[row.light])}>
                      {LIGHT_LABEL[row.light]}
                      {row.correctRate !== null && ` · ${row.correctRate} % richtig`}
                      {row.discrimination !== null && ` · Trennschärfe ${row.discrimination.toFixed(2).replace('.', ',')}`}
                    </Badge>
                  )}
                  {row.changed && (
                    <Badge className="border border-ws-blue/30 bg-ws-blue/15 text-xs text-ws-blue">
                      Frage geändert seit dem letzten Nachweis
                    </Badge>
                  )}
                  {row.blocked && (
                    <Badge className="border border-ws-orange/30 bg-ws-orange/15 text-xs text-ws-orange">
                      Für Nachweise gesperrt
                    </Badge>
                  )}
                </div>
                {row.reasons.length > 0 && (row.light === 'red' || row.light === 'yellow') && (
                  <p className="text-xs text-ws-muted">{ANALYSIS_REASON_HINT[row.reasons[0]]}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  onClick={() => openReplace(row)}
                  disabled={working}
                  className="min-h-11 rounded-xl border-ws-line text-ws-text"
                >
                  <Repeat2 size={14} className="mr-1.5" />
                  Ersetzen
                </Button>
                {!row.available && (
                  <Button
                    variant="outline"
                    onClick={() => removeRow(row)}
                    disabled={working}
                    aria-label="Platzhalter entfernen"
                    className="min-h-11 rounded-xl border-ws-red/30 text-ws-red hover:bg-ws-red/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Einzel-Ersetzen */}
      <Dialog open={target !== null} onOpenChange={(o) => !working && !o && setTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
          <DialogHeader>
            <DialogTitle>Frage {target?.position} ersetzen</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Vorschläge aus demselben Thema mit möglichst ähnlicher Schwierigkeit. Die Frage behält ihre Position.
            </DialogDescription>
          </DialogHeader>
          {loadingAlts || alternatives === null ? (
            <AdminLoadingState variant="list" />
          ) : alternatives.length === 0 ? (
            <p className="rounded-xl border border-ws-line bg-ws-bg p-4 text-sm text-ws-muted">
              {topicKnown
                ? 'Kein passender Ersatz vorhanden – das Thema ist leer gespielt. Über „Fragen bearbeiten“ kannst du neue Fragen erzeugen oder aus einem Aufgabenblatt importieren.'
                : 'Zu dieser Frage ist das Thema nicht mehr bekannt. Wähle über „Fragen bearbeiten“ eine passende Frage von Hand.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {alternatives.map((alt) => (
                <li key={alt.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-ws-line p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-ws-text" title={alt.text}>{shorten(alt.text, 200)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="border-0 bg-ws-raised text-xs text-ws-text">{LEVEL_LABEL[alt.level]}</Badge>
                      <Badge className="border-0 bg-ws-raised text-xs text-ws-muted">
                        {alt.rated && alt.correctRate !== null ? `${alt.correctRate} % richtig` : 'noch keine Auswertung'}
                      </Badge>
                      {alt.isPrivate && <Badge className="border-0 bg-ws-blue/15 text-xs text-ws-blue">Meine Frage</Badge>}
                    </div>
                  </div>
                  <Button
                    onClick={() => chooseReplacement(alt)}
                    disabled={working}
                    className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                  >
                    {working && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Diese nehmen
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={working}>Abbrechen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sammel-Ersetzen mit Vorschau */}
      <Dialog open={bulkOpen} onOpenChange={(o) => !working && setBulkOpen(o)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
          <DialogHeader>
            <DialogTitle>Auffällige Fragen ersetzen</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Vorschau: Erst mit „Übernehmen“ ändert sich der Entwurf. Einzelne Vorschläge kannst du abwählen.
            </DialogDescription>
          </DialogHeader>
          {bulkItems === null ? (
            <AdminLoadingState variant="list" />
          ) : (
            <ul className="space-y-2">
              {bulkItems.map((item, index) => (
                <li key={item.row.id} className="rounded-xl border border-ws-line p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`bulk-${item.row.id}`}
                      checked={item.take}
                      disabled={!item.replacement}
                      onCheckedChange={(v) =>
                        setBulkItems((prev) => prev && prev.map((p, i) => (i === index ? { ...p, take: v === true } : p)))
                      }
                      className="mt-1"
                    />
                    <Label htmlFor={`bulk-${item.row.id}`} className="block min-w-0 flex-1 cursor-pointer space-y-1.5 py-1">
                      <span className="block text-xs text-ws-faint">Position {item.row.position}</span>
                      <span className={cn('block text-sm', item.row.available ? 'text-ws-muted line-through' : 'text-ws-red')}>
                        {item.row.available ? shorten(item.row.text ?? '', 120) : 'Frage nicht mehr verfügbar'}
                      </span>
                      {item.replacement ? (
                        <span className="block text-sm text-ws-text">
                          → {shorten(item.replacement.text, 160)}{' '}
                          <span className="text-xs text-ws-muted">
                            ({LEVEL_LABEL[item.replacement.level]}
                            {item.replacement.rated && item.replacement.correctRate !== null ? `, ${item.replacement.correctRate} % richtig` : ''})
                          </span>
                        </span>
                      ) : (
                        <span className="block text-sm text-ws-orange">Kein Ersatz vorhanden – bleibt unverändert.</span>
                      )}
                    </Label>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={working}>Abbrechen</Button>
            <Button
              onClick={applyBulk}
              disabled={working || bulkTakeCount === 0}
              className="rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {working && <Loader2 className="mr-2 size-4 animate-spin" />}
              Übernehmen ({bulkTakeCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
