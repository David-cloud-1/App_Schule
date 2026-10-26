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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DepartmentOption = { id: string; name: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userLabel: string
  currentDepartmentId: string | null
  /** Bereichs-Admin: Mit dem Bereich wechselt auch der Bereich seiner Verwaltungsrechte */
  isManager?: boolean
  onSuccess: () => void
}

/** „In anderen Fachbereich verschieben" (PROJ-24 Tech Design). */
export function MoveDepartmentDialog({
  open,
  onOpenChange,
  userId,
  userLabel,
  currentDepartmentId,
  isManager = false,
  onSuccess,
}: Props) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [target, setTarget] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTarget('')
    fetch('/api/admin/departments')
      .then((res) => (res.ok ? res.json() : { departments: [] }))
      .then((json) => setDepartments(json.departments ?? []))
      .catch(() => setDepartments([]))
  }, [open])

  async function handleConfirm() {
    if (!userId || !target) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Verschieben fehlgeschlagen')
        return
      }
      toast.success('In anderen Fachbereich verschoben')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  const otherDepartments = departments.filter((d) => d.id !== currentDepartmentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-sm">
        <DialogHeader>
          <DialogTitle>In anderen Fachbereich verschieben</DialogTitle>
          <DialogDescription className="text-ws-muted">
            {userLabel} wechselt sofort in den gewählten Fachbereich — passend für falsch registrierte Konten.
            {isManager && ' Die Verwaltungsrechte gelten danach für den neuen Fachbereich.'}
          </DialogDescription>
        </DialogHeader>

        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
            <SelectValue placeholder="Zielbereich wählen…" />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {otherDepartments.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-ws-muted">Kein anderer Fachbereich vorhanden</div>
            ) : (
              otherDepartments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="focus:bg-ws-bg focus:text-ws-text">
                  {d.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !target}
            className="bg-ws-blue hover:bg-ws-blue-hover text-ws-on-accent rounded-xl"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verschieben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
