-- PROJ-129: Quiz-Varianten – Rundenzettel, Darstellungsform je Antwort, Wette/Joker je Runde.
-- Rein additiv: neue Tabelle, neue Spalten mit Standardwerten, Statistik-Funktion
-- gewichtet nach Darstellungsform. Rückweg: 20261128_proj129_rundenzettel_down.sql
--
-- 1. quiz_rounds (Rundenzettel): enthält die Lösungen der laufenden Runde.
--    RLS an, KEINE Richtlinie → Spieler (anon/authenticated) können weder lesen
--    noch schreiben. Nur der Server mit dem Service-Schlüssel greift zu.
-- 2. quiz_answers: presentation (classic | true_false | eliminate | joker), mistakes (0–2)
-- 3. quiz_sessions: coins_earned, joker_cost, wager_stake, wager_won
-- 4. question_difficulty_stats: Richtig/Falsch halb gewichtet, richtige Joker-Antworten
--    nicht gezählt, „häufigste falsche Antwort“ nur aus klassischen Antworten.

-- ─── 1. quiz_rounds ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_rounds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('quiz', 'blitz')),
  blitz_form       text CHECK (blitz_form IN ('true_false', 'classic')),
  subject_id       uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_level      integer,
  topic_id         uuid,
  slip             jsonb NOT NULL,
  version          integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  result           jsonb
);

ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;
-- Bewusst keine Richtlinie: der Zettel enthält die Lösungen.
REVOKE ALL ON public.quiz_rounds FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_quiz_rounds_user_created ON public.quiz_rounds (user_id, created_at DESC);

-- ─── 2. quiz_answers ────────────────────────────────────────────────────────
ALTER TABLE public.quiz_answers
  ADD COLUMN IF NOT EXISTS presentation text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS mistakes smallint NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.quiz_answers
    ADD CONSTRAINT quiz_answers_presentation_check CHECK (presentation IN ('classic', 'true_false', 'eliminate', 'joker'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.quiz_answers
    ADD CONSTRAINT quiz_answers_mistakes_check CHECK (mistakes BETWEEN 0 AND 2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- „Gekannte“ Fragen eines Spielers schnell finden (Variantenplanung)
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_known
  ON public.quiz_answers (user_id, question_id)
  WHERE is_correct AND presentation IN ('classic', 'eliminate');

-- ─── 3. quiz_sessions ───────────────────────────────────────────────────────
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS coins_earned integer,
  ADD COLUMN IF NOT EXISTS joker_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wager_stake integer,
  ADD COLUMN IF NOT EXISTS wager_won boolean;

-- ─── 4. question_difficulty_stats ───────────────────────────────────────────
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
    SELECT a.question_id, a.is_correct, a.selected_option_id, a.answered_at, a.presentation,
           row_number() OVER (PARTITION BY a.user_id, a.question_id ORDER BY a.answered_at, a.id) AS rn
      FROM quiz_answers a
      JOIN scoped sc ON sc.id = a.question_id
     WHERE (p_days IS NULL OR a.answered_at >= now() - make_interval(days => p_days))
       -- PROJ-129: richtig mit Joker sagt nichts über die Schwierigkeit
       AND NOT (a.presentation = 'joker' AND a.is_correct)
  ),
  counted AS (
    SELECT * FROM ranked WHERE rn <= 3
  ),
  sums AS (
    SELECT c.question_id,
           -- PROJ-129: Richtig/Falsch zählt halb
           round(sum(CASE WHEN c.presentation = 'true_false' THEN 0.5 ELSE 1 END))::integer AS attempts,
           round(sum(CASE WHEN NOT c.is_correct THEN 0
                          WHEN c.presentation = 'true_false' THEN 0.5 ELSE 1 END))::integer AS correct,
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
       -- PROJ-129: nur echte Wahl des Spielers (nicht der zufällige Richtig/Falsch-Vorschlag)
       AND c.presentation IN ('classic', 'joker')
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
