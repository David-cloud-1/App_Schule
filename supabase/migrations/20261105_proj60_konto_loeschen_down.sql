-- Rückweg für 20261105_proj60_konto_loeschen.sql (PROJ-60).
-- ACHTUNG: SET NOT NULL scheitert, solange anonymisierte Abgaben, Zusammenstellungen,
-- Protokoll- oder KI-Zeilen ohne Person existieren. Die müssten vorher einem Konto
-- zugewiesen oder gelöscht werden. Gelöschte Konten kommen nicht zurück.

DROP FUNCTION IF EXISTS public.konto_loeschen_vorbereiten(uuid);
DROP FUNCTION IF EXISTS public.konto_loeschen_vorschau(uuid);

ALTER TABLE public.generation_jobs DROP CONSTRAINT IF EXISTS generation_jobs_admin_id_fkey;
ALTER TABLE public.generation_jobs
  ADD CONSTRAINT generation_jobs_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generation_jobs ALTER COLUMN admin_id SET NOT NULL;

ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.admin_audit_log ALTER COLUMN admin_id SET NOT NULL;

ALTER TABLE public.exam_question_sets DROP CONSTRAINT IF EXISTS exam_question_sets_created_by_fkey;
ALTER TABLE public.exam_question_sets
  ADD CONSTRAINT exam_question_sets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.exam_question_sets ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_id_fkey;
ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.exam_sessions ALTER COLUMN user_id SET NOT NULL;
