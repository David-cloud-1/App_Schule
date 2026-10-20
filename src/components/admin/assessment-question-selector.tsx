'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QuestionPicker, type PickerQuestion } from './question-picker'
import { AssessmentImportDialog } from './assessment-import-dialog'

interface Props {
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  /** Wird nach jedem Laden der Fragenliste aufgerufen (z. B. um übersprungene Set-Fragen zu zählen) */
  onLoaded?: (questions: PickerQuestion[]) => void
}

/**
 * Lädt die wählbaren Fragen eines Prüfungsteils (aktiv, Multiple-Choice, eigener
 * Fachbereich) und zeigt die Fragenauswahl samt Datei-Import.
 */
export function AssessmentQuestionSelector({ selectedIds, onChange, onLoaded }: Props) {
  const [questions, setQuestions] = useState<PickerQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Antworten eines früheren Ladevorgangs (Unmount) werden verworfen
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/admin/assessments/questions')
      if (requestId !== requestRef.current) return
      if (!res.ok) {
        setFailed(true)
        return
      }
      const data = await res.json()
      if (requestId !== requestRef.current) return
      const list: PickerQuestion[] = data.questions ?? []
      setQuestions(list)
      onLoaded?.(list)
    } catch {
      if (requestId === requestRef.current) setFailed(true)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
    // onLoaded bewusst nicht als Abhängigkeit: es soll nur einmal laden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
    // Unmount: laufende Anfrage entwerten
    return () => {
      // Zähler, kein DOM-Knoten: der aktuelle Wert beim Unmount ist gewollt
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestRef.current++
    }
  }, [load])

  function handleImported(imported: PickerQuestion[]) {
    setQuestions((prev) => [...imported, ...prev])
    const next = new Set(selectedIds)
    imported.forEach((q) => next.add(q.id))
    onChange(next)
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-[#4B5563] bg-[#111827] p-4 text-center">
        <p className="text-sm text-[#9CA3AF]">Fragen konnten nicht geladen werden.</p>
        <Button type="button" variant="outline" size="sm" onClick={load} className="mt-3 rounded-xl border-[#4B5563] text-[#9CA3AF]">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <QuestionPicker questions={questions} selectedIds={selectedIds} onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        className="min-h-11 rounded-xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]"
      >
        <FileUp size={14} className="mr-1.5" />
        Fragen aus Aufgabenblatt erzeugen
      </Button>
      <AssessmentImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleImported} />
    </div>
  )
}
