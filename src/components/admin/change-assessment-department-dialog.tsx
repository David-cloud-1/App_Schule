'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

type DepartmentOption = { id: string; name: string; code: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentId: string
  currentDepartmentId: string
  /** Name des aktuellen Zielbereichs — zeigt die Auswahl auch an, falls der Bereich inzwischen deaktiviert wurde (BUG-2) */
  currentDepartmentName: string | null
  onSaved: () => void
}

/**
 * PROJ-46: Zielbereich eines Entwurfs wechseln. Fragen aus dem alten
 * Bereichs-Pool werden entfernt, eigene private Fragen bleiben — die genaue
 * Anzahl zeigt erst die Rückmeldung nach dem Speichern.
 */
export function ChangeAssessmentDepartmentDialog({ open, onOpenChange, assessmentId, currentDepartmentId, currentDepartmentName, onSaved }: Props) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState(currentDepartmentId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTarget(currentDepartmentId)
    setLoading(true)
    fetch('/api/admin/assessments/departments')
      .then((res) => (res.ok ? res.json() : { departments: [] }))
      .then((data) => {
        const list: DepartmentOption[] = data.departments ?? []
        // Der aktuelle Zielbereich muss immer wählbar sein, auch wenn er
        // inzwischen deaktiviert wurde (sonst zeigt die Auswahl nichts an, BUG-2).
        setDepartments(
          list.some((d) => d.id === currentDepartmentId)
            ? list
            : [{ id: currentDepartmentId, name: `${currentDepartmentName ?? 'Unbekannter Bereich'} (deaktiviert)`, code: '' }, ...list],
        )
      })
      .catch(() => setDepartments([{ id: currentDepartmentId, name: currentDepartmentName ?? 'Unbekannter Bereich', code: '' }]))
      .finally(() => setLoading(false))
  }, [open, currentDepartmentId, currentDepartmentName])

  async function handleSave() {
    if (target === currentDepartmentId) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/department`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Zielbereich konnte nicht geändert werden.')
        return
      }
      toast.success(
        data.removedCount > 0
          ? `Zielbereich geändert – ${data.removedCount} Fragen aus dem alten Bereich entfernt`
          : 'Zielbereich geändert',
      )
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
      <DialogContent className="max-w-md border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Zielbereich ändern</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Nach dem Öffnen des Nachweises ist der Zielbereich fest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={target} onValueChange={setTarget} disabled={loading || saving}>
            <SelectTrigger className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {target !== currentDepartmentId && (
            <Alert className="border-ws-orange/50 bg-ws-orange/10">
              <AlertTriangle className="size-4 text-ws-orange" />
              <AlertDescription className="text-ws-orange">
                Ausgewählte Fragen aus dem Pool des alten Bereichs werden entfernt. Eigene private Fragen bleiben erhalten.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
