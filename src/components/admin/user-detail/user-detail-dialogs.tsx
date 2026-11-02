'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Pencil } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { emailChangeSchema } from '@/lib/konto'
import { displayNameSchema, resetConfirmationMatches } from '@/lib/user-detail'

const cancelButton = 'min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised'
const primaryButton = 'min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover'
const inputClass = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text'

async function post(url: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (res.ok) return { ok: true }
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data?.error ?? 'Aktion fehlgeschlagen.' }
  } catch {
    return { ok: false, error: 'Keine Verbindung. Bitte erneut versuchen.' }
  }
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
      {message}
    </p>
  )
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onDone: () => void
}

export function RenameDialog({
  open,
  onOpenChange,
  userId,
  currentName,
  onDone,
}: DialogProps & { currentName: string | null }) {
  // Der Inhalt hängt nur im geöffneten Dialog: jedes Öffnen beginnt mit frischem Zustand
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text sm:max-w-md">
        <RenameForm onOpenChange={onOpenChange} userId={userId} currentName={currentName} onDone={onDone} />
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  onOpenChange,
  userId,
  currentName,
  onDone,
}: Omit<DialogProps, 'open'> & { currentName: string | null }) {
  const [name, setName] = useState(currentName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const parsed = displayNameSchema.safeParse(name)
  const unchanged = parsed.success && parsed.data === (currentName ?? '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed.success || unchanged) return
    setSubmitting(true)
    setError(null)
    const result = await post(`/api/admin/users/${userId}/rename`, {
      name: parsed.data,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? null)
      return
    }
    toast.success('Name geändert')
    onOpenChange(false)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="size-5 text-ws-muted" aria-hidden />
          Name ändern
        </DialogTitle>
        <DialogDescription className="text-ws-muted">
          Der Anzeigename erscheint in Listen und in der Rangliste. Ein Pseudonym bleibt unverändert.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="detail-name">Anzeigename</Label>
        <Input
          id="detail-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          maxLength={80}
          aria-invalid={!parsed.success && name.length > 0}
          className={inputClass}
        />
        {!parsed.success && name.length > 0 && <p className="text-sm text-ws-red">{parsed.error.issues[0]?.message}</p>}
      </div>
      <ErrorLine message={error} />
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          className={cancelButton}
        >
          Abbrechen
        </Button>
        <Button type="submit" disabled={submitting || !parsed.success || unchanged} className={primaryButton}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Speichern
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EmailDialog({
  open,
  onOpenChange,
  userId,
  currentEmail,
  onDone,
}: DialogProps & { currentEmail: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text sm:max-w-md">
        <EmailForm onOpenChange={onOpenChange} userId={userId} currentEmail={currentEmail} onDone={onDone} />
      </DialogContent>
    </Dialog>
  )
}

function EmailForm({
  onOpenChange,
  userId,
  currentEmail,
  onDone,
}: Omit<DialogProps, 'open'> & { currentEmail: string | null }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const parsed = emailChangeSchema.safeParse({ email })
  const same = parsed.success && parsed.data.email === (currentEmail ?? '').toLowerCase()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed.success || same) return
    setSubmitting(true)
    setError(null)
    const result = await post(`/api/admin/users/${userId}/email`, {
      email: parsed.data.email,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? null)
      return
    }
    toast.success('E-Mail geändert')
    onOpenChange(false)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mail className="size-5 text-ws-muted" aria-hidden />
          E-Mail ändern
        </DialogTitle>
        <DialogDescription className="text-ws-muted">
          Die neue Adresse gilt sofort und ist der neue Anmeldename. Es wird keine Bestätigungsmail verschickt.
        </DialogDescription>
      </DialogHeader>
      {currentEmail && (
        <p className="text-sm text-ws-muted">
          Aktuell: <span className="font-medium text-ws-text">{currentEmail}</span>
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="detail-email">Neue E-Mail-Adresse</Label>
        <Input
          id="detail-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="detail-email-hint"
          className={inputClass}
        />
        <p id="detail-email-hint" className="text-sm text-ws-muted">
          Der Fachbereich wird nicht automatisch an die neue Adresse angepasst. Das geht in der Nutzerliste über „In
          anderen Fachbereich verschieben“.
        </p>
        {same && <p className="text-sm text-ws-red">Das ist schon die aktuelle Adresse.</p>}
      </div>
      <ErrorLine message={error} />
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          className={cancelButton}
        >
          Abbrechen
        </Button>
        <Button type="submit" disabled={submitting || !parsed.success || same} className={primaryButton}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          E-Mail ändern
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ResetProgressDialog({
  open,
  onOpenChange,
  userId,
  confirmLabel,
  onDone,
}: DialogProps & { confirmLabel: string }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
        <ResetForm onOpenChange={onOpenChange} userId={userId} confirmLabel={confirmLabel} onDone={onDone} />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ResetForm({
  onOpenChange,
  userId,
  confirmLabel,
  onDone,
}: Omit<DialogProps, 'open'> & { confirmLabel: string }) {
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const matches = resetConfirmationMatches(typed, confirmLabel)

  async function submit() {
    if (!matches) return
    setSubmitting(true)
    setError(null)
    const result = await post(`/api/admin/users/${userId}/reset-progress`, {
      confirmName: typed,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? null)
      return
    }
    toast.success('Fortschritt zurückgesetzt')
    onOpenChange(false)
    onDone()
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Fortschritt wirklich zurücksetzen?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-ws-muted">
            <p>
              Für <span className="font-medium text-ws-text">{confirmLabel}</span> geht dauerhaft verloren:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>XP, Level, Streak und Frachtmünzen</li>
              <li>Lernverlauf und Prüfungssimulationen</li>
              <li>Badges und Blitzrunden</li>
              <li>Gekaufte Items und der Aufbau von Hof und Betrieb</li>
            </ul>
            <p>
              <span className="font-medium text-ws-text">Nicht betroffen:</span> Leistungsnachweise und ihre Noten.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-2">
        <Label htmlFor="reset-confirm">Zur Bestätigung „{confirmLabel}“ eintippen</Label>
        <Input
          id="reset-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={inputClass}
        />
      </div>
      <ErrorLine message={error} />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>Abbrechen</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault()
            submit()
          }}
          disabled={!matches || submitting}
          className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent"
        >
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Zurücksetzen
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}

export { post as postJson }
