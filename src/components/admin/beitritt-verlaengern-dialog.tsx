'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { formatBeitrittZeit, pruefeVerlaengern, verlaengerteZeit, type VerlaengernWahl } from '@/lib/nachweis-ablauf'

type Wahl = VerlaengernWahl | 'eigen'

const OPTIONS = [
  { value: '+30', label: '+30 Min.' },
  { value: '+60', label: '+1 Std.' },
  { value: 'heute', label: 'Heute 23:59' },
  { value: 'eigen', label: 'Eigene Zeit' },
] as const satisfies readonly { value: Wahl; label: string }[]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentId: string
  status: 'draft' | 'open' | 'closed'
  closesAt: string
  autoClosedAt: string | null
  onExtended: () => void
}

/** PROJ-134: „Beitritt verlängern“ mit Schnellwahlen. Verkürzen geht nicht. */
export function BeitrittVerlaengernDialog({ open, onOpenChange, assessmentId, status, closesAt, autoClosedAt, onExtended }: Props) {
  const [wahl, setWahl] = useState<Wahl>('+30')
  const [eigen, setEigen] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setWahl('+30')
      setEigen('')
    }
  }, [open])

  const neu = useMemo(() => {
    if (wahl === 'eigen') {
      const d = eigen ? new Date(eigen) : null
      return d && !Number.isNaN(d.getTime()) ? d : null
    }
    // „Verlängern“ rechnet ab dem bisherigen Ende; läuft das schon ab, ab jetzt
    const base = new Date(closesAt).getTime() > Date.now() ? closesAt : new Date().toISOString()
    return verlaengerteZeit(base, wahl)
  }, [wahl, eigen, closesAt])

  const problem = neu ? pruefeVerlaengern({ status, autoClosedAt, currentClosesAt: closesAt, newClosesAt: neu.toISOString() }) : 'Bitte gib eine Zeit an.'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!neu || problem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend_join', closesAt: neu.toISOString() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Verlängern fehlgeschlagen')
        return
      }
      toast.success('Beitritt verlängert')
      onOpenChange(false)
      onExtended()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md border-ws-line bg-ws-surface text-ws-text">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Beitritt verlängern</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Bisher bis {formatBeitrittZeit(closesAt)}. Verkürzen ist nicht möglich.
            </DialogDescription>
          </DialogHeader>
          <AdminSegmented ariaLabel="Neues Ende" value={wahl} onChange={setWahl} options={OPTIONS} />
          {wahl === 'eigen' && (
            <div className="space-y-1.5">
              <Label htmlFor="beitritt-eigen" className="text-sm text-ws-muted">Neues Ende</Label>
              <Input
                id="beitritt-eigen"
                type="datetime-local"
                value={eigen}
                onChange={(e) => setEigen(e.target.value)}
                className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>
          )}
          <p className={problem ? 'text-sm text-ws-red' : 'text-sm text-ws-text'} role="status">
            {problem ?? `Neu: Beitritt bis ${formatBeitrittZeit(neu!.toISOString())}`}
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={() => onOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !!problem} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Verlängern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
