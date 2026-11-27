-- Rollback PROJ-134
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('nachweise-automatisch-schliessen');
    PERFORM cron.unschedule('nachweis-testlaeufe-aufraeumen');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.close_expired_assessments();
DROP FUNCTION IF EXISTS public.cleanup_assessment_trials();

DROP INDEX IF EXISTS exam_sessions_trial_idx;
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_trial_xor_assessment;
ALTER TABLE exam_sessions DROP COLUMN IF EXISTS trial_assessment_id;
ALTER TABLE graded_assessments DROP COLUMN IF EXISTS auto_closed_at;

COMMIT;
