'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronDown, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { FachThemaSelect, type TopicOption } from '@/components/admin/fach-thema-select'
import { IntakeLayout } from '@/components/admin/intake-layout'
import { IntakePreview } from '@/components/admin/intake-preview'
import { INTAKE_COUNTS, MAX_ANSWER_CHARS, type IntakeCount } from '@/lib/question-intake'
import { MATERIAL_MAX_BYTES } from '@/lib/assessment-import'
import type { IntakeMaterialResponse } from '@/app/api/admin/questions/intake/material/route'
import type { IntakePromptResponse } from '@/app/api/admin/questions/intake/prompt/route'
import type { IntakePreviewResponse } from '@/app/api/admin/questions/intake/preview/route'

export const MATERIAL_STEPS = ['Material wählen', 'Mit deiner KI', 'Vorschau'] as const
const FILE_TYPES = '.pdf,.docx,.doc,.pptx'
const FILE_ENDINGS = /\.(pdf|docx?|pptx)$/i
const COUNT_OPTIONS = INTAKE_COUNTS.map((n) => ({ value: String(n), label: String(n) }))

type FileState =
  | { status: 'none' }
  | { status: 'reading'; name: string }
  | { status: 'ready'; name: string; parts: string[]; chars: number }
  | { status: 'error'; name: string; message: string }

/** Prüft die Datei, bevor etwas hochgeladen wird (falsche Art, zu groß) */
export function checkMaterialFile(file: { name: string; size: number }): string | null {
  if (!FILE_ENDINGS.test(file.name)) return 'Diese Dateiart geht nicht. Erlaubt sind PDF, Word (.docx) und PowerPoint (.pptx).'
  if (file.size > MATERIAL_MAX_BYTES) return 'Die Datei ist größer als 4 MB. Nimm eine kleinere Datei oder teile sie auf.'
  if (file.size === 0) return 'Die Datei ist leer.'
  return null
}

