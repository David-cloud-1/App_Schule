'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarCog } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { UserOverview } from './types'

/**
 * Planer-Recht für den Abwesenheitskalender (PROJ-120, nur Super-Admin). Vergeben
 * und entziehen fragen mit Name und E-Mail nach; die Änderung landet im
 * Änderungsprotokoll. Nur für Lehrer-Rollen sinnvoll, Azubis zeigen die Karte nicht.
 */
export function PlannerCard({
  overview,
  onDone,
}: {
  overview: UserOverview
  /** Nach dem Speichern Kopf und Protokoll neu laden */
  onDone: () => void
}) {
  const [pending, setPending] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  if (overview.role === 'student') return null

  const name = overview.displayName ?? overview.email ?? 'diese Person'
  const isSuperAdmin = overview.role === 'admin'

  async function save(value: boolean) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${overview.id}/vertretungsplaner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wert: value }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Das Recht konnte nicht geändert werden.')
        return
      }
      toast.success(value ? `${name} ist jetzt Vertretungsplaner` : `${name} ist kein Vertretungsplaner mehr`)
      setPending(null)
      onDone()
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarCog className="size-5 text-ws-muted" aria-hidden />
            Abwesenheitskalender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Label htmlFor="planner-switch" className="flex-1 cursor-pointer text-ws-text">
              Vertretungsplaner
            </Label>
            <Switch
              id="planner-switch"
              checked={overview.istVertretungsplaner || isSuperAdmin}
              disabled={saving}
              onCheckedChange={(on) => setPending(on)}
            />
          </div>
          <p className="text-sm text-ws-muted">
            Vertretungsplaner sehen, wo noch eine Vertretung fehlt, und haken sie ab.
            {isSuperAdmin && ' Ein Super-Admin gilt bei den Abwesenheiten immer als Vertretungsplaner.'}
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? 'Als Vertretungsplaner eintragen?' : 'Planer-Recht entziehen?'}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {name}
              {overview.email ? ` (${overview.email})` : ''}{' '}
              {pending
                ? 'darf danach den Vertretungsstatus bei den Abwesenheiten setzen.'
                : 'kann danach den Vertretungsstatus nicht mehr setzen. Frühere Haken bleiben erhalten.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              onClick={(e) => {
                e.preventDefault()
                if (pending !== null) void save(pending)
              }}
            >
              {pending ? 'Eintragen' : 'Entziehen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
