'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FlaskConical, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminLoadingState } from '@/components/admin/admin-states'

interface Trial {
  id: string
  startedAt: string
  submitted: boolean
  group: string | null
  grade: number | null
  percent: number | null
}

/** Startet einen Testlauf und gibt die Sitzung zurück (PROJ-134) */
export async function startTestlauf(assessmentId: string, group?: 'A' | 'B'): Promise<{ sessionId: string } | { error: string }> {
  try {
    const res = await fetch(`/api/admin/assessments/${assessmentId}/testlauf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group ? { group } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error ?? 'Der Testlauf konnte nicht gestartet werden.' }
    return { sessionId: data.sessionId as string }
  } catch {
    return { error: 'Netzwerkfehler' }
  }
}

/** Bei Nachweisen mit Gruppen: erst A oder B wählen */
export function TestlaufGruppeDialog({
  open,
  onOpenChange,
  onStart,
  starting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: (group: 'A' | 'B') => void
  starting: boolean
}) {
  const [group, setGroup] = useState<'A' | 'B'>('A')
  return (
    <Dialog open={open} onOpenChange={(o) => !starting && onOpenChange(o)}>
      <DialogContent className="max-w-sm border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Als Azubi ausprobieren</DialogTitle>
          <DialogDescription className="text-ws-muted">Mit welcher Gruppe möchtest du den Testlauf machen? Er zählt nirgends mit.</DialogDescription>
        </DialogHeader>
        <AdminSegmented
          ariaLabel="Gruppe"
          value={group}
          onChange={setGroup}
          options={[{ value: 'A', label: 'Gruppe A' }, { value: 'B', label: 'Gruppe B' }]}
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={() => onOpenChange(false)} disabled={starting}>
            Abbrechen
          </Button>
          <Button type="button" onClick={() => onStart(group)} disabled={starting} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
            {starting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Testlauf starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * „Meine Testläufe“ (PROJ-134): nur die eigenen, einzeln löschbar. Erscheint erst, wenn es
 * mindestens einen gibt. Testläufe zählen in keiner Auswertung mit.
 */
export function NachweisTestlaeufe({ assessmentId, refreshKey }: { assessmentId: string; refreshKey: number }) {
  const [trials, setTrials] = useState<Trial[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/testlauf`)
      if (!res.ok) throw new Error()
      const body = (await res.json()) as { trials?: Trial[] }
      setTrials(Array.isArray(body.trials) ? body.trials : [])
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function remove() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/testlauf/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Löschen fehlgeschlagen')
        return
      }
      toast.success('Testlauf gelöscht')
      setDeleteId(null)
      await load()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeleting(false)
    }
  }

  if (failed || (trials !== null && trials.length === 0)) return null
  if (trials === null) return <AdminLoadingState variant="list" rows={2} />

  return (
    <section aria-labelledby="testlaeufe-titel" className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
      <div>
        <h2 id="testlaeufe-titel" className="flex items-center gap-2 text-base font-semibold text-ws-text">
          <FlaskConical className="size-4 text-ws-muted" aria-hidden />
          Meine Testläufe
        </h2>
        <p className="text-sm text-ws-muted">Testläufe zählen nicht mit und sind nur für dich sichtbar. Nach 30 Tagen werden sie gelöscht.</p>
      </div>
      <ul className="divide-y divide-ws-line">
        {trials.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ws-text">
                {new Date(t.startedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                {t.group && <span className="text-ws-muted"> · Gruppe {t.group}</span>}
              </p>
              <p className="text-xs text-ws-muted">
                {t.submitted ? `Abgegeben${t.grade != null ? ` · Note ${t.grade}` : ''}${t.percent != null ? ` · ${String(t.percent).replace('.', ',')} %` : ''}` : 'Nicht abgegeben'}
              </p>
            </div>
            <Button asChild variant="outline" className="min-h-11 rounded-xl border-ws-line">
              <Link href={t.submitted ? `/exam/${t.id}/results` : `/exam/${t.id}`}>{t.submitted ? 'Ansehen' : 'Fortsetzen'}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 text-ws-muted hover:text-ws-red"
              aria-label="Testlauf löschen"
              onClick={() => setDeleteId(t.id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && !deleting && setDeleteId(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Testlauf löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">Der Testlauf und seine Antworten werden gelöscht. Echte Abgaben sind nicht betroffen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl border-ws-line bg-ws-raised text-ws-text hover:bg-ws-line">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={deleting} className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
