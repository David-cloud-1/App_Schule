-- PROJ-76 zurückbauen
DROP FUNCTION IF EXISTS next_assessment_group_slot(uuid);
ALTER TABLE exam_sessions DROP COLUMN IF EXISTS group_label;
ALTER TABLE graded_assessments
  DROP COLUMN IF EXISTS group_join_counter,
  DROP COLUMN IF EXISTS group_orders,
  DROP COLUMN IF EXISTS group_mix_seed,
  DROP COLUMN IF EXISTS groups_enabled;
