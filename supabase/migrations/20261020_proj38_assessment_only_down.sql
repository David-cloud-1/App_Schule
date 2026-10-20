-- Rücknahme PROJ-38
BEGIN;
ALTER TABLE questions DROP COLUMN IF EXISTS assessment_only;
COMMIT;
