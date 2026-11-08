-- Rückweg zu 20261113_proj74_schwierigste_fragen.sql
BEGIN;
DROP FUNCTION IF EXISTS question_difficulty_stats(uuid[], integer, integer, uuid);
DROP INDEX IF EXISTS idx_quiz_answers_question_answered;
COMMIT;
