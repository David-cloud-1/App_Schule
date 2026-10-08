-- Rollback für PROJ-30 (Fokus-Verlust-Protokoll). Löscht das gesamte Protokoll.

BEGIN;

DROP FUNCTION IF EXISTS focus_report(uuid, text, uuid, uuid, integer, integer, timestamptz, integer, integer, integer);
DROP TABLE IF EXISTS assessment_focus_events;
DROP TABLE IF EXISTS assessment_focus_summary;

ALTER TABLE graded_assessments
  DROP CONSTRAINT IF EXISTS graded_assessments_focus_auto_needs_tracking,
  DROP CONSTRAINT IF EXISTS graded_assessments_focus_auto_range,
  DROP COLUMN IF EXISTS focus_auto_submit_after,
  DROP COLUMN IF EXISTS focus_tracking;

COMMIT;
