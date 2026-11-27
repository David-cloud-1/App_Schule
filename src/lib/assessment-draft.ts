/**
 * PROJ-133: Zustand und Regeln des Anlegen-Ablaufs in drei Schritten.
 * Reine Logik ohne Oberfläche: Titelvorschlag, Prüfung von Schritt 3,
 * Umwandlung von Suchtreffern und die Übergabe aus „Schwierig“.
 */
import { isValidClassNameFormat, MAX_CLASS_NAME_LENGTH } from '@/lib/assessment-category'
import { MIN_ASSESSMENT_QUESTIONS } from '@/lib/assessment-questions'
import type { SearchHit } from '@/lib/assessment-question-search'
import { levelFor, MAX_COUNT, MIN_COUNT, MIX_PRESETS, mixSum, type Candidate, type Mix } from '@/lib/assessment-suggest'

export type WizardStep = 1 | 2 | 3

/** Klasse in Schritt 3: bewusst gewählt (nichts vorbelegt), freie Eingabe oder „Keine / gemischt“ */
export type ClassChoice = { kind: 'none' } | { kind: 'name'; name: string } | { kind: 'unset' }

export type WhenValues = {
  title: string
  classChoice: ClassChoice
  /** `datetime-local`-Wert in der Schulzeitzone; leer = sofort nach dem Öffnen */
  opensAt: string
  closesAt: string
  durationMinutes: string
}

export type WhenErrors = Partial<Record<'title' | 'className' | 'opensAt' | 'closesAt' | 'durationMinutes', string>>

/** Suchtreffer als Kandidat, damit Vorschlag und Suche dieselbe Liste füllen */
export function hitToCandidate(hit: SearchHit): Candidate {
  const correct = hit.rate === null ? 0 : Math.round((hit.rate / 100) * hit.attempts)
  return {
    id: hit.id,
    question_text: hit.question_text,
    topic: hit.topic,
    class_level: hit.class_level,
    subject_codes: hit.subject_codes,
    isPrivate: hit.isPrivate,
    attempts: hit.attempts,
    correct,
    openReports: hit.openReports,
    blocked: hit.blocked,
    ...levelFor(hit.attempts, correct),
  }
}

/** „BGP · Luftfracht · 27.11.2026“ – aus Fach, Thema und Datum, später änderbar */
export function suggestTitle(subjects: string[], topics: string[], now: Date): string {
  const date = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })
  const parts: string[] = []
  if (subjects.length > 0) parts.push(subjects.slice(0, 2).join(' / '))
  if (topics.length === 1) parts.push(topics[0])
  else if (topics.length > 1) parts.push(`${topics.length} Themen`)
  parts.push(date)
  return parts.join(' · ').slice(0, 100)
}

/** Schritt 2 → 3: Ein Nachweis braucht mindestens 5 Fragen (wie auf dem Server) */
export function reviewState(count: number): { canContinue: boolean; hint: string | null } {
  if (count < MIN_ASSESSMENT_QUESTIONS) {
    const missing = MIN_ASSESSMENT_QUESTIONS - count
    return {
      canContinue: false,
      hint: `Ein Nachweis braucht mindestens ${MIN_ASSESSMENT_QUESTIONS} Fragen. ${missing === 1 ? 'Es fehlt noch 1 Frage' : `Es fehlen noch ${missing} Fragen`}.`,
    }
  }
  return { canContinue: true, hint: null }
}

/** Prüft Schritt 3. `inputToDate` wandelt einen Feldwert in einen Zeitpunkt (null = ungültig). */
export function validateWhen(
  v: WhenValues,
  now: Date,
  inputToDate: (value: string) => Date | null,
): WhenErrors {
  const e: WhenErrors = {}
  if (!v.title.trim()) e.title = 'Bitte gib einen Titel an.'
  else if (v.title.trim().length > 100) e.title = 'Der Titel darf höchstens 100 Zeichen lang sein.'

  if (v.classChoice.kind === 'unset') {
    e.className = 'Bitte wähle eine Klasse oder „Keine / gemischt“.'
  } else if (v.classChoice.kind === 'name') {
    const name = v.classChoice.name.replace(/\s+/g, ' ').trim()
    if (!name) e.className = 'Bitte gib eine Klasse ein oder wähle „Keine / gemischt“.'
    else if (name.length > MAX_CLASS_NAME_LENGTH) e.className = `Die Klasse darf höchstens ${MAX_CLASS_NAME_LENGTH} Zeichen lang sein.`
    else if (!isValidClassNameFormat(name)) e.className = 'Bitte nur Buchstaben und Ziffern verwenden, zum Beispiel SP10C.'
  }

  const closes = v.closesAt ? inputToDate(v.closesAt) : null
  const opens = v.opensAt ? inputToDate(v.opensAt) : null
  if (!v.closesAt || !closes) e.closesAt = 'Bitte gib an, bis wann man beitreten kann.'
  else if (closes.getTime() <= now.getTime()) e.closesAt = 'Dieser Zeitpunkt liegt in der Vergangenheit.'
  if (v.opensAt && !opens) e.opensAt = 'Bitte gib Datum und Uhrzeit an.'
  if (opens && closes && closes.getTime() <= opens.getTime() && !e.closesAt) {
    e.closesAt = 'Beitritt bis muss nach „Beitritt ab“ liegen.'
  }

  const minutes = /^\d+$/.test(v.durationMinutes.trim()) ? Number(v.durationMinutes.trim()) : NaN
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) {
    e.durationMinutes = 'Bitte eine ganze Zahl von 5 bis 600 Minuten.'
  }
  return e
}

