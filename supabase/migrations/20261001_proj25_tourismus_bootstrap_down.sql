-- PROJ-25 — RÜCKWEG (nur bei Bedarf manuell ausführen)
--
-- Entfernt den Fachbereich Tourismuskaufleute (TOUR) wieder vollständig,
-- inklusive seiner Prüfungsteile (ON DELETE CASCADE über department_id).
-- Nur sicher auszuführen, solange noch keine Fächer, Fragen, Nutzer oder
-- Prüfungssets dem Bereich zugeordnet wurden — sonst verhindert die
-- jeweilige Fremdschlüsselbeziehung das Löschen (Schutz vor Datenverlust).

BEGIN;

DELETE FROM exam_parts WHERE department_id = (SELECT id FROM departments WHERE code = 'TOUR');
DELETE FROM departments WHERE code = 'TOUR';

COMMIT;
