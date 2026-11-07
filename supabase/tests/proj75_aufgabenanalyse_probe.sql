-- PROJ-75 Probe: neue Spalten und ihre Rechte (Migration 20261111_proj75_aufgabenanalyse muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_teacher uuid; v_student uuid; v_q uuid; v_a uuid; v_n int; v_def text; v_flag boolean; v_ver int; r text := '';
BEGIN
  SELECT id INTO v_teacher FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_student FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_q FROM questions WHERE is_active AND deleted_at IS NULL AND NOT is_private ORDER BY id LIMIT 1;
  SELECT id INTO v_a FROM graded_assessments ORDER BY created_at DESC LIMIT 1;

  SELECT column_default INTO v_def FROM information_schema.columns
   WHERE table_name = 'graded_assessments' AND column_name = 'excluded_question_ids';
  r := r || format('T1a Spalte graded_assessments.excluded_question_ids, Standard: %s (''{}''::uuid[])' || E'\n', v_def);
  SELECT count(*) INTO v_n FROM graded_assessments WHERE excluded_question_ids IS NULL;
  r := r || format('T1b Zeilen mit NULL: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM questions WHERE blocked_for_assessments;
  r := r || format('T1c Fragen schon gesperrt: %s (0)' || E'\n', v_n);

  -- T2: Lehrkraft sperrt eine Frage; Verlauf (PROJ-47) hebt die Version an
  SELECT version_number INTO v_ver FROM questions WHERE id = v_q;
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  UPDATE questions SET blocked_for_assessments = true WHERE id = v_q;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T2a Lehrkraft sperrt Frage: %s Zeile (1)' || E'\n', v_n);
  RESET ROLE;
  SELECT blocked_for_assessments, version_number - v_ver INTO v_flag, v_n FROM questions WHERE id = v_q;
  r := r || format('T2b gesperrt=%s, Version +%s (true, +1)' || E'\n', v_flag, v_n);

  -- T3: Azubi darf das nicht
  PERFORM pg_temp.als(v_student); SET LOCAL ROLE authenticated;
  UPDATE questions SET blocked_for_assessments = false WHERE id = v_q;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T3 Azubi entsperrt Frage: %s Zeilen (0)' || E'\n', v_n);
  RESET ROLE;

  -- T4: Ausschluss am Nachweis (nur wenn einer existiert)
  IF v_a IS NULL THEN
    r := r || 'T4 übersprungen, kein Nachweis vorhanden' || E'\n';
  ELSE
    UPDATE graded_assessments SET excluded_question_ids = ARRAY[v_q] WHERE id = v_a;
    SELECT cardinality(excluded_question_ids) INTO v_n FROM graded_assessments WHERE id = v_a;
    r := r || format('T4 Ausschluss gespeichert: %s Eintrag (1)' || E'\n', v_n);
  END IF;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
