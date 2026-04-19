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
import { Textarea } from '@/components/ui/textarea'

export type AdminSubjectRow = {
  id: string
  name: string
  code: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: AdminSubjectRow | null
  onSuccess: () => void
}

type FormState = {
  name: string
  code: string
  description: string
}

const EMPTY: FormState = { name: '', code: '', description: '' }

export function SubjectFormModal({ open, onOpenChange, subject, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(subject)

  useEffect(() => {
    if (!open) return
    if (subject) {
      setForm({ name: subject.name, code: subject.code, description: '' })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, subject])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name ist Pflicht.'
    if (form.name.length > 100) e.name = 'Max. 100 Zeichen.'
    if (!form.code.trim()) e.code = 'Code ist Pflicht.'
    if (form.code.length > 5) e.code = 'Max. 5 Zeichen.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
      }
      if (form.description.trim()) payload.description = form.description.trim()

      const url = isEdit ? `/api/admin/subjects/${subject!.id}` : '/api/admin/subjects'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success(isEdit ? 'Fach aktualisiert' : 'Fach erstellt')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Fach bearbeiten' : 'Neues Fach'}</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isEdit
              ? 'Fach-Details anpassen.'
              : 'Lege ein neues Lernfach mit eindeutigem Code an.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              placeholder="z. B. Kaufmännische Steuerung"
            />
            {errors.name && <p className="text-xs text-[#FF4B4B]">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code (max. 5 Zeichen)</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] font-mono uppercase"
              placeholder="KSK"
              maxLength={5}
            />
            {errors.code && <p className="text-xs text-[#FF4B4B]">{errors.code}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={500}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
