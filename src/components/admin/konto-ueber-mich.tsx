'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, IdCard, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KontoCard } from '@/components/admin/konto-card'
import { teacherRoleLabel } from '@/lib/admin-nav'
import { KUERZEL_HINT, KUERZEL_MAX, parseKuerzel } from '@/lib/konto'
import { ROLE_DESCRIPTION } from '@/lib/roles'
import type { KontoHead } from '@/lib/konto-data'

/** Karte „Über mich“: Name, Kürzel (selbst änderbar), Rolle und Fachbereich */
export function KontoUeberMich({ head }: { head: KontoHead }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(head.kuerzel ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setValue(head.kuerzel ?? '')
    setError(null)
    setEditing(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseKuerzel(value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/kuerzel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kuerzel: parsed.value }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error ?? 'Das Kürzel konnte nicht gespeichert werden.')
        return
      }
      toast.success(parsed.value ? 'Kürzel gespeichert.' : 'Kürzel entfernt.')
      setEditing(false)
      router.refresh()
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = teacherRoleLabel(head.role, head.departmentName ?? '')

  return (
    <KontoCard id="ueber-mich" icon={IdCard} title="Über mich">
      <div className="space-y-1">
        <p className="break-words text-xl font-bold tracking-tight text-ws-text">{head.displayName}</p>
        <p className="text-sm font-semibold text-ws-green">{roleLabel}</p>
        <p className="max-w-prose text-sm text-ws-muted">{ROLE_DESCRIPTION[head.role]}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ws-faint">Fachbereich</dt>
          <dd className="mt-1 text-sm text-ws-text">{head.departmentName ?? 'Kein Fachbereich'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ws-faint">Kürzel</dt>
          <dd className="mt-1">
            {editing ? (
              <form onSubmit={save} className="space-y-2" noValidate>
                <Label htmlFor="konto-kuerzel" className="sr-only">
                  Kürzel
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="konto-kuerzel"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={KUERZEL_MAX + 2}
                    autoFocus
                    autoComplete="off"
                    aria-invalid={!!error}
                    aria-describedby="konto-kuerzel-hinweis"
                    placeholder="z. B. MU"
                    className="min-h-11 w-28 rounded-xl border-ws-line bg-ws-bg uppercase text-ws-text focus-visible:ring-ws-green"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={saving}
                    aria-label="Kürzel speichern"
                    className="size-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                    aria-label="Abbrechen"
                    className="size-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
                  >
                    <X />
                  </Button>
                </div>
                <p id="konto-kuerzel-hinweis" role={error ? 'alert' : undefined} className={`text-xs ${error ? 'text-ws-red' : 'text-ws-muted'}`}>
                  {error ?? `${KUERZEL_HINT}. Leer lassen entfernt das Kürzel.`}
                </p>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                {head.kuerzel ? (
                  <span className="rounded-full border border-ws-green/30 bg-ws-green/15 px-3 py-1 text-sm font-bold text-ws-green">{head.kuerzel}</span>
                ) : (
                  <span className="text-sm text-ws-muted">Noch keins gesetzt</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={startEdit}
                  aria-label={head.kuerzel ? 'Kürzel ändern' : 'Kürzel festlegen'}
                  className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
                >
                  <Pencil />
                </Button>
              </div>
            )}
          </dd>
        </div>
      </dl>
    </KontoCard>
  )
}
