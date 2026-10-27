'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
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
import { PASSWORD_MIN_LENGTH, suggestPassword } from '@/lib/password-suggestion'

interface SetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; display_name: string | null; email: string | null; banned: boolean } | null
}

/**
 * „Passwort neu vergeben“ (PROJ-58): Vorschlag übernehmen oder selbst tippen,
 * danach einmal gut lesbar anzeigen. Beim Schließen ist das Passwort weg.
 */
export function SetPasswordDialog({ open, onOpenChange, user }: SetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setPassword(suggestPassword())
    setError(null)
    setDone(false)
    setCopied(false)
  }, [open])

  // Passwort nicht länger im Speicher halten als nötig
  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) setPassword('')
    onOpenChange(next)
  }

  const label = user?.display_name ?? user?.email ?? 'Konto'
  const tooShort = password.length < PASSWORD_MIN_LENGTH

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || tooShort) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Passwort konnte nicht gesetzt werden.')
        return
      }
      setDone(true)
      toast.success(`Passwort für ${label} gesetzt`)
    } catch {
      setError('Keine Verbindung. Bitte erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      toast.error('Kopieren nicht möglich – bitte abschreiben.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text sm:max-w-md">
        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-5 text-ws-muted" aria-hidden="true" />
                Passwort neu vergeben
              </DialogTitle>
              <DialogDescription className="text-ws-muted">
                Für <span className="font-medium text-ws-text">{label}</span>
                {user?.display_name && user.email ? ` (${user.email})` : ''}. Beim nächsten Login legt die Person
                ein eigenes Passwort fest. Andere Geräte werden abgemeldet.
              </DialogDescription>
            </DialogHeader>

            {user?.banned && (
              <p className="flex items-start gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Konto ist gesperrt – Login erst nach Entsperren möglich.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={tooShort}
                  aria-describedby="new-password-hint"
                  className="min-h-11 flex-1 rounded-xl border-ws-line bg-ws-bg font-mono text-ws-text"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(suggestPassword())}
                  aria-label="Neuer Vorschlag"
                  title="Neuer Vorschlag"
                  className="size-11 shrink-0 rounded-xl border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              <p id="new-password-hint" className={tooShort ? 'text-sm text-ws-red' : 'text-sm text-ws-muted'}>
                {tooShort
                  ? `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`
                  : 'Vorschlag übernehmen oder selbst eins eintippen.'}
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={submitting || tooShort}
                className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {error ? 'Erneut versuchen' : 'Passwort setzen'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Passwort gesetzt</DialogTitle>
              <DialogDescription className="text-ws-muted">
                Teile das Passwort jetzt mit {label}. Es wird nicht gespeichert und ist später nicht mehr abrufbar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-xl border border-ws-line bg-ws-bg p-3">
              <output
                aria-label="Neues Passwort"
                className="flex-1 break-all font-mono text-xl font-semibold tracking-wide text-ws-text"
              >
                {password}
              </output>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="min-h-11 shrink-0 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
              >
                {copied ? <Check className="mr-1 size-4 text-ws-green" /> : <Copy className="mr-1 size-4" />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              >
                Fertig
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
