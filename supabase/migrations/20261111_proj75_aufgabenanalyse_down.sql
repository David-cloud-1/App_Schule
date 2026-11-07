-- Rückweg zu 20261111_proj75_aufgabenanalyse.sql
-- ACHTUNG: Ausschlüsse aus der Wertung und Sperren gehen verloren; bereits
-- freigegebene Ergebnisse bleiben unverändert.

BEGIN;

DROP INDEX IF EXISTS idx_questions_blocked_for_assessments;
ALTER TABLE questions DROP COLUMN IF EXISTS blocked_for_assessments;
ALTER TABLE graded_assessments DROP COLUMN IF EXISTS excluded_question_ids;

COMMIT;
