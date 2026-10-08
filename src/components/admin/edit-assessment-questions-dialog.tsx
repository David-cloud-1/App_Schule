'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AssessmentQuestionSelector } from './assessment-question-selector'

const MIN_QUESTIONS = 5

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentId: string
  part: number
  initialQuestionIds: string[]
  onSaved: () => void
}

/** Fragenauswahl eines Entwurfs ändern — nach dem Öffnen des Nachweises nicht mehr möglich */
export function EditAssessmentQuestionsDialog({ open, onOpenChange, assessmentId, part, initialQuestionIds, onSaved }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setSelectedIds(new Set(initialQuestionIds))
    // nur beim Öffnen neu vorbelegen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSave() {
    if (selectedIds.size < MIN_QUESTIONS) {
      toast.error(`Mindestens ${MIN_QUESTIONS} Fragen auswählen.`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [...selectedIds] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Fragen gespeichert')
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fragen bearbeiten</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Solange der Nachweis ein Entwurf ist, kannst du die Fragen ändern. Beim Öffnen werden sie festgeschrieben.
          </DialogDescription>
        </DialogHeader>
        {open && <AssessmentQuestionSelector part={part} selectedIds={selectedIds} onChange={setSelectedIds} />}
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
