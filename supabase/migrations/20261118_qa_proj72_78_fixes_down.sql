-- Rückweg zu 20261118_qa_proj72_78_fixes.sql: stellt die Definitionen von vorher her
-- (Stand Produktion 2026-11-10, aus pg_get_functiondef / pg_get_viewdef).

CREATE OR REPLACE FUNCTION public.report_question(p_question_id uuid, p_reason text, p_note text DEFAULT NULL::text, p_option_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_q questions%ROWTYPE;
  v_chosen text;
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin';
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('andere_antwort_richtig', 'richtige_antwort_falsch', 'tippfehler_unklar', 'veraltet', 'sonstiges') THEN
    RAISE EXCEPTION 'INVALID_REASON' USING ERRCODE = '22023';
  END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN
    RAISE EXCEPTION 'NOTE_TOO_LONG' USING ERRCODE = '22023';
  END IF;
  IF p_reason = 'sonstiges' AND v_note IS NULL THEN
    RAISE EXCEPTION 'NOTE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_q FROM questions
   WHERE id = p_question_id AND is_active AND deleted_at IS NULL AND NOT assessment_only AND NOT is_private;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUESTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM exam_sessions
     WHERE user_id = v_uid AND status = 'in_progress' AND started_at > now() - interval '12 hours'
  ) THEN
    RAISE EXCEPTION 'SESSION_RUNNING' USING ERRCODE = '55000';
  END IF;

  IF (SELECT count(*) FROM question_reports WHERE reporter_id = v_uid AND created_at >= v_today_start) >= 10 THEN
    RAISE EXCEPTION 'DAILY_LIMIT' USING ERRCODE = '54000';
  END IF;

  IF p_option_id IS NOT NULL THEN
    SELECT option_text INTO v_chosen FROM answer_options WHERE id = p_option_id AND question_id = p_question_id;
  END IF;

  BEGIN
    INSERT INTO question_reports (question_id, reporter_id, department_id, reason, note, question_text, chosen_option_text)
    VALUES (p_question_id, v_uid, question_department(p_question_id), p_reason, v_note, v_q.question_text, v_chosen)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED' USING ERRCODE = '23505';
  END;

  RETURN v_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.close_question_reports(p_question_id uuid, p_result text, p_response text DEFAULT NULL::text, p_silent boolean DEFAULT false, p_report_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_resp text := nullif(btrim(coalesce(p_response, '')), '');
  v_version uuid;
  v_reward integer;
  v_closed integer := 0;
  v_rewarded integer := 0;
  r question_reports%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_result IS NULL OR p_result NOT IN ('korrigiert', 'nicht_uebernommen', 'entfaellt') THEN
    RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE = '22023';
  END IF;
  IF v_resp IS NOT NULL AND char_length(v_resp) > 200 THEN
    RAISE EXCEPTION 'RESPONSE_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  IF p_result = 'korrigiert' THEN
    SELECT id INTO v_version FROM content_versions
     WHERE content_type = 'question' AND content_id = p_question_id
     ORDER BY version_number DESC LIMIT 1;
  END IF;

  FOR r IN
    SELECT * FROM question_reports
     WHERE question_id = p_question_id
       AND status IN ('offen', 'in_pruefung')
       AND (p_report_ids IS NULL OR id = ANY (p_report_ids))
     ORDER BY created_at
     FOR UPDATE
  LOOP
    v_reward := 0;
    IF p_result = 'korrigiert'
       AND NOT p_silent
       AND r.reporter_id IS NOT NULL
       AND r.reporter_id <> v_uid
       AND r.rewarded_at IS NULL
       AND (SELECT count(*) FROM question_reports x
             WHERE x.reporter_id = r.reporter_id AND x.rewarded_at > now() - interval '7 days') < 5
    THEN
      UPDATE profiles SET coin_balance = coin_balance + 15 WHERE id = r.reporter_id;
      IF FOUND THEN v_reward := 15; END IF;
    END IF;

    UPDATE question_reports
       SET status = p_result,
           closed_at = now(),
           handled_by = v_uid,
           response_text = v_resp,
           silent = p_silent,
           resolved_version_id = v_version,
           reward_coins = v_reward,
           rewarded_at = CASE WHEN v_reward > 0 THEN now() ELSE NULL END,
           feedback_read_at = CASE WHEN p_silent THEN now() ELSE NULL END
     WHERE id = r.id;

    v_closed := v_closed + 1;
    IF v_reward > 0 THEN v_rewarded := v_rewarded + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('closed', v_closed, 'rewarded', v_rewarded);
END
$function$;

CREATE OR REPLACE VIEW public.question_report_groups WITH (security_invoker = true) AS
 SELECT r.question_id,
    r.status,
    (array_agg(r.question_text ORDER BY r.created_at DESC))[1] AS question_text,
    (array_agg(r.department_id ORDER BY r.created_at DESC))[1] AS department_id,
    q.topic_id,
    t.subject_id,
    count(*)::integer AS report_count,
    array_agg(DISTINCT r.reason) AS reasons,
    min(r.created_at) AS oldest_at,
    max(r.created_at) AS newest_at,
    (array_agg(r.handled_by ORDER BY r.claimed_at DESC NULLS LAST) FILTER (WHERE r.handled_by IS NOT NULL))[1] AS handled_by,
    forum_author_name((array_agg(r.handled_by ORDER BY r.claimed_at DESC NULLS LAST) FILTER (WHERE r.handled_by IS NOT NULL))[1]) AS handled_by_name,
    max(r.claimed_at) AS claimed_at,
    ( SELECT max(cv.created_at) AS max
           FROM content_versions cv
          WHERE cv.content_type = 'question'::text AND cv.content_id = r.question_id) AS last_changed_at
   FROM question_reports r
     LEFT JOIN questions q ON q.id = r.question_id
     LEFT JOIN topics t ON t.id = q.topic_id
  GROUP BY r.question_id, r.status, q.topic_id, t.subject_id;

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
$function$;
