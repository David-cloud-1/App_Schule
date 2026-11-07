'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Pencil, Share2, Trash2, Users, Lock, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { GradingScaleEditor, validateGradingScale } from '@/components/admin/grading-scale-editor'
import { IHK_DEFAULT_SCALE, type GradeBoundary } from '@/lib/graded-assessments'
import { IHK_TEMPLATE, MAX_TEMPLATE_NAME_LENGTH, type GradingScaleTemplate } from '@/lib/grading-scale-templates'

const API = '/api/admin/assessments/schluessel-vorlagen'

/** Kurzform „1 ab 92 % · 2 ab 81 % …“ */
function scaleSummary(scale: GradeBoundary[]): string {
  return scale
    .filter((b) => b.grade < 6)
    .map((b) => `${b.grade}: ab ${b.minPercent} %`)
    .join(' · ')
}

export default function GradingScaleTemplatesPage() {
  const [templates, setTemplates] = useState<GradingScaleTemplate[] | null>(null)
  const [failed, setFailed] = useState(false)

  const [editing, setEditing] = useState<GradingScaleTemplate | null>(null)
  const [editName, setEditName] = useState('')
  const [editScale, setEditScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [editShared, setEditShared] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [toDelete, setToDelete] = useState<GradingScaleTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error()
      setTemplates((await res.json()).templates ?? [])
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openEdit(t: GradingScaleTemplate) {
    setEditing(t)
    setEditName(t.name)
    setEditScale(t.scale)
    setEditShared(t.shared)
    setEditError(null)
  }

  async function saveEdit() {
    if (!editing) return
    const scaleError = validateGradingScale(editScale)
    if (scaleError) return setEditError(scaleError)
    if (!editName.trim()) return setEditError('Bitte einen Namen eingeben.')
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`${API}/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, scale: editScale, shared: editShared }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return setEditError(json.error ?? 'Vorlage konnte nicht geändert werden.')
      toast.success('Vorlage gespeichert')
      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function copy(t: GradingScaleTemplate) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name.slice(0, MAX_TEMPLATE_NAME_LENGTH), scale: t.scale, shared: false }),
    })
    if (!res.ok) return toast.error('Kopie konnte nicht gespeichert werden.')
    toast.success('Als eigene Kopie gespeichert')
    await load()
  }

  async function toggleShared(t: GradingScaleTemplate) {
    const res = await fetch(`${API}/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared: !t.shared }),
    })
    if (!res.ok) return toast.error('Teilen konnte nicht geändert werden.')
    toast.success(t.shared ? 'Vorlage ist wieder privat' : 'Vorlage mit dem Kollegium geteilt')
    await load()
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/${toDelete.id}`, { method: 'DELETE' })
      if (!res.ok) return toast.error('Vorlage konnte nicht gelöscht werden.')
      toast.success('Vorlage gelöscht. Bereits angelegte Nachweise behalten ihren Schlüssel.')
      setToDelete(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  const mine = (templates ?? []).filter((t) => t.mine)
  const others = (templates ?? []).filter((t) => !t.mine)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notenschlüssel"
        description="Speichere eigene Schlüssel als Vorlage und wähle sie beim Anlegen eines Nachweises mit einem Klick."
        breadcrumb="Notenschlüssel"
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/leistungsnachweise">
              <ArrowLeft className="mr-1.5 size-4" aria-hidden />
              Zu den Nachweisen
            </Link>
          </Button>
        }
      />

      {failed ? (
        <AdminErrorState message="Die Vorlagen konnten gerade nicht geladen werden." onRetry={load} />
      ) : templates === null ? (
        <AdminLoadingState variant="list" rows={3} />
      ) : (
        <div className="max-w-3xl space-y-8">
          <section className="space-y-3" aria-labelledby="sec-standard">
            <h2 id="sec-standard" className="text-sm font-semibold text-ws-muted">Standard</h2>
            <div className="rounded-2xl border border-ws-line bg-ws-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Ruler className="size-4 text-ws-muted" aria-hidden />
                <span className="font-semibold text-ws-text">{IHK_TEMPLATE.name}</span>
                <Badge variant="outline" className="border-ws-line text-ws-muted">fest, nicht änderbar</Badge>
              </div>
              <p className="mt-1 text-sm text-ws-muted">{scaleSummary(IHK_TEMPLATE.scale)}</p>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="sec-mine">
            <h2 id="sec-mine" className="text-sm font-semibold text-ws-muted">Meine Vorlagen</h2>
            {mine.length === 0 ? (
              <AdminEmptyState
                icon={Ruler}
                title="Noch keine eigene Vorlage"
                description="Lege einen Nachweis an, stelle den Schlüssel ein und wähle dort „Als Vorlage speichern“."
                action={
                  <Button asChild className="rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                    <Link href="/admin/leistungsnachweise?neu=1">Nachweis anlegen</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {mine.map((t) => (
                  <li key={t.id} className="rounded-2xl border border-ws-line bg-ws-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-semibold text-ws-text" title={t.name}>{t.name}</span>
                      {t.shared ? (
                        <Badge className="border border-ws-blue/30 bg-ws-blue/15 text-ws-blue"><Users className="mr-1 size-3" aria-hidden />geteilt</Badge>
                      ) : (
                        <Badge variant="outline" className="border-ws-line text-ws-muted"><Lock className="mr-1 size-3" aria-hidden />privat</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ws-muted">{scaleSummary(t.scale)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => openEdit(t)}>
                        <Pencil className="mr-1.5 size-4" aria-hidden />Bearbeiten
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => toggleShared(t)}>
                        <Share2 className="mr-1.5 size-4" aria-hidden />{t.shared ? 'Nicht mehr teilen' : 'Mit Kollegium teilen'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-ws-red/30 text-ws-red hover:bg-ws-red/10"
                        onClick={() => setToDelete(t)}
                      >
                        <Trash2 className="mr-1.5 size-4" aria-hidden />Löschen
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {others.length > 0 && (
            <section className="space-y-3" aria-labelledby="sec-others">
              <h2 id="sec-others" className="text-sm font-semibold text-ws-muted">Vom Kollegium geteilt</h2>
              <ul className="space-y-3">
                {others.map((t) => (
                  <li key={t.id} className="rounded-2xl border border-ws-line bg-ws-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-semibold text-ws-text" title={t.name}>{t.name}</span>
                      {t.ownerName && <span className="text-sm text-ws-muted">von {t.ownerName}</span>}
                    </div>
                    <p className="mt-1 text-sm text-ws-muted">{scaleSummary(t.scale)}</p>
                    <div className="mt-3">
                      <Button variant="outline" className="rounded-xl" onClick={() => copy(t)}>
                        <Copy className="mr-1.5 size-4" aria-hidden />Als eigene Kopie speichern
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !saving && !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <DialogHeader>
            <DialogTitle>Vorlage bearbeiten</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Bereits angelegte Nachweise behalten ihren Schlüssel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                maxLength={MAX_TEMPLATE_NAME_LENGTH}
                onChange={(e) => setEditName(e.target.value)}
                className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>
            <GradingScaleEditor scale={editScale} onChange={setEditScale} />
            <div className="flex items-center gap-3">
              <Switch id="edit-shared" checked={editShared} onCheckedChange={setEditShared} />
              <Label htmlFor="edit-shared" className="cursor-pointer">Mit dem Kollegium teilen</Label>
            </div>
            {editError && <p className="text-sm text-ws-red">{editError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Abbrechen</Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {saving ? 'Speichert …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !deleting && !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage „{toDelete?.name}“ löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {toDelete?.shared
                ? 'Die Vorlage verschwindet auch für das Kollegium. '
                : ''}
              Bereits angelegte Nachweise behalten ihren Schlüssel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={deleting}
              className="bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              {deleting ? 'Löscht …' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
