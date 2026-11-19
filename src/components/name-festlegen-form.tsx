'use client'

import { useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { PersonNameFields, validatePersonName, type NameErrors } from '@/components/admin/person-name-fields'
import { createClient } from '@/lib/supabase-browser'
import { NAME_API_PATH, START_PATH } from '@/lib/roles'
import type { WorkspaceTheme } from '@/lib/workspace-theme'

/**
 * Pflicht-Seite „Wie heißt du?“ (PROJ-121). Der Türsteher und die Start-Weiche
 * schicken Lehrer-Rollen ohne Namen hierher, bis Vor- und Nachname gespeichert
 * sind. Eigenständig, ohne Seitenleiste, damit nichts anderes bedienbar ist.
 */
export function NameFestlegenForm({
  initialFirstName,
  initialLastName,
  theme,
}: {
  initialFirstName: string
  initialLastName: string
  theme: WorkspaceTheme
}) {
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [errors, setErrors] = useState<NameErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const result = validatePersonName(firstName, lastName, true)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const res = await fetch(NAME_API_PATH, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const body = await res.json().catch(() => ({}))
      if (res.status === 403) {
        // Keine Lehrer-Rolle (mehr): hier gibt es nichts zu tun
        window.location.href = START_PATH
        return
      }
      if (!res.ok) {
        if (body?.field === 'firstName' || body?.field === 'lastName') {
          setErrors({ [body.field]: body.error })
        } else {
          setFormError(body?.error ?? 'Der Name konnte nicht gespeichert werden.')
        }
        return
      }
      setDone(true)
      toast.success(`Danke, ${body?.firstName ?? result.value.firstName}!`)
      // Kurz warten, damit die Bestätigung zu sehen ist; volle Navigation, damit der Türsteher neu entscheidet
      setTimeout(() => {
        window.location.href = START_PATH
      }, 800)
    } catch {
      setFormError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    setLoggingOut(true)
    try {
      await createClient().auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div data-ws-theme={theme} className="ws-root flex min-h-svh flex-col items-center bg-ws-bg px-4 py-12 text-ws-text">
      <main className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-ws-green/15">
          <UserRound className="size-8 text-ws-green" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-ws-text">Wie heißt du?</h1>
        <p className="mb-8 mt-2 text-center text-base leading-relaxed text-ws-muted">
          Dein Kollegium sieht dich mit diesem Namen.
        </p>

        {formError && (
          <div role="alert" className="mb-4 rounded-xl border border-ws-red/30 bg-ws-red/15 px-4 py-3 text-sm text-ws-red">
            {formError}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <PersonNameFields
            idPrefix="name-festlegen"
            firstName={firstName}
            lastName={lastName}
            onFirstNameChange={(v) => {
              setFirstName(v)
              if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: undefined }))
            }}
            onLastNameChange={(v) => {
              setLastName(v)
              if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: undefined }))
            }}
            errors={errors}
            disabled={saving || done}
            autoFocus
          />
          <Button
            type="submit"
            disabled={saving || done}
            className="min-h-12 w-full rounded-xl bg-ws-green text-base font-semibold text-ws-on-accent hover:bg-ws-green-hover"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            Weiter
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          onClick={logout}
          disabled={loggingOut}
          className="mt-4 min-h-11 w-full rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
        >
          Abmelden
        </Button>
      </main>
      <Toaster theme={theme} />
    </div>
  )
}