/** Klasse für die Schnittstelle: Name oder null („Keine / gemischt“); nur nach erfolgreicher Prüfung aufrufen */
export function classNameForApi(choice: ClassChoice): string | null {
  return choice.kind === 'name' ? choice.name.replace(/\s+/g, ' ').trim() : null
}

// --- Übergabe aus „Schwierig“ (E4) ---

export const HANDOFF_KEY = 'nachweis-neu-aus-schwierig'

export type Handoff = { questionIds: string[]; departmentId: string | null }

/** Legt die markierten Fragen für die Wizard-Seite im Tab-Speicher ab; false, wenn der Speicher nicht geht */
export function writeHandoff(storage: Pick<Storage, 'setItem'>, handoff: Handoff): boolean {
  try {
    storage.setItem(HANDOFF_KEY, JSON.stringify(handoff))
    return true
  } catch {
    return false
  }
}

/** Liest die Übergabe genau einmal: der Eintrag wird sofort gelöscht, kaputte oder fehlende Daten ergeben null */
export function readHandoff(storage: Pick<Storage, 'getItem' | 'removeItem'>): Handoff | null {
  try {
    const raw = storage.getItem(HANDOFF_KEY)
    storage.removeItem(HANDOFF_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (typeof data !== 'object' || data === null) return null
    const { questionIds, departmentId } = data as Record<string, unknown>
    if (!Array.isArray(questionIds) || !questionIds.every((x) => typeof x === 'string')) return null
    const ids = [...new Set(questionIds as string[])].slice(0, 60)
    if (ids.length === 0) return null
    return { questionIds: ids, departmentId: typeof departmentId === 'string' ? departmentId : null }
  } catch {
    return null
  }
}

// --- Schritt 1 ---


export type PresetKey = keyof typeof MIX_PRESETS | 'eigen'

export type WhatValues = {
  subjects: string[]
  topics: string[]
  classLevel: 'all' | '10' | '11' | '12'
  countText: string
  preset: PresetKey
  custom: Mix
  /** Ausschlüsse (PROJ-78) mit den bisherigen Standardwerten */
  exBlocked: boolean
  exReported: boolean
  recent: '0' | '1' | '3' | '5'
}

export function initialWhat(): WhatValues {
  return {
    subjects: [],
    topics: [],
    classLevel: 'all',
    countText: '20',
    preset: 'ausgewogen',
    custom: { ...MIX_PRESETS.ausgewogen },
    exBlocked: true,
    exReported: true,
    recent: '0',
  }
}

export function parseCount(text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN
}

export function mixFor(w: Pick<WhatValues, 'preset' | 'custom'>): Mix {
  return w.preset === 'eigen' ? w.custom : { ...MIX_PRESETS[w.preset] }
}

export type WhatErrors = Partial<Record<'subjects' | 'count' | 'mix', string>>

/** Meldungen stehen am Feld, nicht oben auf der Seite */
export function validateWhat(w: WhatValues): WhatErrors {
  const e: WhatErrors = {}
  if (w.subjects.length === 0) e.subjects = 'Bitte wähle mindestens ein Fach.'
  const count = parseCount(w.countText)
  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    e.count = `Bitte eine ganze Zahl von ${MIN_COUNT} bis ${MAX_COUNT}.`
  }
  if (mixSum(mixFor(w)) !== 100) e.mix = 'Die Verteilung muss zusammen 100 % ergeben.'
  return e
}

/** Höchstens so viele Fragen lassen sich aus „Schwierig“ in einen Nachweis übergeben (wie der Vorschlag) */
export const MAX_HANDOFF_QUESTIONS = 60

/**
 * Markierte Fragen nach Bereich gruppieren (E4). Fragen ohne bekannten Bereich
 * stehen unter dem Schlüssel `''`. Reihenfolge der Markierung bleibt erhalten.
 */
export function groupByDepartment(rows: { question_id: string; department_id: string | null }[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const r of rows) {
    const key = r.department_id ?? ''
    const list = groups.get(key) ?? []
    if (!list.includes(r.question_id)) list.push(r.question_id)
    groups.set(key, list)
  }
  return groups
}
