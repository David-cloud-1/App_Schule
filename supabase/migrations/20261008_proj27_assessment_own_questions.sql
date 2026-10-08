-- PROJ-27: Leistungsnachweis – eigene Fragen-Zusammenstellung
--
-- Ein Nachweis wird nicht mehr zwingend aus einem Prüfungsset angelegt. Die vom
-- Ausbilder gewählten Fragen stehen bis zum Öffnen in draft_question_ids; beim
-- Öffnen werden sie wie bisher als question_ids_snapshot eingefroren. Alle
-- Teilnehmer-Pfade lesen nur den Snapshot und bleiben unberührt.
-- Keine RLS-Änderung: die bestehende Policy graded_assessments_admin_all gilt weiter.

BEGIN;

ALTER TABLE graded_assessments
  ALTER COLUMN exam_set_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS draft_question_ids uuid[];

COMMENT ON COLUMN graded_assessments.draft_question_ids IS
  'Vom Ausbilder gewählte Fragen, solange status=draft. Beim Öffnen nach question_ids_snapshot übernommen. NULL bei Altnachweisen (dann gilt exam_question_sets.question_ids).';

-- Bestehende Entwürfe übernehmen die Fragen ihres Sets (ab jetzt unabhängig vom Set)
UPDATE graded_assessments ga
SET draft_question_ids = s.question_ids
FROM exam_question_sets s
WHERE ga.exam_set_id = s.id
  AND ga.status = 'draft'
  AND ga.draft_question_ids IS NULL;

-- Ohne Set muss die Fragenquelle woanders stehen
ALTER TABLE graded_assessments
  ADD CONSTRAINT graded_assessments_question_source_check
  CHECK (exam_set_id IS NOT NULL OR draft_question_ids IS NOT NULL OR question_ids_snapshot IS NOT NULL);

COMMIT;
