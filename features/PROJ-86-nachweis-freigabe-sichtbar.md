# PROJ-86: Freigabe-Status in der Nachweis-Liste sichtbar

## Status: Deployed
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Hintergrund
Die Übersicht meldet „N Nachweise sind beendet, die Ergebnisse sind noch nicht freigegeben“ (PROJ-81). In der Liste unter `/admin/leistungsnachweise` stand bei beendeten Nachweisen aber nur „Geschlossen“. Wer gemeint war, ließ sich nur auf der Detailseite erkennen.

## User Stories
- Als Lehrkraft möchte ich in der Liste sehen, ob die Ergebnisse eines geschlossenen Nachweises schon freigegeben sind.
- Als Lehrkraft möchte ich von der Aufgabenzeile der Übersicht direkt zu den betroffenen Nachweisen springen.

## Acceptance Criteria
- [x] Geschlossene Nachweise zeigen unter dem Status eine Pill: „Ergebnisse nicht freigegeben“ (orange) oder „Ergebnisse freigegeben“ (grün).
- [x] Die Liste hat den Statusfilter „Nicht freigegeben“ (geschlossen, ohne Freigabe), auch über `?status=unreleased`.
- [x] Die Aufgabenzeile der Übersicht verlinkt auf `?status=unreleased&sj=alle`.
- [x] Die Liste-API liefert `resultsReleasedAt`.
- [x] Der Statusfilter ist wegen fünf Werten ein Dropdown (Regel PROJ-83: mehr als 4 Werte = Dropdown).

## Edge Cases
- Die Zahl der Übersicht zählt auch „offen, aber Endzeit vorbei“ und nur Nachweise mit Abgaben. Der Filter zeigt dagegen alle geschlossenen ohne Freigabe. Die Zahlen können daher abweichen.

## Implementation Notes
- `assessment-filter.ts` (`FILTER_UNRELEASED`), `assessment-filter-bar.tsx`, `leistungsnachweise/page.tsx`, `api/admin/assessments/route.ts`, `teacher-tasks.ts`.
- Tests: `assessment-filter.test.ts`, `assessment-filter-bar.test.tsx`.
- Deployed 2026-11-11 (https://spedilern.vercel.app), Commit d57dbe9. Noch nicht im Browser geprüft.
