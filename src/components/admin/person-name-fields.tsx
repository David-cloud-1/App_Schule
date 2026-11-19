'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { personNameSchema, NAME_PART_MAX } from '@/lib/personen-name'

export type NameErrors = { firstName?: string; lastName?: string }

/**
 * Prüft beide Felder mit der gemeinsamen Regel (PROJ-121) und liefert die
 * Meldung je Feld. Leere Felder zeigen erst nach dem Absenden eine Meldung
 * (`showEmpty`), damit niemand beim Tippen angemeckert wird.
 */
export function validatePersonName(
  firstName: string,
  lastName: string,
  showEmpty: boolean,
): { ok: true; value: { firstName: string; lastName: string } } | { ok: false; errors: NameErrors } {
  const parsed = personNameSchema.safeParse({ firstName, lastName })
  if (parsed.success) return { ok: true, value: parsed.data }
  const errors: NameErrors = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof NameErrors | undefined
    if (!field || errors[field]) continue
    const isEmpty = (field === 'firstName' ? firstName : lastName).trim() === ''
    if (isEmpty && !showEmpty) continue
    errors[field] = issue.message
  }
  return { ok: false, errors }
}

/**
 * Zwei Felder „Vorname“ und „Nachname“ (PROJ-121). Eine Quelle für die
 * Pflicht-Seite, „Mein Konto“ und den Umbenennen-Dialog des Super-Admins.
 * Farben nur über `ws-*`-Tokens.
 */
export function PersonNameFields({
  idPrefix,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  errors,
  disabled,
  autoFocus,
  layout = 'stacked',
}: {
  idPrefix: string
  firstName: string
  lastName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  errors: NameErrors
  disabled?: boolean
  autoFocus?: boolean
  layout?: 'stacked' | 'row'
}) {
  const inputClass =
    'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'
  return (
    <div className={layout === 'row' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-4'}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-vorname`} className="text-ws-muted">
          Vorname
        </Label>
        <Input
          id={`${idPrefix}-vorname`}
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          maxLength={NAME_PART_MAX + 10}
          autoComplete="given-name"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={!!errors.firstName}
          aria-describedby={errors.firstName ? `${idPrefix}-vorname-fehler` : undefined}
          className={inputClass}
        />
        {errors.firstName && (
          <p id={`${idPrefix}-vorname-fehler`} role="alert" className="text-sm text-ws-red">
            {errors.firstName}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nachname`} className="text-ws-muted">
          Nachname
        </Label>
        <Input
          id={`${idPrefix}-nachname`}
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          maxLength={NAME_PART_MAX + 10}
          autoComplete="family-name"
          disabled={disabled}
          aria-invalid={!!errors.lastName}
          aria-describedby={errors.lastName ? `${idPrefix}-nachname-fehler` : undefined}
          className={inputClass}
        />
        {errors.lastName && (
          <p id={`${idPrefix}-nachname-fehler`} role="alert" className="text-sm text-ws-red">
            {errors.lastName}
          </p>
        )}
      </div>
    </div>
  )
}
