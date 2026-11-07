'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BookmarkPlus, Copy, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateGradingScale, type GradeBoundary } from '@/lib/graded-assessments'
import {
  IHK_TEMPLATE,
  MAX_TEMPLATE_NAME_LENGTH,
  templateLabel,
  type GradingScaleTemplate,
} from '@/lib/grading-scale-templates'

interface Props {
  /** Aktueller Schlüssel im Editor (wird beim Speichern verwendet) */
  scale: GradeBoundary[]
  /** Eine Vorlage übernehmen: füllt nur den Schlüssel dieses Nachweises */
  onApply: (scale: GradeBoundary[]) => void
  disabled?: boolean
}

/**
 * PROJ-77: Vorlage wählen und den aktuellen Schlüssel als Vorlage sichern.
 * Eine Vorlage anwenden kopiert nur die Werte – spätere Änderungen oder das
 * Löschen der Vorlage berühren keinen Nachweis und keinen Entwurf.
 */
export function GradingScaleTemplatePicker({ scale, onApply, disabled }: Props) {
  const [templates, setTemplates] = useState<GradingScaleTemplate[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(IHK_TEMPLATE.id)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/assessments/schluessel-vorlagen')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setTemplates(json.templates ?? [])
      setLoadFailed(false)
    } catch {
      // Ohne Vorlagen bleibt der Editor voll nutzbar (IHK-Standard ist fest eingebaut)
      setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mine = templates.filter((t) => t.mine)
  const others = templates.filter((t) => !t.mine)
  const selected = selectedId === IHK_TEMPLATE.id ? IHK_TEMPLATE : templates.find((t) => t.id === selectedId)

  function choose(id: string) {
    const t = id === IHK_TEMPLATE.id ? IHK_TEMPLATE : templates.find((x) => x.id === id)
    if (!t) return
    setSelectedId(id)
    onApply(t.scale)
  }

  function openSave(prefill: string) {
    setName(prefill)
    setShared(false)
    setFormError(null)
    setSaveOpen(true)
  }

  async function save() {
    const scaleError = validateGradingScale(scale)
    if (scaleError) return setFormError(scaleError)
    if (!name.trim()) return setFormError('Bitte einen Namen eingeben.')
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/admin/assessments/schluessel-vorlagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scale, shared }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setFormError(json.error ?? 'Vorlage konnte nicht gespeichert werden.')
      toast.success('Vorlage gespeichert')
      setSaveOpen(false)
      await load()
      if (json.id) setSelectedId(json.id)
    } finally {
      setSaving(false)
    }
  }

  async function overwrite() {
    if (!selected || !selected.mine) return
    const scaleError = validateGradingScale(scale)
    if (scaleError) return toast.error(scaleError)
    const res = await fetch(`/api/admin/assessments/schluessel-vorlagen/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale }),
    })
    if (!res.ok) return toast.error('Vorlage konnte nicht überschrieben werden.')
    toast.success('Vorlage überschrieben')
    await load()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="scale-template">Vorlage verwenden</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedId} onValueChange={choose} disabled={disabled}>
          <SelectTrigger id="scale-template" className="min-h-11 w-full max-w-xs rounded-xl border-ws-line bg-ws-bg text-ws-text">
            <SelectValue placeholder="Vorlage wählen" />
          </SelectTrigger>
          <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
            <SelectGroup>
              <SelectLabel className="text-ws-faint">Standard</SelectLabel>
              <SelectItem value={IHK_TEMPLATE.id}>{IHK_TEMPLATE.name}</SelectItem>
            </SelectGroup>
            {mine.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-ws-faint">Meine Vorlagen</SelectLabel>
                {mine.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {templateLabel(t)}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {others.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-ws-faint">Vom Kollegium</SelectLabel>
                {others.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {templateLabel(t)}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="rounded-xl" disabled={disabled} onClick={() => openSave('')}>
          <BookmarkPlus className="mr-1.5 size-4" aria-hidden />
          Als Vorlage speichern
        </Button>
        {selected && selected.mine && (
          <Button type="button" variant="outline" className="rounded-xl" disabled={disabled} onClick={overwrite}>
            <Save className="mr-1.5 size-4" aria-hidden />
            Vorlage überschreiben
          </Button>
        )}
        {selected && !selected.mine && !selected.builtIn && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={disabled}
            onClick={() => openSave(selected.name.slice(0, MAX_TEMPLATE_NAME_LENGTH))}
          >
            <Copy className="mr-1.5 size-4" aria-hidden />
            Als eigene Kopie speichern
          </Button>
        )}
      </div>
      {loadFailed && (
        <p className="text-xs text-ws-faint">Gespeicherte Vorlagen konnten gerade nicht geladen werden. Der IHK-Standard geht trotzdem.</p>
      )}

      <Dialog open={saveOpen} onOpenChange={(o) => !saving && setSaveOpen(o)}>
        <DialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <DialogHeader>
            <DialogTitle>Notenschlüssel als Vorlage speichern</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Gespeichert wird der Schlüssel, wie er gerade im Editor steht.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={name}
                maxLength={MAX_TEMPLATE_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Mein Schlüssel Klasse 11"
                className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>
            <div className="flex items-start gap-3">
              <Switch id="template-shared" checked={shared} onCheckedChange={setShared} />
              <Label htmlFor="template-shared" className="flex-1 cursor-pointer">
                Mit dem Kollegium teilen
                <span className="block text-xs font-normal text-ws-faint">
                  Alle Lehrkräfte sehen die Vorlage mit deinem Namen. Bearbeiten und löschen kannst nur du.
                </span>
              </Label>
            </div>
            {formError && <p className="text-sm text-ws-red">{formError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {saving ? 'Speichert …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