export function IntakeMaterialFlow({
  topicOptions,
  topicsLoading,
  topicsFailed,
  onRetryTopics,
  initialTopicId,
  onBack,
  onDone,
  onDirtyChange,
}: {
  topicOptions: TopicOption[]
  topicsLoading: boolean
  topicsFailed: boolean
  onRetryTopics: () => void
  initialTopicId: string | null
  onBack: () => void
  onDone: (result: { count: number; topicIds: string[] }) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [topicId, setTopicId] = useState(initialTopicId ?? '')
  const [count, setCount] = useState<IntakeCount>(10)
  const [file, setFile] = useState<FileState>({ status: 'none' })
  const [fileName, setFileName] = useState('')
  const [partIndex, setPartIndex] = useState(0)
  const [prompts, setPrompts] = useState<Record<number, IntakePromptResponse>>({})
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ response: IntakePreviewResponse; targetGroup: string } | null>(null)
  const [topicError, setTopicError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)

  const topic = topicOptions.find((t) => t.id === topicId) ?? null
  const parts = file.status === 'ready' ? file.parts : []
  const level = topic && topic.classLevels.length === 1 ? topic.classLevels[0] : null

  function changeStepDirty(next: 0 | 1 | 2) {
    setStep(next)
    // Eine eingefügte Antwort der KI bleibt beim Zurückgehen erhalten – dann bleibt auch die Rückfrage beim Schließen
    onDirtyChange(next > 0 || Object.values(answers).some((a) => a.trim() !== ''))
  }

  async function pickFile(selected: File | undefined) {
    if (!selected) return
    const problem = checkMaterialFile(selected)
    if (problem) {
      setFile({ status: 'error', name: selected.name, message: problem })
      return
    }
    setFile({ status: 'reading', name: selected.name })
    const mine = ++requestRef.current
    try {
      const form = new FormData()
      form.set('file', selected)
      const res = await fetch('/api/admin/questions/intake/material', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as Partial<IntakeMaterialResponse> & { error?: string }
      if (mine !== requestRef.current) return
      if (!res.ok || !data.parts) {
        setFile({ status: 'error', name: selected.name, message: data.error ?? 'Die Datei konnte nicht gelesen werden.' })
        return
      }
      setFileName(selected.name)
      setFile({ status: 'ready', name: selected.name, parts: data.parts, chars: data.chars ?? 0 })
      setPrompts({})
      setAnswers({})
      setPartIndex(0)
    } catch {
      if (mine === requestRef.current) setFile({ status: 'error', name: selected.name, message: 'Keine Verbindung. Bitte versuche es noch einmal.' })
    }
  }

  async function loadPrompt(index: number) {
    if (prompts[index]) return
    setPromptLoading(true)
    setPromptError(null)
    try {
      const res = await fetch('/api/admin/questions/intake/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          class_level: level,
          count,
          text: parts[index],
          part: parts.length > 1 ? { index: index + 1, total: parts.length } : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPromptError(data?.error ?? 'Der Auftrag konnte nicht erstellt werden.')
        return
      }
      setPrompts((p) => ({ ...p, [index]: data as IntakePromptResponse }))
    } catch {
      setPromptError('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setPromptLoading(false)
    }
  }

  function goNext() {
    if (!topicId) {
      setTopicError('Bitte wähle ein Thema. So finden Azubis die Frage im richtigen Lernpfad.')
      return
    }
    setTopicError(undefined)
    changeStepDirty(1)
    void loadPrompt(partIndex)
  }

  function changePart(index: number) {
    setPartIndex(index)
    void loadPrompt(index)
  }

  async function copyPrompt() {
    const current = prompts[partIndex]
    if (!current) return
    try {
      await navigator.clipboard.writeText(current.prompt)
      toast.success('Kopiert')
    } catch {
      toast.error('Das Kopieren hat nicht geklappt. Öffne „Auftrag ansehen“ und kopiere den Text von Hand.')
    }
  }

  async function showPreview() {
    setChecking(true)
    setCheckError(null)
    const filled = Object.entries(answers).filter(([, text]) => text.trim() !== '')
    try {
      const results = await Promise.all(
        filled.map(async ([, text]) => {
          const res = await fetch('/api/admin/questions/intake/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic_id: topicId, answer: text.slice(0, MAX_ANSWER_CHARS), requested: count }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error ?? 'Die Vorschau konnte nicht erstellt werden.')
          return data as IntakePreviewResponse
        }),
      )
      const merged: IntakePreviewResponse = {
        items: results.flatMap((r) => r.items),
        skipped: results.flatMap((r) => r.skipped),
        truncated: results.some((r) => r.truncated),
        requested: count * results.length,
        topic: results[0]?.topic ?? null,
      }
      setPreview({ response: merged, targetGroup: Object.values(prompts)[0]?.targetGroup ?? 'Auszubildende' })
      changeStepDirty(2)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Die Vorschau konnte nicht erstellt werden.')
    } finally {
      setChecking(false)
    }
  }

  if (step === 2 && preview) {
    return (
      <IntakePreview
        response={preview.response}
        source="material"
        fileName={fileName}
        steps={MATERIAL_STEPS}
        current={2}
        classLevels={preview.response.topic?.class_levels ?? []}
        targetGroup={preview.targetGroup}
        onBack={() => changeStepDirty(1)}
        onAccepted={({ count: n, topicIds }) => onDone({ count: n, topicIds })}
      />
    )
  }

  if (step === 1) {
    const current = prompts[partIndex]
    const answered = Object.values(answers).some((a) => a.trim() !== '')
    return (
      <IntakeLayout
        title="Mit deiner KI"
        description="Du brauchst dafür nur deine eigene KI. Es entstehen keine Kosten."
        steps={MATERIAL_STEPS}
        current={1}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => changeStepDirty(0)} className="min-h-11">
              Zurück
            </Button>
            <Button
              type="button"
              onClick={showPreview}
              disabled={!answered || checking}
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {checking && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Vorschau ansehen
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {parts.length > 1 && (
            <div className="space-y-2">
              <Label>Dein Skript ist lang. Es hat {parts.length} Teile, jeder Teil bekommt einen eigenen Auftrag.</Label>
              <div>
                {parts.length <= 4 ? (
                  <AdminSegmented
                    value={String(partIndex)}
                    onChange={(v) => changePart(Number(v))}
                    options={parts.map((_, i) => ({ value: String(i), label: `Teil ${i + 1}` }))}
                    ariaLabel="Teil des Skripts"
                  />
                ) : (
                  <Select value={String(partIndex)} onValueChange={(v) => v && changePart(Number(v))}>
                    <SelectTrigger className="min-h-11 max-w-xs border-ws-line bg-ws-bg text-ws-text" aria-label="Teil des Skripts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
                      {parts.map((_, i) => (
                        <SelectItem key={i} value={String(i)} className="min-h-11">
                          Teil {i + 1} von {parts.length}
                          {answers[i]?.trim() ? ' ✓' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <ol className="space-y-6">
            <li className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ws-text">
                <span className="flex size-6 items-center justify-center rounded-full bg-ws-green/15 text-xs text-ws-green">1</span>
                Auftrag kopieren
              </h3>
              <Button type="button" onClick={copyPrompt} disabled={!current || promptLoading} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                {promptLoading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Auftrag kopieren
              </Button>
              {promptError && (
                <p role="alert" className="text-sm text-ws-red">
                  {promptError}{' '}
                  <button type="button" onClick={() => loadPrompt(partIndex)} className="min-h-11 underline underline-offset-2">
                    Erneut versuchen
                  </button>
                </p>
              )}
              {current?.tooLong && (
                <p className="text-sm text-ws-orange">Dieser Auftrag ist sehr lang. Manche KI-Programme nehmen ihn nicht ganz an. Dann wähle eine kleinere Datei.</p>
              )}
              {current && (
                <Collapsible>
                  <CollapsibleTrigger className="group flex min-h-11 items-center gap-1 text-sm text-ws-blue underline underline-offset-2">
                    Auftrag ansehen
                    <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="mt-1 max-w-prose text-xs text-ws-muted">
                      Diesen Text liest nur deine KI. Am Ende steht, in welcher Form sie antworten soll. Du musst nichts daran ändern.
                    </p>
                    <Textarea
                      readOnly
                      value={current.prompt}
                      rows={8}
                      aria-label="Auftrag für die KI"
                      className="mt-1 max-h-64 border-ws-line bg-ws-bg text-xs text-ws-muted"
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </li>
            <li className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ws-text">
                <span className="flex size-6 items-center justify-center rounded-full bg-ws-green/15 text-xs text-ws-green">2</span>
                In deiner KI einfügen
              </h3>
              <p className="max-w-prose text-sm text-ws-muted">Zum Beispiel ChatGPT, Claude.ai oder die KI deiner Schule, kostenlos mit deinem eigenen Zugang.</p>
            </li>
            <li className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ws-text">
                <span className="flex size-6 items-center justify-center rounded-full bg-ws-green/15 text-xs text-ws-green">3</span>
                Antwort hier einfügen
              </h3>
              <Label htmlFor="intake-answer">Antwort der KI{parts.length > 1 ? ` (Teil ${partIndex + 1})` : ''}</Label>
              <Textarea
                id="intake-answer"
                rows={8}
                value={answers[partIndex] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [partIndex]: e.target.value }))}
                placeholder="Kopiere die ganze Antwort der KI und füge sie hier ein."
                className="border-ws-line bg-ws-bg text-ws-text"
              />
              {checkError && (
                <p role="alert" className="text-sm text-ws-red">
                  {checkError}
                </p>
              )}
            </li>
          </ol>
        </div>
      </IntakeLayout>
    )
  }

  return (
    <IntakeLayout
      title="Aus Material erstellen"
      description="Lade dein Skript hoch. Deine KI schreibt Vorschläge, du prüfst sie vor dem Übernehmen."
      steps={MATERIAL_STEPS}
      current={0}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack} className="min-h-11">
            Zurück
          </Button>
          <Button
            type="button"
            onClick={goNext}
            disabled={file.status !== 'ready' || topicsLoading}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            Weiter
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FachThemaSelect
          id="material-topic"
          label="In welches Thema?"
          value={topicId}
          onChange={(v) => {
            setTopicId(v)
            setTopicError(undefined)
            setPrompts({})
          }}
          options={topicOptions}
          loading={topicsLoading}
          failed={topicsFailed}
          onRetry={onRetryTopics}
          error={topicError}
        />

        <div className="space-y-2">
          <Label htmlFor="material-file">Skript (PDF, Word oder PowerPoint)</Label>
          <input
            ref={inputRef}
            id="material-file"
            type="file"
            accept={FILE_TYPES}
            onChange={(e) => {
              void pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
            className="sr-only"
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="min-h-11 w-full justify-start rounded-xl border-dashed">
            <FileText className="mr-2 size-4" aria-hidden />
            {file.status === 'none' ? 'Datei auswählen' : 'Andere Datei auswählen'}
          </Button>
          <div aria-live="polite" className="min-h-6 text-sm">
            {file.status === 'reading' && (
              <p className="flex items-center gap-2 text-ws-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {file.name} wird gelesen …
              </p>
            )}
            {file.status === 'ready' && (
              <p className="flex items-center gap-2 text-ws-text">
                <Check className="size-4 text-ws-green" aria-hidden />
                <span className="min-w-0 truncate" title={file.name}>{file.name}</span>
              </p>
            )}
            {file.status === 'error' && (
              <p role="alert" className="text-ws-red">
                {file.message}
              </p>
            )}
          </div>
          {file.status === 'ready' && file.parts.length > 1 && (
            <p className="rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm text-ws-text">
              Dein Skript ist lang. Wir teilen es in {file.parts.length} Teile. Du kopierst nacheinander {file.parts.length} Aufträge.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Wie viele Vorschläge?{parts.length > 1 ? ' (je Teil)' : ''}</Label>
          <div>
            <AdminSegmented value={String(count)} onChange={(v) => {
                setCount(Number(v) as IntakeCount)
                // Der Auftrag nennt die Zahl: neu bauen lassen
                setPrompts({})
              }} options={COUNT_OPTIONS} ariaLabel="Wie viele Vorschläge" />
          </div>
        </div>
      </div>
    </IntakeLayout>
  )
}

