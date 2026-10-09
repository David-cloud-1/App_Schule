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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartment } from '@/components/department-provider'
import { HofIconPicker } from '@/components/admin/hof-icon-picker'
import { getHofCategories, type HofCategory } from '@/lib/hof-icons'
import { HOF_RARITIES, getEffectiveRarity, hofRarityLabel, isHofRarity, type HofRarity } from '@/lib/hof-rarity'

export type AdminShopItemRow = {
  id: string
  name: string
  description: string
  category: HofCategory | ''
  icon_key: string
  price: number
  /** null/fehlend = automatisch aus dem Preis (PROJ-32) */
  rarity_override?: HofRarity | null
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
  category: HofCategory | ''
  icon_key: string
  price: string
  /** '' = automatisch */
  rarity_override: HofRarity | ''
}

const EMPTY: FormState = { name: '', description: '', category: '', icon_key: '', price: '75', rarity_override: '' }

export function ShopItemFormModal({ open, onOpenChange, item, onSuccess }: Props) {
  const { currencyName, hofName, hofShortName, code: departmentCode } = useDepartment()
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
        category: item.category,
        icon_key: item.icon_key,
        price: String(item.price),
        rarity_override: isHofRarity(item.rarity_override) ? item.rarity_override : '',
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
    if (!form.category) e.category = 'Kategorie ist Pflicht.'
    if (!form.icon_key) e.icon_key = 'Bitte eine Illustration auswählen.'
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
        category: form.category,
        icon_key: form.icon_key,
        price: Number(form.price),
        // null = zurück auf automatisch (PROJ-32)
        rarity_override: form.rarity_override || null,
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
          <DialogTitle>{isEdit ? `${hofShortName}-Item bearbeiten` : `Neues ${hofShortName}-Item`}</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isEdit
              ? 'Item-Details anpassen. Wirkt nur auf künftige Käufe.'
              : `Neues Sammelstück für den ${hofName} anlegen.`}
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
              placeholder="z. B. Roter Sattelschlepper"
            />
            {errors.name && <p className="text-xs text-[#FF4B4B]">{errors.name}</p>}
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
            <Label htmlFor="category">Kategorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as HofCategory, icon_key: '' })}
            >
              <SelectTrigger id="category" className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                {getHofCategories(departmentCode).map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-[#FF4B4B]">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <Label>Illustration</Label>
            <HofIconPicker
              departmentCode={departmentCode}
              category={form.category}
              value={form.icon_key}
              onChange={(iconKey) => setForm({ ...form, icon_key: iconKey })}
            />
            {errors.icon_key && <p className="text-xs text-[#FF4B4B]">{errors.icon_key}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preis ({currencyName})</Label>
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

          <div className="space-y-2">
            <Label htmlFor="rarity">Seltenheit</Label>
            <Select
              value={form.rarity_override || 'auto'}
              onValueChange={(v) => setForm({ ...form, rarity_override: v === 'auto' ? '' : (v as HofRarity) })}
            >
              <SelectTrigger id="rarity" className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="auto">
                  Automatisch ({hofRarityLabel(getEffectiveRarity(Number(form.price) || 0))})
                </SelectItem>
                {HOF_RARITIES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#6B7280]">
              Rein optisch (Rahmen und Glanz). Automatisch richtet sich nach dem Preis.
            </p>
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
