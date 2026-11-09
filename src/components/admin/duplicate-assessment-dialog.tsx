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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { baseTitle, MAX_TITLE_LENGTH } from '@/lib/assessment-copy-title'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentId: string
  assessmentTitle: string
  /** Wird mit der Kennung der Kopie aufgerufen (Aufrufer springt in den Entwurf) */
  onDuplicated: (newId: string) => void
}

/** PROJ-79: Nachweis duplizieren — der Titel ist vorbelegt und änderbar, alles Weitere macht der Server. */
export function DuplicateAssessmentDialog({ open, onOpenChange, assessmentId, assessmentTitle, onDuplicated }: Props) {
  // Leer lassen = der Server vergibt „<Titel> (Kopie)“ bzw. zählt hoch
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setTitle('')
  }, [open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(title.trim() ? { title: title.trim() } : {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Duplizieren fehlgeschlagen')
        return
      }
      toast.success('Kopie als Entwurf angelegt')
      onOpenChange(false)
      onDuplicated(data.id as string)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nachweis duplizieren</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Aus „{assessmentTitle}“ entsteht ein neuer Entwurf mit denselben Fragen, Dauer, Notenschlüssel und
              Einstellungen. Teilnehmer und Ergebnisse kommen nicht mit; der Beitrittscode ist neu. Das Zeitfenster
              bitte im Entwurf anpassen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="copy-title">Titel der Kopie (optional)</Label>
            <Input
              id="copy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={`${baseTitle(assessmentTitle)} (Kopie)`}
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg"
              autoComplete="off"
            />
            <p className="text-xs text-ws-muted">Ohne Eingabe wird „(Kopie)“ angehängt und bei Bedarf hochgezählt.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Kopie anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
