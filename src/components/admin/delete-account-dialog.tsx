'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DELETE_FAILED_MESSAGE,
  DELETED_ACCOUNT_LABEL,
  deleteConfirmationMatches,
  type DeletePreview,
} from '@/lib/konto-loeschen'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; display_name: string | null; email: string | null } | null
  /** Nach erfolgreichem Löschen (Dialog ist dann schon zu) */
  onDeleted: () => void
}

/**
 * „Konto löschen“ (PROJ-60, nur Super-Admin): zeigt vor dem Löschen, was
 * verschwindet und was anonym bleibt. „Endgültig löschen“ wird erst aktiv, wenn
 * die E-Mail-Adresse eingetippt ist; der Server prüft sie noch einmal selbst.
 */
export function DeleteAccountDialog({ open, onOpenChange, user, onDeleted }: DeleteAccountDialogProps) {
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    setPreview(null)
    setLoadError(null)
    setTyped('')
    setError(null)
    fetch(`/api/admin/users/${userId}/delete`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setLoadError(data?.error ?? 'Die Vorschau konnte nicht geladen werden.')
        else setPreview(data as DeletePreview)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Keine Verbindung. Bitte erneut versuchen.')
      })
    return () => {
      cancelled = true
    }
  }, [open, userId])

  const label = user?.display_name ?? user?.email ?? 'Konto'
  const matches = deleteConfirmationMatches(typed, preview?.email)

  async function submit() {
    if (!user || !matches) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: typed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(res.status === 404 ? 'Konto nicht gefunden' : (data?.error ?? DELETE_FAILED_MESSAGE))
        return
      }
      toast.success('Konto gelöscht')
      onOpenChange(false)
      onDeleted()
    } catch {
      setError(DELETE_FAILED_MESSAGE)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Konto endgültig löschen?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-ws-muted">
              <p>
                <span className="font-medium text-ws-text">{label}</span> wird dauerhaft gelöscht. Das lässt sich nicht
                rückgängig machen.
              </p>
              <div>
                <p className="font-medium text-ws-text">Wird gelöscht</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Login, E-Mail, Anzeigename und Pseudonym</li>
                  <li>XP, Streak und Frachtmünzen</li>
                  <li>Hof, Betrieb und gekaufte Items</li>
                  <li>Lernverlauf, Badges und Blitzrunden</li>
                  <li>Push-Abos und Platz in der Rangliste</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-ws-text">Bleibt anonym erhalten</p>
                {loadError ? (
                  <p role="alert" className="text-ws-red">
                    {loadError}
                  </p>
                ) : !preview ? (
                  <p>Wird geladen …</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      {preview.assessments}{' '}
                      {preview.assessments === 1 ? 'benoteter Leistungsnachweis' : 'benotete Leistungsnachweise'}, in
                      der Auswertung als „{DELETED_ACCOUNT_LABEL}“
                    </li>
                    {preview.ownContent > 0 && (
                      <li>
                        {preview.ownContent} {preview.ownContent === 1 ? 'eigener Inhalt' : 'eigene Inhalte'} (Fragen,
                        Zusammenstellungen, Nachweise, Forum), Autor: „{DELETED_ACCOUNT_LABEL}“
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview?.email && (
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Zur Bestätigung „{preview.email}“ eintippen</Label>
            <Input
              id="delete-confirm"
              type="email"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={submitting}
            className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
          >
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              submit()
            }}
            disabled={!matches || submitting}
            className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Endgültig löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
