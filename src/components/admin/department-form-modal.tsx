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

export type AdminDepartmentRow = {
  id: string
  code: string
  slug: string
  domain: string | null
  name: string
  appName: string
  tagline: string
  metaTitle: string
  metaDescription: string
  iconName: string
  currencyName: string
  hofName: string
  hofShortName: string
  promptRole: string
  targetGroup: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: AdminDepartmentRow | null
  onSuccess: () => void
}

type FormState = {
  code: string
  slug: string
  domain: string
  name: string
  appName: string
  tagline: string
  metaTitle: string
  metaDescription: string
  iconName: string
  currencyName: string
  hofName: string
  hofShortName: string
  promptRole: string
  targetGroup: string
}

const EMPTY: FormState = {
  code: '',
  slug: '',
  domain: '',
  name: '',
  appName: '',
  tagline: '',
  metaTitle: '',
  metaDescription: '',
  iconName: 'GraduationCap',
  currencyName: '',
  hofName: '',
  hofShortName: '',
  promptRole: '',
  targetGroup: '',
}

export function DepartmentFormModal({ open, onOpenChange, department, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(department)

  useEffect(() => {
    if (!open) return
    if (department) {
      setForm({
        code: department.code,
        slug: department.slug,
        domain: department.domain ?? '',
        name: department.name,
        appName: department.appName,
        tagline: department.tagline,
        metaTitle: department.metaTitle,
        metaDescription: department.metaDescription,
        iconName: department.iconName,
        currencyName: department.currencyName,
        hofName: department.hofName,
        hofShortName: department.hofShortName,
        promptRole: department.promptRole,
        targetGroup: department.targetGroup,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, department])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!isEdit) {
      if (!/^[A-Z]{2,10}$/.test(form.code)) e.code = 'Nur Großbuchstaben, 2–10 Zeichen.'
      if (!/^[a-z0-9-]{2,30}$/.test(form.slug)) e.slug = 'Nur Kleinbuchstaben, Ziffern, Bindestrich.'
    }
    if (!form.name.trim()) e.name = 'Name ist Pflicht.'
    if (!form.appName.trim()) e.appName = 'App-Name ist Pflicht.'
    if (!form.metaTitle.trim()) e.metaTitle = 'Seitentitel ist Pflicht.'
    if (!form.currencyName.trim()) e.currencyName = 'Name der Münzen ist Pflicht.'
    if (!form.hofName.trim()) e.hofName = 'Name des Hofs ist Pflicht.'
    if (!form.promptRole.trim()) e.promptRole = 'Prompt-Rolle ist Pflicht.'
    if (!form.targetGroup.trim()) e.targetGroup = 'Zielgruppe ist Pflicht.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const base = {
        name: form.name.trim(),
        app_name: form.appName.trim(),
        tagline: form.tagline.trim() || undefined,
        meta_title: form.metaTitle.trim(),
        meta_description: form.metaDescription.trim() || undefined,
        icon_name: form.iconName.trim() || undefined,
        currency_name: form.currencyName.trim(),
        hof_name: form.hofName.trim(),
        hof_short_name: form.hofShortName.trim() || undefined,
        prompt_role: form.promptRole.trim(),
        target_group: form.targetGroup.trim(),
        domain: form.domain.trim() || null,
      }
      const payload = isEdit
        ? base
        : { ...base, code: form.code.trim(), slug: form.slug.trim() }

      const url = isEdit ? `/api/admin/departments/${department!.id}` : '/api/admin/departments'
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
      toast.success(isEdit ? 'Fachbereich aktualisiert' : 'Fachbereich angelegt')
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
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Fachbereich bearbeiten' : 'Neuen Fachbereich anlegen'}</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isEdit
              ? 'Branding, Prompt-Grundlage und Gamification-Namen anpassen.'
              : 'Kürzel und Slug lassen sich später nicht mehr ändern.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kürzel</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] font-mono uppercase"
                  placeholder="TOUR"
                  maxLength={10}
                />
                {errors.code && <p className="text-xs text-[#FF4B4B]">{errors.code}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] font-mono"
                  placeholder="tourismus"
                  maxLength={30}
                />
                {errors.slug && <p className="text-xs text-[#FF4B4B]">{errors.slug}</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name (z. B. „Tourismuskaufleute")</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={100}
            />
            {errors.name && <p className="text-xs text-[#FF4B4B]">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App-Name</Label>
              <Input
                id="appName"
                value={form.appName}
                onChange={(e) => setForm({ ...form, appName: e.target.value })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                placeholder="TouristikLern"
                maxLength={60}
              />
              {errors.appName && <p className="text-xs text-[#FF4B4B]">{errors.appName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Adresse (optional)</Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value.toLowerCase() })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                placeholder="touristiklern.vercel.app"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaTitle">Seitentitel (Browser-Tab)</Label>
            <Input
              id="metaTitle"
              value={form.metaTitle}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={120}
            />
            {errors.metaTitle && <p className="text-xs text-[#FF4B4B]">{errors.metaTitle}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currencyName">Name der Münzen</Label>
              <Input
                id="currencyName"
                value={form.currencyName}
                onChange={(e) => setForm({ ...form, currencyName: e.target.value })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                placeholder="Reisetaler"
                maxLength={40}
              />
              {errors.currencyName && <p className="text-xs text-[#FF4B4B]">{errors.currencyName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hofName">Name des Hofs</Label>
              <Input
                id="hofName"
                value={form.hofName}
                onChange={(e) => setForm({ ...form, hofName: e.target.value })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                placeholder="Reisebüro"
                maxLength={40}
              />
              {errors.hofName && <p className="text-xs text-[#FF4B4B]">{errors.hofName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptRole">Prompt-Rolle</Label>
            <Textarea
              id="promptRole"
              rows={2}
              value={form.promptRole}
              onChange={(e) => setForm({ ...form, promptRole: e.target.value })}
              placeholder="Experte für Prüfungsfragen im Bereich Tourismus (IHK Bayern)"
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={500}
            />
            {errors.promptRole && <p className="text-xs text-[#FF4B4B]">{errors.promptRole}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetGroup">Zielgruppe</Label>
            <Input
              id="targetGroup"
              value={form.targetGroup}
              onChange={(e) => setForm({ ...form, targetGroup: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              placeholder="angehende Tourismuskaufleute"
              maxLength={200}
            />
            {errors.targetGroup && <p className="text-xs text-[#FF4B4B]">{errors.targetGroup}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
