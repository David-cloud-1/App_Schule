'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Dices, FileUp, Loader2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LEVELS,
  MAX_COUNT,
  MIN_COUNT,
  MIX_PRESETS,
  mixSum,
  summarize,
  type Candidate,
  type Level,
  type Mix,
  type Shortage,
} from '@/lib/assessment-suggest'
import type { PickerQuestion } from './question-picker'
import { AssessmentSuggestPreview, LEVEL_LABEL, type SwapState } from './assessment-suggest-preview'

const TRIGGER = 'bg-ws-bg border-ws-line text-ws-text rounded-xl min-h-11'
const CONTENT = 'bg-ws-surface border-ws-line text-ws-text'
const ENDPOINT = '/api/admin/assessments/suggest'

type PresetKey = keyof typeof MIX_PRESETS | 'eigen'
const PRESET_LABEL: Record<PresetKey, string> = {
  ausgewogen: 'Ausgewogen (30 / 50 / 20)',
  leichter: 'Eher leicht (50 / 40 / 10)',
  schwerer: 'Eher schwer (10 / 40 / 50)',
  eigen: 'Eigene Verteilung',
}
const PLURAL: Record<Level, string> = { leicht: 'leichte', mittel: 'mittlere', schwer: 'schwere' }

interface Result {
  items: Candidate[]
  shortages: Shortage[]
  emptyTopics: string[]
  poolSize: number
  statsAvailable: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
  /** Alle wählbaren Fragen — daraus entstehen die Auswahlmöglichkeiten für Fach, Thema und Klasse */
  questions: PickerQuestion[]
  selectedIds: Set<string>
  /** Übernimmt die Fragen in die Auswahl; `add` ergänzt, `replace` ersetzt */
  onApply: (ids: string[], mode: 'add' | 'replace') => void
  /** Leerzustand: führt zum Fragen-Import */
  onOpenImport?: () => void
}

