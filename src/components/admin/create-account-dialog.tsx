'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Loader2, Printer, RefreshCw, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AccessSlipsPrint } from '@/components/admin/access-slips'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { SINGLE_ROLE_OPTIONS, type CreatedAccount, type SingleRole } from '@/lib/account-create'
import { PASSWORD_MIN_LENGTH, suggestPassword } from '@/lib/password-suggestion'

interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nach dem Anlegen, damit die Nutzerliste neu lädt */
  onCreated: () => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * „Konto anlegen · Einzeln“ (PROJ-62, nur Super-Admin): Name, E-Mail, Rolle,
 * Bereich und Start-Passwort. Danach stehen die Zugangsdaten einmal gut lesbar
 * da, mit „Kopieren“ und „Zettel drucken“. Beim Schließen ist das Passwort weg.
 */
export function CreateAccountDialog({ open, onOpenChange, onCreated }: CreateAccountDialogProps) {
  const { scope } = useAdminRole()
  const departments = useMemo(() => (scope?.departments ?? []).filter((d) => d.isActive !== false), [scope])
  // Der Dialog füllt sich nur beim Öffnen neu: ein Wechsel der Bereichsleiste im Hintergrund darf
  // weder Eingaben noch angezeigte Zugangsdaten löschen
  const initial = useRef({ current: scope?.current ?? null, departments })
  useEffect(() => {
    initial.current = { current: scope?.current ?? null, departments }
  }, [scope, departments])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<SingleRole>('student')
  const [departmentId, setDepartmentId] = useState('')
  const [password, setPassword] = useState('')
  const [adminConfirmed, setAdminConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAccount | null>(null)
  const [copied, setCopied] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setRole('student')
    // Voreingestellt ist der Bereich, in dem der Super-Admin gerade arbeitet (PROJ-29), sofern er aktiv ist
    const { current, departments: available } = initial.current
    setDepartmentId(
      current && available.some((d) => d.id === current) ? current : available.length === 1 ? available[0].id : '',
    )
    setPassword(suggestPassword())
    setAdminConfirmed(false)
    setError(null)
    setCreated(null)
    setCopied(false)
    setPrinting(false)
  }, [open])

  const appUrl = typeof window === 'undefined' ? '' : window.location.origin
  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const emailValid = EMAIL_PATTERN.test(trimmedEmail)
  const passwordValid = password.length >= PASSWORD_MIN_LENGTH
  const needsConfirm = role === 'admin'
  const formValid =
    trimmedName.length > 0 && emailValid && passwordValid && departmentId !== '' && (!needsConfirm || adminConfirmed)

  // Passwort nicht länger im Speicher halten als nötig
  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) {
      setPassword('')
      setCreated(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, role, departmentId, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Konto konnte nicht angelegt werden.')
        return
      }
      setCreated(data.account as CreatedAccount)
      toast.success(`Konto für ${trimmedName} angelegt`)
      onCreated()
    } catch {
      setError('Keine Verbindung. Bitte erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!created) return
    const text = [`Adresse: ${created.appUrl ?? appUrl}`, `E-Mail: ${created.email}`, `Start-Passwort: ${created.password}`].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      toast.error('Kopieren nicht möglich – bitte abschreiben.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-ws-surface border-ws-line text-ws-text sm:max-w-md">
          {!created ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-ws-muted" aria-hidden="true" />
                  Konto anlegen
                </DialogTitle>
                <DialogDescription className="text-ws-muted">
                  Die Person kann sofort loslegen, ohne Registrierung und ohne Bestätigungs-Mail. Beim ersten Login
                  legt sie ein eigenes Passwort fest.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="new-account-name">Anzeigename</Label>
                <Input
                  id="new-account-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  maxLength={100}
                  className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-email">E-Mail</Label>
                <Input
                  id="new-account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  aria-invalid={trimmedEmail !== '' && !emailValid}
                  className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                />
                {trimmedEmail !== '' && !emailValid && (
                  <p className="text-sm text-ws-red">Bitte eine gültige E-Mail-Adresse eintragen.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label id="new-account-role-label">Rolle</Label>
                <AdminSegmented
                  value={role}
                  onChange={(value) => {
                    setRole(value)
                    setAdminConfirmed(false)
                  }}
                  options={SINGLE_ROLE_OPTIONS}
                  ariaLabel="Rolle"
                />
              </div>

              {needsConfirm && (
                <div className="flex items-start gap-3 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3">
                  <Checkbox
                    id="new-account-admin-confirm"
                    checked={adminConfirmed}
                    onCheckedChange={(checked) => setAdminConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="new-account-admin-confirm"
                    className="min-h-11 cursor-pointer text-sm font-normal leading-snug text-ws-orange"
                  >
                    Ich bestätige: Diese Person bekommt alle Rechte des Super-Admins.
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-account-department">Bereich</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger
                    id="new-account-department"
                    className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                  >
                    <SelectValue placeholder="Bereich wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-account-password">Start-Passwort</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-account-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={!passwordValid}
                    aria-describedby="new-account-password-hint"
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
                <p id="new-account-password-hint" className={passwordValid ? 'text-sm text-ws-muted' : 'text-sm text-ws-red'}>
                  {passwordValid
                    ? 'Vorschlag übernehmen oder selbst eins eintippen.'
                    : `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}
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
                  disabled={submitting || !formValid}
                  className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                >
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {error ? 'Erneut versuchen' : 'Konto anlegen'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Konto angelegt</DialogTitle>
                <DialogDescription className="text-ws-muted">
                  Gib {created.name} diese Zugangsdaten jetzt weiter. Das Passwort wird nicht gespeichert und ist
                  später nicht mehr abrufbar.
                </DialogDescription>
              </DialogHeader>

              <dl className="space-y-3 rounded-xl border border-ws-line bg-ws-bg p-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ws-faint">Adresse</dt>
                  <dd className="break-all text-sm text-ws-text">{created.appUrl ?? appUrl}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ws-faint">E-Mail</dt>
                  <dd className="break-all text-sm text-ws-text">{created.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ws-faint">Start-Passwort</dt>
                  <dd>
                    <output
                      aria-label="Start-Passwort"
                      className="break-all font-mono text-xl font-semibold tracking-wide text-ws-text"
                    >
                      {created.password}
                    </output>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                >
                  {copied ? <Check className="mr-1 size-4 text-ws-green" /> : <Copy className="mr-1 size-4" />}
                  {copied ? 'Kopiert' : 'Kopieren'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrinting(true)}
                  className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                >
                  <Printer className="mr-1 size-4" />
                  Zettel drucken
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

      {printing && created && (
        <AccessSlipsPrint accounts={[created]} appUrl={appUrl} onDone={() => setPrinting(false)} />
      )}
    </>
  )
}
