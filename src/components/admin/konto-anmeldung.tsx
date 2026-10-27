'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Mail, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KontoCard } from '@/components/admin/konto-card'
import { emailChangeSchema, passwordChangeSchema, PASSWORD_MIN } from '@/lib/konto'
import type { KontoHead } from '@/lib/konto-data'

const inputClass = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'
const primaryButton = 'min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover'
const outlineButton = 'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-ws-red">
      {message}
    </p>
  )
}

/** Antwort der Konto-Schnittstellen: `{ error, field? }` bei Fehlern */
async function send(url: string, method: string, payload?: unknown) {
  const res = await fetch(url, {
    method,
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
  return { ok: res.ok, body }
}

/** Karte „Anmeldung“: E-Mail-Adresse (= Anmeldename) und Passwort selbst ändern */
export function KontoAnmeldung({ head }: { head: Pick<KontoHead, 'email' | 'pendingEmail' | 'hasPassword'> }) {
  return (
    <KontoCard id="anmeldung" icon={KeyRound} title="Anmeldung" description="Mit der E-Mail-Adresse und deinem Passwort meldest du dich an.">
      <EmailForm email={head.email} pendingEmail={head.pendingEmail} hasPassword={head.hasPassword} />
      <div className="border-t border-ws-line" />
      <PasswordForm hasPassword={head.hasPassword} />
    </KontoCard>
  )
}

function EmailForm({ email, pendingEmail, hasPassword }: { email: string; pendingEmail: string | null; hasPassword: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState<'change' | 'resend' | 'cancel' | null>(null)

  async function change(e: React.FormEvent) {
    e.preventDefault()
    const parsed = emailChangeSchema.safeParse({ email: value })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    if (parsed.data.email === email.toLowerCase()) {
      setError('Das ist schon deine aktuelle Adresse.')
      return
    }
    setBusy('change')
    setError(undefined)
    try {
      const { ok, body } = await send('/api/profile/email', 'POST', parsed.data)
      if (!ok) {
        setError(body.error ?? 'Die Adresse konnte nicht geändert werden.')
        return
      }
      setValue('')
      toast.success('Wir haben dir einen Bestätigungslink geschickt.')
      router.refresh()
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setBusy(null)
    }
  }

  async function action(kind: 'resend' | 'cancel') {
    setBusy(kind)
    try {
      const { ok, body } = await send('/api/profile/email', kind === 'resend' ? 'PUT' : 'DELETE')
      if (!ok) {
        toast.error(body.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
        return
      }
      toast.success(kind === 'resend' ? 'Link erneut gesendet.' : 'Änderung abgebrochen.')
      router.refresh()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ws-faint">E-Mail-Adresse</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-ws-text">
          <Mail aria-hidden className="size-4 shrink-0 text-ws-muted" />
          <span className="min-w-0 truncate" title={email}>
            {email}
          </span>
        </p>
      </div>

      {pendingEmail ? (
        <div role="status" className="space-y-3 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-4">
          <p className="flex items-start gap-2 text-sm text-ws-text">
            <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ws-orange" />
            <span>
              Bestätigung ausstehend an <strong className="break-all">{pendingEmail}</strong>. Bis du den Link angeklickt hast, meldest du dich weiter mit {email} an.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => action('resend')} className={outlineButton}>
              {busy === 'resend' && <Loader2 className="mr-2 size-4 animate-spin" />}
              Link erneut senden
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => action('cancel')} className={outlineButton}>
              {busy === 'cancel' && <Loader2 className="mr-2 size-4 animate-spin" />}
              Änderung abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={change} noValidate className="space-y-2">
          <Label htmlFor="konto-email-neu" className="text-sm font-medium text-ws-text">
            Neue E-Mail-Adresse
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="konto-email-neu"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'konto-email-fehler' : 'konto-email-hinweis'}
              placeholder="neue@adresse.de"
              className={`${inputClass} sm:flex-1`}
            />
            <Button type="submit" disabled={busy !== null || value.trim() === ''} className={primaryButton}>
              {busy === 'change' && <Loader2 className="mr-2 size-4 animate-spin" />}
              Adresse ändern
            </Button>
          </div>
          <FieldError id="konto-email-fehler" message={error} />
          {!error && (
            <p id="konto-email-hinweis" className="text-xs text-ws-muted">
              Wir schicken einen Bestätigungslink an die neue Adresse. Erst nach dem Klick gilt sie für die Anmeldung.
            </p>
          )}
          {!hasPassword && (
            <p className="text-xs text-ws-muted">
              Du meldest dich über Google oder Apple an. Nach einer neuen Adresse passt diese Anmeldung eventuell nicht mehr zu deinem Konto.
            </p>
          )}
        </form>
      )}
    </div>
  )
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>>({})
  const [saving, setSaving] = useState(false)
  const title = hasPassword ? 'Passwort ändern' : 'Passwort festlegen'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { currentPassword: hasPassword ? current : undefined, newPassword: next, confirmPassword: confirm }
    const found: typeof errors = {}
    if (hasPassword && current === '') found.currentPassword = 'Bitte gib dein aktuelles Passwort ein.'
    const parsed = passwordChangeSchema.safeParse(payload)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors
        if (key && !found[key]) found[key] = issue.message
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const { ok, body } = await send('/api/profile/password', 'POST', { currentPassword: hasPassword ? current : undefined, newPassword: next })
      if (!ok) {
        const field = (['currentPassword', 'newPassword'] as const).find((f) => f === body.field) ?? 'newPassword'
        setErrors({ [field]: body.error ?? 'Das Passwort konnte nicht geändert werden.' })
        return
      }
      toast.success(hasPassword ? 'Passwort geändert.' : 'Passwort festgelegt.')
      // Passwörter bleiben nach dem Speichern nicht im Formular stehen
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch {
      setErrors({ newPassword: 'Netzwerkfehler. Bitte versuche es erneut.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    } finally {
      setSaving(false)
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, error: string | undefined, autoComplete: string, hint?: string) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-ws-text">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => set(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-fehler` : hint ? `${id}-hinweis` : undefined}
        className={`${inputClass} mt-1`}
      />
      <FieldError id={`${id}-fehler`} message={error} />
      {!error && hint && (
        <p id={`${id}-hinweis`} className="mt-1 text-xs text-ws-muted">
          {hint}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-4">
      <h3 className="text-sm font-semibold text-ws-text">{title}</h3>
      {!hasPassword && (
        <p className="text-sm text-ws-muted">Du meldest dich über Google oder Apple an. Mit einem Passwort kannst du dich zusätzlich mit E-Mail-Adresse anmelden.</p>
      )}
      {hasPassword && field('konto-pw-alt', 'Aktuelles Passwort', current, setCurrent, errors.currentPassword, 'current-password')}
      {field('konto-pw-neu', 'Neues Passwort', next, setNext, errors.newPassword, 'new-password', `Mindestens ${PASSWORD_MIN} Zeichen.`)}
      {field('konto-pw-wiederholen', 'Neues Passwort wiederholen', confirm, setConfirm, errors.confirmPassword, 'new-password')}
      <Button type="submit" disabled={saving} className={primaryButton}>
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        {title}
      </Button>
    </form>
  )
}
