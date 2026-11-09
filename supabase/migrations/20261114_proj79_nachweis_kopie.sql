-- PROJ-79: Nachweis duplizieren – Herkunft einer Kopie
--
-- Rein additiv: zwei optionale Spalten, der bestehende Code läuft unverändert weiter.
-- Wird das Original gelöscht, wird der Verweis leer (ON DELETE SET NULL); der
-- gemerkte Titel bleibt, damit der Hinweis „Kopie von …“ lesbar bleibt.

ALTER TABLE graded_assessments
  ADD COLUMN IF NOT EXISTS copied_from_id uuid REFERENCES graded_assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS copied_from_title text;

COMMENT ON COLUMN graded_assessments.copied_from_id IS
  'PROJ-79: Original, aus dem dieser Nachweis kopiert wurde (leer nach Löschen des Originals).';
COMMENT ON COLUMN graded_assessments.copied_from_title IS
  'PROJ-79: Titel des Originals zum Zeitpunkt der Kopie; NULL = keine Kopie.';

CREATE INDEX IF NOT EXISTS idx_graded_assessments_copied_from
  ON graded_assessments (copied_from_id) WHERE copied_from_id IS NOT NULL;
