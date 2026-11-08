-- PROJ-74: „Was fällt allen schwer?“ – Auswertung der schwierigsten Fragen
--
-- Eine Funktion, die je Übungsfrage zusammenzählt, wie oft sie richtig/falsch
-- beantwortet wurde. Sie gibt NUR Summen heraus (keine Nutzer-IDs, keine
-- Einzelverläufe). Lehrkräfte dürfen quiz_answers selbst nicht lesen; die
-- Funktion läuft deshalb als SECURITY DEFINER und prüft die Rolle selbst.
--
-- Zählregeln:
--   * nur Antworten aus quiz_answers (freies Üben, Blitzrunde, Lücken schließen);
--     Leistungsnachweise und Prüfungssimulation liegen in anderen Tabellen
--   * je Azubi und Frage zählen die ersten 3 Versuche im gewählten Zeitraum
--   * nur aktive, nicht gelöschte, nicht private Übungsfragen (kein assessment_only)
--
-- Rein additiv (neue Funktion + Index). Rückweg: 20261113_proj74_schwierigste_fragen_down.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_answered
  ON quiz_answers (question_id, answered_at);

CREATE OR REPLACE FUNCTION question_difficulty_stats(
  p_department_ids uuid[] DEFAULT NULL,   -- NULL = alle Fachbereiche
  p_class_level integer DEFAULT NULL,     -- 10 / 11 / 12 oder NULL = alle
  p_days integer DEFAULT NULL,            -- 30 / 90 oder NULL = gesamt
  p_subject_id uuid DEFAULT NULL
) RETURNS TABLE (
  question_id uuid,
  question_text text,
  class_level integer,
  topic_id uuid,
  topic_name text,
  subject_id uuid,
  subject_name text,
  department_id uuid,
  attempts integer,
  correct integer,
  top_wrong_option_text text,
  top_wrong_count integer,
  open_reports integer,
  last_changed_at timestamptz,
  first_counted_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
      JOIN answer_options ao ON ao.id = c.selected_option_id
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
         (SELECT max(cv.created_at) FROM content_versions cv
           WHERE cv.content_type = 'question' AND cv.content_id = sc.id),
         su.first_counted_at
    FROM scoped sc
    LEFT JOIN sums su ON su.question_id = sc.id
    LEFT JOIN wrong w ON w.question_id = sc.id
    LEFT JOIN reports rp ON rp.question_id = sc.id;
END
$$;

REVOKE ALL ON FUNCTION question_difficulty_stats(uuid[], integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION question_difficulty_stats(uuid[], integer, integer, uuid) TO authenticated;

COMMIT;
