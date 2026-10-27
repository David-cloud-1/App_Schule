'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { QuestionPicker, type PickerQuestion } from './question-picker'
import { AssessmentImportDialog } from './assessment-import-dialog'
import { EditPrivateQuestionDialog } from './edit-private-question-dialog'

interface Props {
  /** Zielbereich des Nachweises — die Fragenauswahl zeigt dessen Pool + eigene private Fragen (PROJ-46) */
  departmentId: string
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  /** Wird nach jedem Laden der Fragenliste aufgerufen (z. B. um übersprungene Set-Fragen zu zählen) */
  onLoaded?: (questions: PickerQuestion[]) => void
}

/**
 * Lädt die wählbaren Fragen eines Zielbereichs (aktiv, Multiple-Choice, Bereichs-Pool
 * + eigene private Nachweis-Fragen) und zeigt die Fragenauswahl samt Datei-Import.
 */
export function AssessmentQuestionSelector({ departmentId, selectedIds, onChange, onLoaded }: Props) {
  const [questions, setQuestions] = useState<PickerQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PickerQuestion | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Antworten eines früheren Ladevorgangs (Unmount/Bereichswechsel) werden verworfen
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/admin/assessments/questions?departmentId=${departmentId}`)
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
    // onLoaded bewusst nicht als Abhängigkeit: es soll nur beim Laden feuern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  useEffect(() => {
    load()
    // Unmount/Bereichswechsel: laufende Anfrage entwerten
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

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/assessments/questions/${deleting.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Löschen fehlgeschlagen')
        return
      }
      setQuestions((prev) => prev.filter((q) => q.id !== deleting.id))
      const next = new Set(selectedIds)
      next.delete(deleting.id)
      onChange(next)
      toast.success('Frage gelöscht')
      setDeleting(null)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeleteBusy(false)
    }
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
      <div className="rounded-xl border border-ws-line bg-ws-bg p-4 text-center">
        <p className="text-sm text-ws-muted">Fragen konnten nicht geladen werden.</p>
        <Button type="button" variant="outline" size="sm" onClick={load} className="mt-3 rounded-xl border-ws-line text-ws-muted">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <QuestionPicker
        questions={questions}
        selectedIds={selectedIds}
        onChange={onChange}
        onEditPrivate={(q) => setEditingId(q.id)}
        onDeletePrivate={setDeleting}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        className="min-h-11 rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
      >
        <FileUp size={14} className="mr-1.5" />
        Fragen aus Aufgabenblatt erzeugen
      </Button>
      <AssessmentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        departmentId={departmentId}
        onImported={handleImported}
      />
      <EditPrivateQuestionDialog questionId={editingId} onOpenChange={(o) => !o && setEditingId(null)} onSaved={load} />
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && !deleteBusy && setDeleting(null)}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Diese eigene Frage wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy} className="bg-ws-raised border-ws-line text-ws-text hover:bg-ws-line">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteBusy} className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