/** Mehrfachauswahl als Liste mit Häkchen in einem Popover */
function MultiPick({
  label,
  options,
  value,
  onChange,
  emptyText,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  emptyText: string
}) {
  const summary = value.length === 0 ? 'Alle' : value.length <= 2 ? value.join(', ') : `${value.length} gewählt`
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-ws-muted">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-between rounded-xl border-ws-line bg-ws-bg font-normal text-ws-text"
            aria-label={`${label}: ${summary}`}
          >
            <span className="truncate">{summary}</span>
            <ChevronDown className="size-4 shrink-0 text-ws-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 border-ws-line bg-ws-surface p-2 text-ws-text" align="start">
          {options.length === 0 ? (
            <p className="p-2 text-sm text-ws-muted">{emptyText}</p>
          ) : (
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {value.length > 0 && (
                <button type="button" className="min-h-11 w-full px-2 text-left text-sm text-ws-blue hover:underline" onClick={() => onChange([])}>
                  Auswahl aufheben (alle)
                </button>
              )}
              {options.map((o) => (
                <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-ws-raised">
                  <Checkbox
                    checked={value.includes(o)}
                    onCheckedChange={(c) => onChange(c === true ? [...value, o] : value.filter((x) => x !== o))}
                  />
                  <span className="text-sm">{o}</span>
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * Nachweis-Vorschlag (PROJ-78): Angaben machen, Vorschlag prüfen, übernehmen.
 * Der Vorschlag lebt nur in diesem Dialog; erst „Übernehmen“ ändert die Auswahl.
 */
export function AssessmentSuggestDialog({ open, onOpenChange, departmentId, questions, selectedIds, onApply, onOpenImport }: Props) {
  // --- Angaben ---
  const [subjects, setSubjects] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [classLevel, setClassLevel] = useState('all')
  const [countText, setCountText] = useState('20')
  const [preset, setPreset] = useState<PresetKey>('ausgewogen')
  const [custom, setCustom] = useState<Mix>({ ...MIX_PRESETS.ausgewogen })
  const [exBlocked, setExBlocked] = useState(true)
  const [exReported, setExReported] = useState(true)
  const [recent, setRecent] = useState<'0' | '1' | '3' | '5'>('3')
  const [addMode, setAddMode] = useState(selectedIds.size > 0)

  // --- Vorschlag ---
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [result, setResult] = useState<Result | null>(null)
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [swap, setSwap] = useState<SwapState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Beim Öffnen: gibt es schon eine Auswahl, wird standardmäßig ergänzt statt ersetzt
  useEffect(() => {
    if (open) setAddMode(selectedIds.size > 0)
    // nur beim Öffnen neu vorbelegen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const subjectOptions = useMemo(
    () => [...new Set(questions.flatMap((q) => q.subject_codes))].sort((a, b) => a.localeCompare(b, 'de')),
    [questions],
  )
  const classOptions = useMemo(
    () => [...new Set(questions.map((q) => q.class_level).filter((l): l is number => l != null))].sort((a, b) => a - b),
    [questions],
  )
  const topicOptions = useMemo(() => {
    const names = questions
      .filter((q) => subjects.length === 0 || q.subject_codes.some((c) => subjects.includes(c)))
      .filter((q) => classLevel === 'all' || String(q.class_level ?? '') === classLevel)
      .map((q) => q.topic)
      .filter((n): n is string => !!n)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'de'))
  }, [questions, subjects, classLevel])

  const count = /^\d+$/.test(countText.trim()) ? Number(countText.trim()) : NaN
  const countValid = Number.isInteger(count) && count >= MIN_COUNT && count <= MAX_COUNT
  const mix: Mix = preset === 'eigen' ? custom : { ...MIX_PRESETS[preset] }
  const sum = mixSum(mix)
  const mixValid = sum === 100
  const canCreate = countValid && mixValid && !busy

  function setCustomValue(level: Level, value: number) {
    setPreset('eigen')
    setCustom({ ...mix, [level]: value })
  }

  function criteria() {
    return {
      departmentId,
      subjects,
      // nur Themen, die nach Fach/Klasse noch wählbar sind
      topics: topics.filter((t) => topicOptions.includes(t)),
      classLevel: classLevel === 'all' ? null : Number(classLevel),
      exclude: { blocked: exBlocked, reported: exReported, recent: Number(recent) as 0 | 1 | 3 | 5 },
      alreadyChosenIds: addMode ? [...selectedIds] : [],
    }
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
    return data
  }

  /** Neuer Vorschlag; Fixierte bleiben, bisherige Vorschläge werden gemieden */
  async function generate(keep: Set<string>, previous: Candidate[]) {
    setBusy(true)
    setError(null)
    setSwap(null)
    try {
      const data = await post({
        action: 'suggest',
        ...criteria(),
        count,
        mix,
        keepIds: [...keep],
        preferNotIds: previous.map((q) => q.id).filter((id) => !keep.has(id)),
      })
      setResult({
        items: data.items,
        shortages: data.shortages,
        emptyTopics: data.emptyTopics,
        poolSize: data.poolSize,
        statsAvailable: data.statsAvailable,
      })
      setLocked(new Set([...keep].filter((id) => (data.items as Candidate[]).some((q) => q.id === id))))
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Das hat nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  async function openSwap(id: string) {
    if (!result) return
    setSwap({ forId: id, alternatives: null })
    try {
      const data = await post({
        action: 'alternatives',
        ...criteria(),
        questionId: id,
        excludeIds: result.items.map((q) => q.id),
      })
      setSwap((cur) => (cur?.forId === id ? { forId: id, alternatives: data.alternatives } : cur))
    } catch (e) {
      setSwap(null)
      toast.error(e instanceof Error ? e.message : 'Alternativen konnten nicht geladen werden.')
    }
  }

  function pickAlternative(forId: string, alt: Candidate) {
    if (!result) return
    setResult({ ...result, items: result.items.map((q) => (q.id === forId ? alt : q)) })
    setLocked((cur) => {
      const next = new Set(cur)
      next.delete(forId)
      return next
    })
    setSwap(null)
  }

  function removeItem(id: string) {
    if (!result) return
    setResult({ ...result, items: result.items.filter((q) => q.id !== id) })
    setLocked((cur) => {
      const next = new Set(cur)
      next.delete(id)
      return next
    })
    setSwap((cur) => (cur?.forId === id ? null : cur))
  }

  function toggleLock(id: string) {
    setLocked((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function apply() {
    if (!result || result.items.length === 0) return
    onApply(result.items.map((q) => q.id), addMode ? 'add' : 'replace')
    toast.success(`${result.items.length} ${result.items.length === 1 ? 'Frage' : 'Fragen'} übernommen`)
    handleOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (busy) return
    if (!next) {
      setStep('form')
      setResult(null)
      setLocked(new Set())
      setSwap(null)
      setError(null)
    }
    onOpenChange(next)
  }

  const summary = result ? summarize(result.items) : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vorschlag erstellen</DialogTitle>
          <DialogDescription className="text-ws-muted">
            {step === 'form'
              ? 'Sag, wie viele Fragen und wie schwer – du bekommst einen Entwurf, den du danach frei ändern kannst.'
              : 'Prüfe den Vorschlag. Fixierte Fragen bleiben beim Neu-Würfeln erhalten.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MultiPick label="Fach" options={subjectOptions} value={subjects} onChange={setSubjects} emptyText="Keine Fächer vorhanden." />
              <MultiPick
                label="Thema (optional)"
                options={topicOptions}
                value={topics.filter((t) => topicOptions.includes(t))}
                onChange={setTopics}
                emptyText="Keine Themen zu dieser Auswahl."
              />
              <div className="space-y-1.5">
                <Label htmlFor="suggest-class" className="text-sm text-ws-muted">Klassenstufe</Label>
                <Select value={classLevel} onValueChange={setClassLevel}>
                  <SelectTrigger id="suggest-class" className={TRIGGER}><SelectValue /></SelectTrigger>
                  <SelectContent className={CONTENT}>
                    <SelectItem value="all">Alle</SelectItem>
                    {classOptions.map((l) => <SelectItem key={l} value={String(l)}>Klasse {l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="suggest-count" className="text-sm text-ws-muted">Anzahl Fragen ({MIN_COUNT}–{MAX_COUNT})</Label>
                <Input
                  id="suggest-count"
                  inputMode="numeric"
                  value={countText}
                  onChange={(e) => setCountText(e.target.value)}
                  aria-invalid={!countValid}
                  className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                />
                {!countValid && <p className="text-xs text-ws-red">Bitte eine ganze Zahl von {MIN_COUNT} bis {MAX_COUNT}.</p>}
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm text-ws-muted">Schwierigkeitsmix (leicht / mittel / schwer)</legend>
              <Select value={preset} onValueChange={(v) => { setPreset(v as PresetKey); if (v !== 'eigen') setCustom({ ...MIX_PRESETS[v as keyof typeof MIX_PRESETS] }) }}>
                <SelectTrigger className={TRIGGER} aria-label="Schwierigkeitsmix"><SelectValue /></SelectTrigger>
                <SelectContent className={CONTENT}>
                  {(Object.keys(PRESET_LABEL) as PresetKey[]).map((k) => <SelectItem key={k} value={k}>{PRESET_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
              {preset === 'eigen' && (
                <div className="space-y-1 rounded-xl bg-ws-bg p-3">
                  {LEVELS.map((l) => (
                    <div key={l} className="flex min-h-11 items-center gap-3">
                      <Label htmlFor={`mix-${l}`} className="w-16 text-sm">{LEVEL_LABEL[l]}</Label>
                      <input
                        id={`mix-${l}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={mix[l]}
                        onChange={(e) => setCustomValue(l, Number(e.target.value))}
                        className="h-11 min-w-0 flex-1 accent-ws-green"
                      />
                      <span className="w-12 text-right text-sm tabular-nums">{mix[l]} %</span>
                    </div>
                  ))}
                  <p className={`text-xs ${mixValid ? 'text-ws-muted' : 'text-ws-orange'}`} role="status">
                    {mixValid ? 'Summe: 100 %' : sum < 100 ? `Noch ${100 - sum} % zu verteilen.` : `${sum - 100} % zu viel.`}
                  </p>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-0.5">
              <legend className="mb-1 text-sm text-ws-muted">Nicht vorschlagen</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={exBlocked} onCheckedChange={(c) => setExBlocked(c === true)} />
                Gesperrte Fragen
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={exReported} onCheckedChange={(c) => setExReported(c === true)} />
                Fragen mit offener Meldung
              </label>
              <div className="flex min-h-11 flex-wrap items-center gap-3 text-sm">
                <Label htmlFor="suggest-recent" className="font-normal">Fragen aus meinen letzten Nachweisen:</Label>
                <Select value={recent} onValueChange={(v) => setRecent(v as typeof recent)}>
                  <SelectTrigger id="suggest-recent" className={`${TRIGGER} w-44`}><SelectValue /></SelectTrigger>
                  <SelectContent className={CONTENT}>
                    <SelectItem value="0">nicht ausschließen</SelectItem>
                    <SelectItem value="1">letzter Nachweis</SelectItem>
                    <SelectItem value="3">letzte 3 Nachweise</SelectItem>
                    <SelectItem value="5">letzte 5 Nachweise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {selectedIds.size > 0 && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-ws-bg px-3 text-sm">
                <Checkbox checked={addMode} onCheckedChange={(c) => setAddMode(c === true)} />
                <span>
                  Zu meiner Auswahl hinzufügen ({selectedIds.size} {selectedIds.size === 1 ? 'Frage' : 'Fragen'} bleiben)
                  <span className="block text-xs text-ws-muted">Ohne Häkchen wird die bisherige Auswahl ersetzt.</span>
                </span>
              </label>
            )}

            {error && <p className="text-sm text-ws-red" role="alert">{error}</p>}
          </div>
        )}

        {step === 'preview' && result && summary && (
          <div className="space-y-4">
            {result.items.length === 0 ? (
              <div className="rounded-xl border border-ws-line bg-ws-bg p-5 text-center">
                <p className="text-sm text-ws-text">
                  {result.poolSize === 0
                    ? 'Zu diesen Angaben gibt es keine passenden Fragen.'
                    : 'Der Vorschlag ist leer – es fehlen Fragen in den gewünschten Schwierigkeitsstufen.'}
                </p>
                <p className="mt-1 text-xs text-ws-muted">Ändere die Angaben oder hole Fragen aus einem Aufgabenblatt.</p>
                {onOpenImport && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 rounded-xl border-ws-line"
                    onClick={() => { handleOpenChange(false); onOpenImport() }}
                  >
                    <FileUp className="mr-1.5 size-4" /> Fragen aus Aufgabenblatt erzeugen
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-ws-bg p-3 text-sm" role="status">
                  <p className="font-medium text-ws-text">
                    {result.items.length} {result.items.length === 1 ? 'Frage' : 'Fragen'} · etwa {summary.minutes} Min.
                  </p>
                  <p className="mt-1 text-ws-muted">
                    {LEVELS.map((l) => `${summary.perLevel[l]} ${PLURAL[l]}`).join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-ws-muted">
                    {summary.perTopic.map((t) => `${t.topic}: ${t.count}`).join(' · ')}
                  </p>
                </div>
                <AssessmentSuggestPreview
                  items={result.items}
                  locked={locked}
                  swap={swap}
                  busy={busy}
                  onToggleLock={toggleLock}
                  onRemove={removeItem}
                  onOpenSwap={openSwap}
                  onCloseSwap={() => setSwap(null)}
                  onPickAlternative={pickAlternative}
                />
              </>
            )}

            {(result.shortages.length > 0 || result.emptyTopics.length > 0 || summary.unrated > 0 || !result.statsAvailable) && (
              <ul className="space-y-1 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange" aria-label="Hinweise">
                {result.shortages.map((s) => (
                  <li key={s.level}>
                    Zu wenige {PLURAL[s.level]} Fragen: es {s.missing === 1 ? 'fehlt' : 'fehlen'} {s.missing}. Ändere den Mix, wenn du mehr haben möchtest.
                  </li>
                ))}
                {result.emptyTopics.map((t) => <li key={t}>Zum Thema „{t}“ gibt es keine passenden Fragen.</li>)}
                {!result.statsAvailable && <li>Die Lösungsquoten sind gerade nicht verfügbar – alle Fragen gelten als mittel.</li>}
                {result.statsAvailable && summary.unrated > 0 && (
                  <li>
                    {summary.unrated} {summary.unrated === 1 ? 'Frage hat' : 'Fragen haben'} noch zu wenige Antworten (unter 20) und {summary.unrated === 1 ? 'gilt' : 'gelten'} als mittel.
                  </li>
                )}
              </ul>
            )}
            {error && <p className="text-sm text-ws-red" role="alert">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'form' ? (
            <>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={busy}>
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => generate(new Set(), [])}
                disabled={!canCreate}
                className="min-h-11 rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
              >
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                Vorschlag erstellen
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => { setStep('form'); setSwap(null) }} disabled={busy}>
                Angaben ändern
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => result && generate(locked, result.items)}
                disabled={!canCreate}
                className="min-h-11 rounded-xl border-ws-line"
              >
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Dices className="mr-2 size-4" />}
                Neu würfeln
              </Button>
              <Button
                type="button"
                onClick={apply}
                disabled={busy || !result || result.items.length === 0}
                className="min-h-11 rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
              >
                Übernehmen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
