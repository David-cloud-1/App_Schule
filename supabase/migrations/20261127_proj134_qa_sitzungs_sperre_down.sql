-- Rollback der Sitzungs-Sperre (PROJ-134 QA-Fix)
DROP TRIGGER IF EXISTS exam_sessions_sperre_nachweis_spalten ON exam_sessions;
DROP FUNCTION IF EXISTS public.exam_sessions_sperre_nachweis_spalten();
