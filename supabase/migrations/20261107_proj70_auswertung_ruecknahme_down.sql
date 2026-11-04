-- Rollback für PROJ-70 Teil 2

BEGIN;
DROP FUNCTION IF EXISTS revert_person_changes(uuid, timestamptz, timestamptz, boolean, text, jsonb, uuid);
DROP FUNCTION IF EXISTS person_revert_plan(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS content_changes_per_person(timestamptz, timestamptz, uuid);
DROP INDEX IF EXISTS idx_content_versions_person_time;
COMMIT;
