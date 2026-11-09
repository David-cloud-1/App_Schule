-- Rückweg zu 20261114_proj79_nachweis_kopie.sql
-- ACHTUNG: Der Hinweis „Kopie von …“ geht verloren; die Nachweise selbst bleiben unverändert.

BEGIN;

DROP INDEX IF EXISTS idx_graded_assessments_copied_from;
ALTER TABLE graded_assessments DROP COLUMN IF EXISTS copied_from_title;
ALTER TABLE graded_assessments DROP COLUMN IF EXISTS copied_from_id;

COMMIT;
