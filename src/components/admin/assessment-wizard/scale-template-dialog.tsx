'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GradingScaleEditor, IHK_DEFAULT_SCALE, validateGradingScale, type GradeBoundary } from '@/components/admin/grading-scale-editor'
import { MAX_TEMPLATE_NAME_LENGTH } from '@/lib/grading-scale-templates'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nach dem Speichern: Nummer der neuen Vorlage und ihr Schlüssel */
  onCreated: (template: { id: string | null; name: string; scale: GradeBoundary[] }) => void
}

/**
 * Neue Notenschlüssel-Vorlage anlegen (PROJ-133, B33): Name und Prozentstufen,
 * ohne dafür einen Nachweis zu beginnen. Steht auf der Seite „Notenschlüssel“
 * und in Schritt 3 des Anlegens.
 */
export function ScaleTemplateDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const [scale, setScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (saving) return
    if (next) {
      setName('')
      setShared(false)
      setScale(IHK_DEFAULT_SCALE)
      setError(null)
    }
    onOpenChange(next)
  }

  async function save() {
    const scaleError = validateGradingScale(scale)
    if (!name.trim()) return setError('Bitte gib einen Namen ein.')
    if (scaleError) return setError(scaleError)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/assessments/schluessel-vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scale, shared }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setError(json.error ?? 'Die Vorlage konnte nicht gespeichert werden.')
      toast.success('Vorlage gespeichert')
      onCreated({ id: json.id ?? null, name: name.trim(), scale })
      onOpenChange(false)
    } catch {
      setError('Die Vorlage konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-ws-line bg-ws-surface text-ws-text sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Neue Vorlage anlegen</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Gib an, ab wie viel Prozent welche Note gilt. Die Vorlage steht danach bei jedem Nachweis zur Auswahl.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-template-name">Name</Label>
            <Input
              id="new-template-name"
              value={name}
              maxLength={MAX_TEMPLATE_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Mein Schlüssel Stufe 11"
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
          </div>
          <GradingScaleEditor scale={scale} onChange={setScale} />
          <div className="flex items-start gap-3">
            <Switch id="new-template-shared" checked={shared} onCheckedChange={setShared} />
            <Label htmlFor="new-template-shared" className="flex-1 cursor-pointer">
              Mit dem Kollegium teilen
              <span className="block text-xs font-normal text-ws-faint">
                Alle Lehrkräfte sehen die Vorlage mit deinem Namen. Bearbeiten und löschen kannst nur du.
              </span>
            </Label>
          </div>
          {error && <p className="text-sm text-ws-red" role="alert">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button type="button" onClick={save} disabled={saving} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
            {saving ? 'Speichert …' : 'Vorlage speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
