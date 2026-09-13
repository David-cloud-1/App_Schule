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

export type AdminShopItemRow = {
  id: string
  name: string
  description: string
  icon: string
  price: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: AdminShopItemRow | null
  onSuccess: () => void
}

type FormState = {
  name: string
  description: string
  icon: string
  price: string
}

const EMPTY: FormState = { name: '', description: '', icon: '🚛', price: '75' }

export function ShopItemFormModal({ open, onOpenChange, item, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(item)

  useEffect(() => {
    if (!open) return
    if (item) {
      setForm({
        name: item.name,
        description: item.description,
        icon: item.icon,
        price: String(item.price),
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [open, item])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name ist Pflicht.'
    if (form.name.length > 60) e.name = 'Max. 60 Zeichen.'
    if (!form.description.trim()) e.description = 'Beschreibung ist Pflicht.'
    if (form.description.length > 200) e.description = 'Max. 200 Zeichen.'
    if (!form.icon.trim()) e.icon = 'Icon ist Pflicht.'
    const priceNum = Number(form.price)
    if (!Number.isInteger(priceNum) || priceNum < 1) e.price = 'Preis muss eine ganze Zahl ≥ 1 sein.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        price: Number(form.price),
      }

      const url = isEdit ? `/api/admin/shop-items/${item!.id}` : '/api/admin/shop-items'
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
      toast.success(isEdit ? 'Item aktualisiert' : 'Item erstellt')
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
          <DialogTitle>{isEdit ? 'Hof-Item bearbeiten' : 'Neues Hof-Item'}</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isEdit
              ? 'Item-Details anpassen. Wirkt nur auf künftige Käufe.'
              : 'Neues Sammelstück für den Speditionshof anlegen.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-2 w-20 flex-shrink-0">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] text-center text-2xl"
                maxLength={4}
              />
              {errors.icon && <p className="text-xs text-[#FF4B4B]">{errors.icon}</p>}
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                placeholder="z. B. Roter Sattelschlepper"
              />
              {errors.name && <p className="text-xs text-[#FF4B4B]">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={200}
            />
            {errors.description && <p className="text-xs text-[#FF4B4B]">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preis (Frachtmünzen)</Label>
            <Input
              id="price"
              type="number"
              min={1}
              step={1}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
            />
            {errors.price && <p className="text-xs text-[#FF4B4B]">{errors.price}</p>}
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
