import type { Abwesenheit, AbwesenheitInput, AbwesenheitsArt, VertretungStatus } from '@/lib/kalender'
import type { Absence, AbsenceFormValues, AbsenceType, SubstituteStatus } from '@/lib/absence'

/**
 * Brücke zwischen der Schnittstelle des Kalenders (deutsche Feldnamen aus
 * `kalender.ts`) und den Anzeige-Typen der Oberfläche (`absence.ts`).
 */

const STATUS_FROM_API: Record<VertretungStatus, SubstituteStatus> = {
  offen: 'open',
  eingetragen: 'entered',
  nicht_noetig: 'not_needed',
}

const STATUS_TO_API: Record<SubstituteStatus, VertretungStatus> = {
  open: 'offen',
  entered: 'eingetragen',
  not_needed: 'nicht_noetig',
}

export function statusToApi(status: SubstituteStatus): VertretungStatus {
  return STATUS_TO_API[status]
}

/** „08:00:00“ → „08:00“ */
function hhmm(value: string | null): string | null {
  return value ? value.slice(0, 5) : null
}

export function absenceFromApi(a: Abwesenheit): Absence {
  return {
    id: a.id,
    personId: a.person_id ?? '',
    personName: a.person_name,
    createdById: a.erstellt_von ?? '',
    createdByName: a.erstellt_von_name,
    typeId: a.art_id,
    typeName: a.art_name,
    typeColor: a.art_farbe,
    typeIcon: a.art_icon,
    dateFrom: a.datum_von,
    dateTo: a.datum_bis,
    allDay: a.ganztaegig,
    timeFrom: hhmm(a.zeit_von),
    timeTo: hhmm(a.zeit_bis),
    allDepartments: a.alle_abteilungen,
    departments: a.abteilungen,
    freeText: a.freitext,
    note: a.notiz,
    substituteStatus: STATUS_FROM_API[a.vertretung_status],
    statusSetByName: a.vertretung_von_name,
    statusSetAt: a.vertretung_am,
    changedAfterSubstitute: a.geaendert_nach_vertretung,
    version: a.version,
    updatedAt: a.updated_at,
    updatedByName: a.updated_by_name ?? null,
    canEdit: a.darf_bearbeiten,
  }
}

export function typeFromApi(t: AbwesenheitsArt): AbsenceType {
  return {
    id: t.id,
    name: t.name,
    color: t.farbe,
    icon: t.icon,
    hasFreeText: t.mit_freitext,
    active: t.aktiv,
    fixed: t.fest,
  }
}

/** Formularwerte → Eingabe der Schnittstelle */
export function formToInput(v: AbsenceFormValues): AbwesenheitInput {
  return {
    person_id: v.personId,
    art_id: v.typeId,
    datum_von: v.dateFrom,
    datum_bis: v.dateTo,
    ganztaegig: v.allDay,
    zeit_von: v.allDay ? null : v.timeFrom,
    zeit_bis: v.allDay ? null : v.timeTo,
    alle_abteilungen: v.allDepartments,
    abteilungen: v.allDepartments ? [] : v.departments,
    freitext: v.freeText.trim() || null,
    notiz: v.note.trim() || null,
  }
}
