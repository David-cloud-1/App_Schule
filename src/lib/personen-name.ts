import { z } from 'zod'

/**
 * Vor- und Nachname der Lehrer-Rollen (PROJ-121): eine Quelle für Pflicht-Seite,
 * „Mein Konto“, „Umbenennen“ (Super-Admin) und die Server-Schnittstellen.
 */

export const NAME_PART_MAX = 60

/** Buchstaben aller Sprachen (inkl. Umlaute, Akzente), Bindestrich, Apostroph (', ‘ und ’), Punkt, Leerzeichen */
const NAME_PART_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'‘’-]*$/u

/** Name der Lehrkraft in Klartext, z. B. für Meldungen am Feld */
function namePartSchema(label: string) {
  return z
    .string({ error: `Bitte gib deinen ${label} ein.` })
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(1, `Bitte gib deinen ${label} ein.`)
        .max(NAME_PART_MAX, `Der ${label} darf höchstens ${NAME_PART_MAX} Zeichen haben.`)
        .regex(NAME_PART_PATTERN, `Im ${label} sind nur Buchstaben, Bindestrich, Apostroph und Punkt erlaubt.`),
    )
}

export const firstNameSchema = namePartSchema('Vornamen')
export const lastNameSchema = namePartSchema('Nachnamen')

export const personNameSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
})

export type PersonName = z.infer<typeof personNameSchema>

/** Anzeigename, der aus Vor- und Nachname entsteht */
export function composeDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

/** Protokoll-Eintrag: Eintrag der eigenen Person (PROJ-121) */
export const NAME_SET_ACTION = 'user.name_set'
