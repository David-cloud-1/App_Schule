'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Check, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FachThemaSelect, type TopicOption } from '@/components/admin/fach-thema-select'
import { IntakeLayout } from '@/components/admin/intake-layout'
import { IntakePreview } from '@/components/admin/intake-preview'
import { MAX_INTAKE_QUESTIONS, TABLE_TEMPLATE } from '@/lib/question-intake'
import { useTargetDepartment } from '@/components/admin/target-department-field'
import { useClassLevelOptions } from '@/components/department-provider'
import type { IntakePreviewResponse } from '@/app/api/admin/questions/intake/preview/route'

export const TABLE_STEPS = ['Datei wählen', 'Vorschau'] as const
const MAX_TABLE_BYTES = 500 * 1024

type FileState =
  | { status: 'none' }
  | { status: 'ready'; name: string; rows: Record<string, string>[]; hasOwnTopic: boolean }
  | { status: 'error'; message: string }

/** Liest eine CSV-Datei im Browser; nichts wird hochgeladen, bis die Vorschau angefordert wird */
export function readTable(file: File): Promise<FileState> {
  return new Promise((resolve) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      resolve({ status: 'error', message: 'Bitte wähle eine CSV-Datei (zum Beispiel fragen.csv).' })
      return
    }
    if (file.size > MAX_TABLE_BYTES) {
      resolve({ status: 'error', message: 'Die Datei ist größer als 500 KB. Teile die Tabelle bitte auf.' })
      return
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).map((f) => f.replace(/^﻿/, '').trim().toLowerCase())
        if (result.data.length === 0) {
          resolve({ status: 'error', message: 'In der Tabelle stehen keine Fragen.' })
          return
        }
        if (result.data.length > MAX_INTAKE_QUESTIONS) {
          resolve({ status: 'error', message: `Die Tabelle hat mehr als ${MAX_INTAKE_QUESTIONS} Fragen. Teile sie bitte auf.` })
          return
        }
        resolve({ status: 'ready', name: file.name, rows: result.data, hasOwnTopic: fields.includes('thema') && fields.includes('fach_code') })
      },
      error: () => resolve({ status: 'error', message: 'Die Tabelle konnte nicht gelesen werden. Nimm die Beispiel-Tabelle als Vorlage.' }),
    })
  })
}

export function IntakeTableFlow({
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
  const [step, setStep] = useState<0 | 1>(0)
  const [topicId, setTopicId] = useState(initialTopicId ?? '')
  const [file, setFile] = useState<FileState>({ status: 'none' })
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [topicError, setTopicError] = useState<string | undefined>()
  const [preview, setPreview] = useState<IntakePreviewResponse | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const target = useTargetDepartment(true)
  const departmentLevels = useClassLevelOptions().map((o) => Number(o.value))

  function download() {
    const blob = new Blob([`﻿${TABLE_TEMPLATE}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beispiel-fragen.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function showPreview() {
    if (file.status !== 'ready') return
    if (!topicId && !file.hasOwnTopic) {
      setTopicError('Bitte wähle ein Thema. Die Tabelle nennt keins.')
      return
    }
    setTopicError(undefined)
    setChecking(true)
    setCheckError(null)
    try {
      const res = await fetch('/api/admin/questions/intake/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId || undefined, rows: file.rows, department_id: target.departmentId ?? undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCheckError(data?.error ?? 'Die Vorschau konnte nicht erstellt werden.')
        return
      }
      setPreview(data as IntakePreviewResponse)
      setStep(1)
      onDirtyChange(true)
    } catch {
      setCheckError('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setChecking(false)
    }
  }

  if (step === 1 && preview) {
    return (
      <IntakePreview
        response={preview}
        source="table"
        fileName={file.status === 'ready' ? file.name : undefined}
        steps={TABLE_STEPS}
        current={1}
        classLevels={preview.topic?.class_levels ?? departmentLevels}
        targetGroup="Auszubildende"
        onBack={() => {
          setStep(0)
          onDirtyChange(false)
        }}
        onAccepted={({ count, topicIds }) => onDone({ count, topicIds })}
      />
    )
  }

  return (
    <IntakeLayout
      title="Aus einer Tabelle übernehmen"
      description="Lies eine CSV-Datei mit vielen Fragen auf einmal ein. Du siehst vorher, welche Zeilen Fehler haben."
      steps={TABLE_STEPS}
      current={0}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack} className="min-h-11">
            Zurück
          </Button>
          <Button
            type="button"
            onClick={showPreview}
            disabled={file.status !== 'ready' || checking}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            {checking && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Weiter
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FachThemaSelect
          id="table-topic"
          label="In welches Thema?"
          value={topicId}
          onChange={(v) => {
            setTopicId(v)
            setTopicError(undefined)
          }}
          options={topicOptions}
          loading={topicsLoading}
          failed={topicsFailed}
          onRetry={onRetryTopics}
          error={topicError}
        />
        <p className="-mt-3 text-xs text-ws-muted">Nur nötig, wenn die Tabelle kein Thema nennt. Steht in einer Zeile ein Fach und ein Thema, gilt das.</p>

        <div className="space-y-2">
          <Label htmlFor="table-file">Tabelle (CSV)</Label>
          <p className="max-w-prose text-sm text-ws-muted">
            Jede Zeile ist eine Frage. Die Spalten sind der Fragetext, die Antworten A bis E, die richtige Antwort und freiwillig Erklärung, Schwierigkeit und Thema.
          </p>
          <input
            ref={inputRef}
            id="table-file"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const selected = e.target.files?.[0]
              e.target.value = ''
              if (!selected) return
              setFile(await readTable(selected))
              setCheckError(null)
            }}
            className="sr-only"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="min-h-11 rounded-xl border-dashed">
              <FileSpreadsheet className="mr-2 size-4" aria-hidden />
              {file.status === 'ready' ? 'Andere Datei auswählen' : 'Datei auswählen'}
            </Button>
            <button type="button" onClick={download} className="min-h-11 text-sm text-ws-blue underline underline-offset-2">
              Beispiel-Tabelle herunterladen
            </button>
          </div>
          <div aria-live="polite" className="min-h-6 text-sm">
            {file.status === 'ready' && (
              <p className="flex items-center gap-2 text-ws-text">
                <Check className="size-4 text-ws-green" aria-hidden />
                <span className="min-w-0 truncate" title={file.name}>
                  {file.name} · {file.rows.length} {file.rows.length === 1 ? 'Zeile' : 'Zeilen'}
                </span>
              </p>
            )}
            {file.status === 'error' && (
              <p role="alert" className="text-ws-red">
                {file.message}
              </p>
            )}
            {checkError && (
              <p role="alert" className="text-ws-red">
                {checkError}
              </p>
            )}
          </div>
        </div>
      </div>
    </IntakeLayout>
  )
}

