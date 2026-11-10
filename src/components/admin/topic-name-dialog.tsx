'use client'

import { useEffect, useState } from 'react'
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

/**
 * Thema anlegen oder umbenennen (PROJ-85). Fehler wie „Name gibt es schon“
 * erscheinen im Dialog selbst, gespeichert wird dann nichts.
 */
export function TopicNameDialog({
  open,
  onOpenChange,
  mode,
  subjectName,
  initialName = '',
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  subjectName: string
  initialName?: string
  /** Gibt eine Fehlermeldung zurück oder `null`, wenn gespeichert wurde */
  onSubmit: (name: string) => Promise<string | null>
}) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError(null)
    }
  }, [open, initialName])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Bitte gib einen Namen ein.')
      return
    }
    setSaving(true)
    setError(null)
    const message = await onSubmit(trimmed)
    setSaving(false)
    if (message) setError(message)
    else onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="border-ws-line bg-ws-surface text-ws-text">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Thema anlegen' : 'Thema umbenennen'}</DialogTitle>
            <DialogDescription className="text-ws-muted">Fach: {subjectName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="topic-name">Name des Themas</Label>
            <Input
              id="topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'topic-name-error' : undefined}
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
            />
            {error && (
              <p id="topic-name-error" role="alert" className="text-sm text-ws-red">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="min-h-11 text-ws-muted hover:text-ws-text"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
