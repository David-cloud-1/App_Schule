-- Rückweg zu 20261128_proj129_rundenzettel.sql
-- Achtung: löscht die Darstellungsform aller Antworten und alle Rundenzettel.

-- Statistik-Funktion auf den Stand von 20261118 zurück
CREATE OR REPLACE FUNCTION public.question_difficulty_stats(p_department_ids uuid[] DEFAULT NULL::uuid[], p_class_level integer DEFAULT NULL::integer, p_days integer DEFAULT NULL::integer, p_subject_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(question_id uuid, question_text text, class_level integer, topic_id uuid, topic_name text, subject_id uuid, subject_name text, department_id uuid, attempts integer, correct integer, top_wrong_option_text text, top_wrong_count integer, open_reports integer, last_changed_at timestamp with time zone, first_counted_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET enable_nestloop TO 'off'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_class_level IS NOT NULL AND p_class_level NOT IN (10, 11, 12) THEN
    RAISE EXCEPTION 'INVALID_CLASS_LEVEL' USING ERRCODE = '22023';
  END IF;
  IF p_days IS NOT NULL AND (p_days < 1 OR p_days > 3650) THEN
    RAISE EXCEPTION 'INVALID_DAYS' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT q.id, q.question_text, q.class_level, q.topic_id, t.name AS topic_name,
           s.id AS subject_id, s.name AS subject_name, s.department_id
      FROM questions q
      JOIN question_subjects qs ON qs.question_id = q.id
      JOIN subjects s ON s.id = qs.subject_id
      LEFT JOIN topics t ON t.id = q.topic_id
     WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private
       AND (p_department_ids IS NULL OR s.department_id = ANY (p_department_ids))
       AND (p_class_level IS NULL OR q.class_level = p_class_level)
       AND (p_subject_id IS NULL OR s.id = p_subject_id)
  ),
  ranked AS (
    SELECT a.question_id, a.is_correct, a.selected_option_id, a.answered_at,
           row_number() OVER (PARTITION BY a.user_id, a.question_id ORDER BY a.answered_at, a.id) AS rn
      FROM quiz_answers a
      JOIN scoped sc ON sc.id = a.question_id
     WHERE p_days IS NULL OR a.answered_at >= now() - make_interval(days => p_days)
  ),
  counted AS (
    SELECT * FROM ranked WHERE rn <= 3
  ),
  sums AS (
    SELECT c.question_id,
           count(*)::integer AS attempts,
           count(*) FILTER (WHERE c.is_correct)::integer AS correct,
           min(c.answered_at) AS first_counted_at
      FROM counted c GROUP BY c.question_id
  ),
  wrong AS (
    SELECT DISTINCT ON (c.question_id)
           c.question_id, ao.option_text, count(*) OVER (PARTITION BY c.question_id, c.selected_option_id)::integer AS n
      FROM counted c
      -- QA PROJ-74 B4: nur Optionen dieser Frage
      JOIN answer_options ao ON ao.id = c.selected_option_id AND ao.question_id = c.question_id
     WHERE NOT c.is_correct
     ORDER BY c.question_id, count(*) OVER (PARTITION BY c.question_id, c.selected_option_id) DESC, ao.option_text
  ),
  reports AS (
    SELECT r.question_id, count(*)::integer AS n
      FROM question_reports r
     WHERE r.status IN ('offen', 'in_pruefung') AND r.question_id IS NOT NULL
     GROUP BY r.question_id
  )
  SELECT sc.id, sc.question_text, sc.class_level, sc.topic_id, sc.topic_name,
         sc.subject_id, sc.subject_name, sc.department_id,
         coalesce(su.attempts, 0), coalesce(su.correct, 0),
         w.option_text, coalesce(w.n, 0),
         coalesce(rp.n, 0),
         -- QA PROJ-74 B3: nur echte Inhaltsänderungen, nicht Startversion oder Anlage
         (SELECT max(cv.created_at) FROM content_versions cv
           WHERE cv.content_type = 'question' AND cv.content_id = sc.id AND cv.change_type = 'updated'),
         su.first_counted_at
    FROM scoped sc
    LEFT JOIN sums su ON su.question_id = sc.id
    LEFT JOIN wrong w ON w.question_id = sc.id
    LEFT JOIN reports rp ON rp.question_id = sc.id;
END
$function$;

ALTER TABLE public.quiz_sessions
  DROP COLUMN IF EXISTS wager_won,
  DROP COLUMN IF EXISTS wager_stake,
  DROP COLUMN IF EXISTS joker_cost,
  DROP COLUMN IF EXISTS coins_earned;

DROP INDEX IF EXISTS public.idx_quiz_answers_user_known;
ALTER TABLE public.quiz_answers
  DROP CONSTRAINT IF EXISTS quiz_answers_mistakes_check,
  DROP CONSTRAINT IF EXISTS quiz_answers_presentation_check,
  DROP COLUMN IF EXISTS mistakes,
  DROP COLUMN IF EXISTS presentation;

DROP TABLE IF EXISTS public.quiz_rounds;
