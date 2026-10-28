'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KontoCard } from '@/components/admin/konto-card'
import { emailChangeSchema, passwordChangeSchema, PASSWORD_MIN } from '@/lib/konto'
import type { KontoHead } from '@/lib/konto-data'

const inputClass = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'
const primaryButton = 'min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover'

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
export function KontoAnmeldung({ head }: { head: Pick<KontoHead, 'email' | 'hasPassword'> }) {
  return (
    <KontoCard id="anmeldung" icon={KeyRound} title="Anmeldung" description="Mit der E-Mail-Adresse und deinem Passwort meldest du dich an.">
      <EmailForm email={head.email} hasPassword={head.hasPassword} />
      <div className="border-t border-ws-line" />
      <PasswordForm hasPassword={head.hasPassword} />
    </KontoCard>
  )
}

type EmailErrors = Partial<Record<'email' | 'confirmEmail' | 'currentPassword', string>>

/**
 * Diese App verschickt keine Bestätigungs-Mails, eine neue Adresse gilt daher
 * sofort für die Anmeldung. Gegen Tippfehler und fremde Hände: Adresse zweimal
 * eingeben und das aktuelle Passwort bestätigen.
 */
function EmailForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<EmailErrors>({})
  const [saving, setSaving] = useState(false)

  async function change(e: React.FormEvent) {
    e.preventDefault()
    const found: EmailErrors = {}
    const parsed = emailChangeSchema.safeParse({ email: value })
    if (!parsed.success) found.email = parsed.error.issues[0].message
    else if (parsed.data.email === email.toLowerCase()) found.email = 'Das ist schon deine aktuelle Adresse.'
    else if (confirm.trim().toLowerCase() !== parsed.data.email) found.confirmEmail = 'Die beiden Adressen sind nicht gleich.'
    if (password === '') found.currentPassword = 'Bitte gib dein aktuelles Passwort ein.'
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const { ok, body } = await send('/api/profile/email', 'POST', { email: value, currentPassword: password })
      if (!ok) {
        const field = body.field === 'currentPassword' ? 'currentPassword' : 'email'
        setErrors({ [field]: body.error ?? 'Die Adresse konnte nicht geändert werden.' })
        return
      }
      toast.success('E-Mail-Adresse geändert. Melde dich ab jetzt mit der neuen Adresse an.')
      setValue('')
      setConfirm('')
      router.refresh()
    } catch {
      setErrors({ email: 'Netzwerkfehler. Bitte versuche es erneut.' })
    } finally {
      // Das Passwort bleibt nach dem Absenden nie im Formular stehen
      setPassword('')
      setSaving(false)
    }
  }

  const field = (id: string, label: string, props: React.ComponentProps<typeof Input>, error: string | undefined) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-ws-text">
        {label}
      </Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-fehler` : undefined} className={`${inputClass} mt-1`} {...props} />
      <FieldError id={`${id}-fehler`} message={error} />
    </div>
  )

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ws-faint">E-Mail-Adresse (Anmeldename)</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-ws-text">
          <Mail aria-hidden className="size-4 shrink-0 text-ws-muted" />
          <span className="min-w-0 truncate" title={email}>
            {email}
          </span>
        </p>
      </div>

      {!hasPassword ? (
        <p className="text-sm text-ws-muted">
          Du meldest dich über Google oder Apple an. Die Adresse kannst du dort ändern, hier nicht.
        </p>
      ) : (
        <form onSubmit={change} noValidate className="max-w-md space-y-4">
          <h3 className="text-sm font-semibold text-ws-text">E-Mail-Adresse ändern</h3>
          <p className="text-sm text-ws-muted">
            Die neue Adresse gilt sofort für die Anmeldung. Es wird keine Bestätigungs-Mail verschickt, bitte tippe sie deshalb sorgfältig.
          </p>
          {field('konto-email-neu', 'Neue E-Mail-Adresse', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'neue@adresse.de', value, onChange: (e) => setValue(e.target.value) }, errors.email)}
          {field('konto-email-wiederholen', 'Neue Adresse wiederholen', { type: 'email', inputMode: 'email', autoComplete: 'off', value: confirm, onChange: (e) => setConfirm(e.target.value), onPaste: (e) => e.preventDefault() }, errors.confirmEmail)}
          {field('konto-email-passwort', 'Aktuelles Passwort', { type: 'password', autoComplete: 'current-password', value: password, onChange: (e) => setPassword(e.target.value) }, errors.currentPassword)}
          <Button type="submit" disabled={saving} className={primaryButton}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Adresse ändern
          </Button>
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
