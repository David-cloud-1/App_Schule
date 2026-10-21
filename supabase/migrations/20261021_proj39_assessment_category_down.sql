-- Rücknahme PROJ-39
BEGIN;
DROP INDEX IF EXISTS graded_assessments_subject_idx;
DROP INDEX IF EXISTS graded_assessments_dept_school_year_idx;
ALTER TABLE graded_assessments
  DROP CONSTRAINT IF EXISTS graded_assessments_class_name_check,
  DROP CONSTRAINT IF EXISTS graded_assessments_school_year_check,
  DROP COLUMN IF EXISTS subject_id,
  DROP COLUMN IF EXISTS class_name,
  DROP COLUMN IF EXISTS school_year;
DROP FUNCTION IF EXISTS current_school_year(timestamptz);
COMMIT;
