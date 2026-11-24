import { parseBulkRole, type PreviewRow, type RawAccountRow } from '@/lib/account-create'

/**
 * Prüfregeln für „Konten aus Liste anlegen“ (PROJ-62). Reine Logik ohne
 * Datenbank: Die Schnittstellen laden Bereiche und vorhandene E-Mails und
 * geben sie hier hinein. Dieselben Regeln gelten für die Vorschau und noch
 * einmal beim Anlegen.
 */

export interface DepartmentOption {
  id: string
  code: string
  name: string
  /** Eigene Adresse des Bereichs (z. B. für Tourismus), sonst `null` */
  domain: string | null
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const NAME_MAX_LENGTH = 100
export const EMAIL_MAX_LENGTH = 254

export const REASONS = {
  nameEmpty: 'Name fehlt.',
  nameTooLong: `Name ist länger als ${NAME_MAX_LENGTH} Zeichen.`,
  emailInvalid: 'E-Mail ungültig.',
  emailDuplicate: 'E-Mail steht mehrfach in der Datei.',
  departmentUnknown: 'Bereich unbekannt.',
  departmentMissing: 'Kein Bereich angegeben und keiner für alle gewählt.',
  roleAdmin: 'Admin-Rollen nur einzeln anlegen.',
  roleUnknown: 'Rolle unbekannt (erlaubt: Azubi, Lehrkraft).',
  exists: 'Konto existiert schon – Passwort ggf. über „Passwort neu vergeben“ setzen.',
} as const

const ADMIN_WORDS = ['admin', 'administrator', 'superadmin', 'bereichsadmin']

/** Adresse der App für die Zugangszettel: Bereichs-Domain, sonst `null` (dann gilt die aktuelle Adresse) */
export function appUrlFor(domain: string | null | undefined): string | null {
  const d = domain?.trim()
  if (!d) return null
  return /^https?:\/\//.test(d) ? d.replace(/\/+$/, '') : `https://${d.replace(/\/+$/, '')}`
}

/** Bereich aus der Datei (Kürzel oder Name, Groß-/Kleinschreibung egal); leer = Bereich für alle */
export function resolveDepartmentValue(
  value: string,
  defaultDepartmentId: string | null,
  departments: readonly DepartmentOption[],
): { department: DepartmentOption | null; reason: string | null } {
  const wanted = value.trim().toLowerCase()
  if (wanted === '') {
    const fallback = departments.find((d) => d.id === defaultDepartmentId) ?? null
    return fallback ? { department: fallback, reason: null } : { department: null, reason: REASONS.departmentMissing }
  }
  const match = departments.find((d) => d.code.toLowerCase() === wanted || d.name.toLowerCase() === wanted)
  return match ? { department: match, reason: null } : { department: null, reason: REASONS.departmentUnknown }
}

function roleReason(value: string): string {
  const word = value.toLowerCase().replace(/[^a-zäöü]/g, '')
  return ADMIN_WORDS.includes(word) ? REASONS.roleAdmin : REASONS.roleUnknown
}

/**
 * Jede Zeile bekommt OK, Warnung oder Fehler mit Begründung. Fehler gehen
 * vor (eine ungültige Zeile wird nie angelegt); „existiert schon“ ist eine
 * Warnung, weil das bestehende Konto unverändert bleibt.
 */
export function validateBulkRows(
  rows: readonly RawAccountRow[],
  ctx: {
    defaultDepartmentId: string | null
    departments: readonly DepartmentOption[]
    /** Vorhandene E-Mails, klein geschrieben */
    existingEmails: ReadonlySet<string>
  },
): PreviewRow[] {
  const seen = new Map<string, number>()
  for (const row of rows) {
    const email = row.email.trim().toLowerCase()
    if (email) seen.set(email, (seen.get(email) ?? 0) + 1)
  }

  return rows.map((row) => {
    const name = row.name.trim()
    const email = row.email.trim().toLowerCase()
    const role = parseBulkRole(row.role)
    const { department, reason: departmentReason } = resolveDepartmentValue(
      row.department,
      ctx.defaultDepartmentId,
      ctx.departments,
    )

    const errors: string[] = []
    if (name === '') errors.push(REASONS.nameEmpty)
    else if (name.length > NAME_MAX_LENGTH) errors.push(REASONS.nameTooLong)
    if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) errors.push(REASONS.emailInvalid)
    else if ((seen.get(email) ?? 0) > 1) errors.push(REASONS.emailDuplicate)
    if (departmentReason) errors.push(departmentReason)
    if (role === null) errors.push(roleReason(row.role))

    const base = {
      line: row.line,
      name,
      email,
      departmentId: department?.id ?? null,
      departmentName: department?.name ?? null,
      role,
    }
    if (errors.length > 0) return { ...base, status: 'error' as const, reason: errors.join(' ') }
    if (ctx.existingEmails.has(email)) return { ...base, status: 'warning' as const, reason: REASONS.exists }
    return { ...base, status: 'ok' as const, reason: null }
  })
}
