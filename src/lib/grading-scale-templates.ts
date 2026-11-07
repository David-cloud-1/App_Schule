// PROJ-77: Notenschlüssel-Vorlagen – reine Hilfen ohne Datenbankzugriff,
// geteilt von Schnittstellen und Oberfläche.

import { IHK_DEFAULT_SCALE, validateGradingScale, type GradeBoundary } from '@/lib/graded-assessments'

export const MAX_TEMPLATE_NAME_LENGTH = 60

/** Feste Vorlage im Programm: nicht in der Datenbank, deshalb nicht löschbar. */
export const IHK_TEMPLATE_ID = 'ihk'
export const IHK_TEMPLATE_NAME = 'IHK-Standard'

export type GradingScaleTemplate = {
  id: string
  name: string
  scale: GradeBoundary[]
  shared: boolean
  /** Eigene Vorlage der angemeldeten Person */
  mine: boolean
  /** Anzeigename der Besitzerin/des Besitzers; null bei eigenen, verwaisten oder fest eingebauten */
  ownerName: string | null
  /** Fest eingebaute IHK-Vorlage */
  builtIn: boolean
}

export const IHK_TEMPLATE: GradingScaleTemplate = {
  id: IHK_TEMPLATE_ID,
  name: IHK_TEMPLATE_NAME,
  scale: IHK_DEFAULT_SCALE,
  shared: false,
  mine: false,
  ownerName: null,
  builtIn: true,
}

/** Name bereinigen und prüfen; liefert den bereinigten Namen oder eine Fehlermeldung. */
export function validateTemplateName(raw: unknown): { name: string } | { error: string } {
  if (typeof raw !== 'string') return { error: 'Bitte einen Namen eingeben.' }
  const name = raw.replace(/\s+/g, ' ').trim()
  if (name.length === 0) return { error: 'Bitte einen Namen eingeben.' }
  if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
    return { error: `Der Name darf höchstens ${MAX_TEMPLATE_NAME_LENGTH} Zeichen lang sein.` }
  }
  return { name }
}

/** Gleiche Prüfung wie beim Nachweis (PROJ-21), damit eine Vorlage nie einen ungültigen Schlüssel trägt. */
export function validateTemplateScale(scale: unknown): string | null {
  return validateGradingScale(scale)
}

/** Sortiert nach Note 1…6, damit gespeicherte Vorlagen immer gleich aussehen. */
export function normalizeScale(scale: GradeBoundary[]): GradeBoundary[] {
  return [...scale].sort((a, b) => a.grade - b.grade).map((b) => ({ grade: b.grade, minPercent: b.minPercent }))
}

/** Auswahl-Beschriftung: gleiche Namen bleiben über den Besitzernamen unterscheidbar. */
export function templateLabel(t: Pick<GradingScaleTemplate, 'name' | 'mine' | 'ownerName' | 'builtIn'>): string {
  if (t.builtIn || t.mine || !t.ownerName) return t.name
  return `${t.name} (${t.ownerName})`
}

type TemplateRow = {
  id: string
  name: string
  scale: unknown
  shared: boolean
  owner_id: string | null
}

/** Datenbankzeilen in Listeneinträge: eigene zuerst, dann geteilte, jeweils nach Name. */
export function buildTemplateList(
  rows: TemplateRow[],
  userId: string,
  ownerNameById: Map<string, string>,
): GradingScaleTemplate[] {
  const list = rows.map<GradingScaleTemplate>((r) => ({
    id: r.id,
    name: r.name,
    scale: normalizeScale(r.scale as GradeBoundary[]),
    shared: r.shared,
    mine: r.owner_id === userId,
    ownerName: r.owner_id && r.owner_id !== userId ? (ownerNameById.get(r.owner_id) ?? null) : null,
    builtIn: false,
  }))
  list.sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name, 'de'))
  return list
}
