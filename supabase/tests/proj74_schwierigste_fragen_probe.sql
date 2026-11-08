-- PROJ-74 Probe: Funktion question_difficulty_stats (Migration 20261113_proj74_schwierigste_fragen muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_teacher uuid; v_student uuid; v_q uuid; v_u1 uuid; v_u2 uuid; v_s uuid; v_ok uuid; v_bad uuid;
  v_n int; v_att int; v_cor int; v_top text; v_cnt int; r text := ''; v_err text;
BEGIN
  SELECT id INTO v_teacher FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_student FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_u1 FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_u2 FROM profiles WHERE role = 'student' ORDER BY id OFFSET 1 LIMIT 1;

  -- Frische Frage ohne Antworten, mit einem Fach und zwei Optionen
  SELECT q.id INTO v_q FROM questions q
    JOIN question_subjects qs ON qs.question_id = q.id
   WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private
     AND NOT EXISTS (SELECT 1 FROM quiz_answers a WHERE a.question_id = q.id)
     AND (SELECT count(*) FROM answer_options o WHERE o.question_id = q.id) >= 2
   LIMIT 1;
  SELECT id INTO v_ok FROM answer_options WHERE question_id = v_q AND is_correct LIMIT 1;
  SELECT id INTO v_bad FROM answer_options WHERE question_id = v_q AND NOT is_correct LIMIT 1;
  SELECT id INTO v_s FROM quiz_sessions ORDER BY completed_at DESC LIMIT 1;

  -- u1: 5 Versuche (4 falsch, 1 richtig) → nur die ersten 3 zählen; u2: 1 richtig
  INSERT INTO quiz_answers (session_id, user_id, question_id, selected_option_id, is_correct, answered_at)
  SELECT v_s, v_u1, v_q, CASE WHEN i = 5 THEN v_ok ELSE v_bad END, i = 5, now() - interval '1 day' + i * interval '1 minute'
    FROM generate_series(1, 5) i;
  INSERT INTO quiz_answers (session_id, user_id, question_id, selected_option_id, is_correct)
  VALUES (v_s, v_u2, v_q, v_ok, true);

  -- T1: Lehrkraft rechnet, 3 Versuche von u1 + 1 von u2
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  SELECT attempts, correct, (CASE WHEN top_wrong_option_text IS NULL THEN 0 ELSE 1 END), top_wrong_count INTO v_att, v_cor, v_n, v_cnt
    FROM question_difficulty_stats() WHERE question_id = v_q;
  r := r || format('T1 Versuche=%s richtig=%s falsche_Antwort_da=%s falsch_n=%s (4, 1, 1, 3)' || E'\n', v_att, v_cor, v_n, v_cnt);

  -- T2: Zeitraum 30 Tage und ungültige Werte
  SELECT attempts INTO v_att FROM question_difficulty_stats(NULL, NULL, 30) WHERE question_id = v_q;
  r := r || format('T2a Zeitraum 30 Tage: %s (4)' || E'\n', v_att);
  SELECT attempts INTO v_att FROM question_difficulty_stats(NULL, NULL, NULL, NULL) WHERE question_id = v_q;
  BEGIN PERFORM * FROM question_difficulty_stats(NULL, 9, NULL); r := r || 'T2b Klassenstufe 9: kein Fehler (FEHLER)' || E'\n';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; r := r || format('T2b Klassenstufe 9: %s (INVALID_CLASS_LEVEL)' || E'\n', v_err); END;

  -- T3: Ergebnis enthält keine Personenspalten
  SELECT count(*) INTO v_n FROM information_schema.parameters
   WHERE specific_name LIKE 'question_difficulty_stats%' AND parameter_mode = 'OUT' AND parameter_name ILIKE '%user%';
  RESET ROLE;
  r := r || format('T3 Ausgabespalten mit „user“: %s (0)' || E'\n', v_n);

  -- T4: Azubi darf nicht
  PERFORM pg_temp.als(v_student); SET LOCAL ROLE authenticated;
  BEGIN PERFORM * FROM question_difficulty_stats(); r := r || 'T4 Azubi: kein Fehler (FEHLER)' || E'\n';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT; r := r || format('T4 Azubi: %s (FORBIDDEN)' || E'\n', v_err); END;
  RESET ROLE;

  -- T5: nicht angemeldet / anon
  SET LOCAL ROLE anon;
  BEGIN PERFORM * FROM question_difficulty_stats(); r := r || 'T5 anon: kein Fehler (FEHLER)' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || 'T5 anon: abgelehnt (abgelehnt)' || E'\n'; END;
  RESET ROLE;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
