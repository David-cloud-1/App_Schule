-- PROJ-27 — RÜCKWEG (nur bei Bedarf manuell ausführen)
--
-- Achtung: Nachweise ohne Prüfungsset (exam_set_id IS NULL) verhindern
-- SET NOT NULL. Sie müssen vorher gelöscht oder einem Set zugeordnet werden.

BEGIN;

ALTER TABLE graded_assessments DROP CONSTRAINT IF EXISTS graded_assessments_question_source_check;

ALTER TABLE graded_assessments
  ALTER COLUMN exam_set_id SET NOT NULL,
  DROP COLUMN IF EXISTS draft_question_ids;

COMMIT;
