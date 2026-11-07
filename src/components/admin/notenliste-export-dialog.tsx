'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  NOTENLISTE_COLUMNS,
  NOTENLISTE_COLUMN_LABELS,
  type NotenlisteColumn,
  type NotenlisteSort,
} from '@/lib/notenliste-export'

const SORT_LABELS: Record<NotenlisteSort, string> = {
  name: 'Nachname A–Z',
  grade: 'Note (beste zuerst)',
  points: 'Punkte (meiste zuerst)',
}

/** Dateiname aus dem Antwort-Header lesen (UTF-8-Variante bevorzugt). */
function filenameFrom(header: string | null): string {
  const utf8 = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8) {
    try {
      return decodeURIComponent(utf8)
    } catch {
      /* weiter mit Rückfall */
    }
  }
  return header?.match(/filename="([^"]+)"/i)?.[1] ?? 'Notenliste.csv'
}

/**
 * PROJ-77: Notenliste für Excel. Spalten, Sortierung und Namensform wählen, die
 * Datei kommt fertig vom Server. Der einfache CSV-Export bleibt daneben bestehen.
 */
export function NotenlisteExportDialog({
  assessmentId,
  open,
  onOpenChange,
}: {
  assessmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [columns, setColumns] = useState<NotenlisteColumn[]>([...NOTENLISTE_COLUMNS])
  const [sort, setSort] = useState<NotenlisteSort>('name')
  const [split, setSplit] = useState(false)
  const [busy, setBusy] = useState(false)

  function toggle(column: NotenlisteColumn, on: boolean) {
    setColumns((prev) => (on ? [...prev, column] : prev.filter((c) => c !== column)))
  }

  async function download() {
    setBusy(true)
    try {
      const qs = new URLSearchParams({ columns: columns.join(','), sort, split: split ? '1' : '0' })
      const res = await fetch(`/api/admin/assessments/${assessmentId}/notenliste?${qs}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        return toast.error(json.error ?? 'Die Notenliste konnte nicht erstellt werden.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filenameFrom(res.headers.get('Content-Disposition'))
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Notenliste heruntergeladen')
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Notenliste exportieren</DialogTitle>
          <DialogDescription className="text-ws-muted">
            CSV für Excel (Semikolon, Umlaute korrekt). Ausgeschlossene stehen am Ende, nicht Abgegebene sind vermerkt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-ws-text">Spalten</legend>
            {NOTENLISTE_COLUMNS.map((c) => (
              <div key={c} className="flex items-center gap-3">
                <Checkbox id={`col-${c}`} checked={columns.includes(c)} onCheckedChange={(v) => toggle(c, v === true)} />
                <Label htmlFor={`col-${c}`} className="min-h-8 flex-1 cursor-pointer py-1.5">
                  {NOTENLISTE_COLUMN_LABELS[c]}
                </Label>
              </div>
            ))}
            <p className="text-xs text-ws-faint">Eine Spalte „Gruppe“ folgt, sobald es Gruppen gibt.</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-ws-text">Sortierung</legend>
            <RadioGroup value={sort} onValueChange={(v) => setSort(v as NotenlisteSort)}>
              {(Object.keys(SORT_LABELS) as NotenlisteSort[]).map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <RadioGroupItem value={s} id={`sort-${s}`} />
                  <Label htmlFor={`sort-${s}`} className="min-h-8 flex-1 cursor-pointer py-1.5">
                    {SORT_LABELS[s]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex items-start gap-3">
            <Switch id="split-name" checked={split} onCheckedChange={setSplit} />
            <Label htmlFor="split-name" className="flex-1 cursor-pointer">
              Name als „Nachname, Vorname“
              <span className="block text-xs font-normal text-ws-faint">
                Das letzte Wort gilt als Nachname. Namen werden frei eingegeben, deshalb ist das nur eine Näherung.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            onClick={download}
            disabled={busy || columns.length === 0}
            className="rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            <Download className="mr-1.5 size-4" aria-hidden />
            {busy ? 'Wird erstellt …' : 'Herunterladen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
