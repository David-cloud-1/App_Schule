-- Rückweg für 20261103_proj55_schulrecht_faelle.sql (PROJ-55)
-- Löscht alle laufenden Aktennotiz-Fälle (sie sind ohnehin nur 24 Stunden gültig).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'schulrecht-faelle-aufraeumen';
  END IF;
END $$;
DROP TABLE IF EXISTS public.schulrecht_faelle;
