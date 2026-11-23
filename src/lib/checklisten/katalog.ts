import { z } from 'zod'

/**
 * Kennungen der Checklisten (PROJ-122) – die einzige Quelle für Schnittstellen,
 * Datenbank-Aufrufe und (später) die Listen-Dateien. Der INHALT der Listen
 * (Schritte, Texte) kommt im Frontend-Schritt; hier stehen nur die Kennungen
 * und die Varianten, damit die Schnittstellen nichts Erfundenes speichern.
 *
 * Neue Liste = neuer Eintrag hier + eine Listen-Datei. Kennungen und Varianten
 * werden nie umbenannt: Gespeicherte Durchläufe verweisen darauf.
 */
export const CHECKLISTEN: Record<string, { varianten: readonly string[] }> = {
  // Pilot (PROJ-122)
  'dienstreise-beantragen': {
    varianten: [
      'dienstreise-inland',
      'dienstreise-ausland',
      'fortbildungsreise-inland',
      'fortbildungsreise-ausland',
      'fortbildungsgang',
      'bezirksreise',
      // Dienstgang: kein Antrag nötig, die Liste weist nur darauf hin
      'dienstgang',
    ],
  },
  'reisekosten-abrechnen': {
    varianten: ['dienstreise', 'fortbildungsreise', 'klassenfahrt'],
  },
}

export type ChecklisteKennung = keyof typeof CHECKLISTEN

/** Form von Kennungen (Liste, Variante, Schritt) – deckt sich mit den Mustern der Datenbank */
export const KENNUNG_MUSTER = /^[a-z0-9][a-z0-9-]{0,59}$/

export function istChecklisteKennung(wert: unknown): wert is ChecklisteKennung {
  return typeof wert === 'string' && Object.prototype.hasOwnProperty.call(CHECKLISTEN, wert)
}

export function istVariante(checkliste: string, variante: unknown): boolean {
  return (
    istChecklisteKennung(checkliste) &&
    typeof variante === 'string' &&
    CHECKLISTEN[checkliste].varianten.includes(variante)
  )
}

const schrittKennung = z
  .string()
  .regex(KENNUNG_MUSTER, 'Dieser Schritt ist ungültig.')

/** PUT …/haken: gewünschter Zustand statt „umschalten“ (Doppelklick und zwei Geräte schaden nicht) */
export const hakenSchema = z
  .object({
    schritt: schrittKennung,
    erledigt: z.boolean(),
    variante: z.string().regex(KENNUNG_MUSTER, 'Diese Auswahl gibt es nicht.').nullish(),
  })
  .strict()

/** PUT …/variante */
export const variantenSchema = z
  .object({ variante: z.string().regex(KENNUNG_MUSTER, 'Diese Auswahl gibt es nicht.').nullable() })
  .strict()

/** POST …/neu */
export const neuStartenSchema = z
  .object({ variante: z.string().regex(KENNUNG_MUSTER, 'Diese Auswahl gibt es nicht.').nullish() })
  .strict()

/** Ein Durchlauf, wie ihn die Schnittstellen liefern (Haken als Liste von Schritt-Kennungen) */
export interface Durchlauf {
  id: string
  checkliste: string
  variante: string | null
  gestartet_am: string
  archiviert_am: string | null
  haken: string[]
}

/** Übersicht „Frühere Durchläufe“: nur Zahl der Haken, nie die Haken selbst */
export interface FruehererDurchlauf {
  id: string
  variante: string | null
  gestartet_am: string
  archiviert_am: string
  anzahl_haken: number
}

/** Datenbank-Fehlercodes der Funktionen checkliste_* → HTTP-Status */
export function checklistenFehlerStatus(code: string | undefined | null): number | null {
  switch (code) {
    case 'CHK01':
      return 400
    case 'CHK02':
      return 409
    case '42501': // Zeilenregel: keine Lehrer-Rolle bzw. fremder/archivierter Durchlauf
      return 403
    default:
      return null
  }
}
