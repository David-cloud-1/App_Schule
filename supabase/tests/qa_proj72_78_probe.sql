-- QA PROJ-72–78 Probe (Migration 20261118_qa_proj72_78_fixes muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_s1 uuid; v_s2 uuid; v_teacher uuid; v_q uuid; v_dep uuid; v_n int; v_c0 int; v_c1 int; v_j jsonb; v_t text; r text := '';
BEGIN
  SELECT id INTO v_teacher FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_s1 FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_s2 FROM profiles WHERE role = 'student' AND id <> v_s1 ORDER BY id LIMIT 1;
  SELECT q.id INTO v_q FROM questions q WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private
    AND EXISTS (SELECT 1 FROM answer_options o WHERE o.question_id = q.id) ORDER BY q.id LIMIT 1;
  DELETE FROM exam_sessions WHERE user_id IN (v_s1, v_s2) AND status = 'in_progress';
  DELETE FROM question_reports WHERE question_id = v_q OR reporter_id IN (v_s1, v_s2);
  r := r || format('Vorhanden: teacher=%s s1=%s s2=%s q=%s (alle true)' || E'\n', v_teacher IS NOT NULL, v_s1 IS NOT NULL, v_s2 IS NOT NULL, v_q IS NOT NULL);

  -- T1 (PROJ-72 B5): Lehrer-Rolle darf nicht melden
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  BEGIN PERFORM report_question(v_q, 'veraltet', 'x'); r := r || 'T1 FAIL: Lehrkraft meldet' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T1 ok: %s (FORBIDDEN)' || E'\n', SQLERRM); END;
  RESET ROLE;

  -- T2 (PROJ-73 B2): übernommen + neue Meldung = eine Zeile, Status „offen“
  PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  PERFORM report_question(v_q, 'tippfehler_unklar', 'unklar');
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  PERFORM claim_question_reports(v_q);
  RESET ROLE; PERFORM pg_temp.als(v_s2); SET LOCAL ROLE authenticated;
  PERFORM report_question(v_q, 'veraltet', 'veraltet');
  RESET ROLE;
  SELECT count(*), max(status), max(report_count) INTO v_n, v_t, v_c0 FROM question_report_groups
   WHERE question_id = v_q AND status IN ('offen', 'in_pruefung');
  r := r || format('T2 Zeilen=%s Status=%s Meldungen=%s (1, offen, 2)' || E'\n', v_n, v_t, v_c0);

  -- T3 (PROJ-73 B3): „korrigiert“ ohne Änderung seit der Meldung wird abgelehnt
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  BEGIN PERFORM close_question_reports(v_q, 'korrigiert', 'Danke!'); r := r || 'T3 FAIL: korrigiert ohne Änderung' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3 ok: %s (NO_CHANGE)' || E'\n', SQLERRM); END;
  RESET ROLE;

  -- T4: nach einer Änderung klappt „korrigiert“, mit Belohnung und Verweis auf diese Änderung.
  -- In einer Transaktion ist now() fest: Meldungen deshalb eine Stunde zurückdatieren.
  UPDATE question_reports SET created_at = now() - interval '1 hour' WHERE question_id = v_q;
  PERFORM pg_temp.als(v_teacher);
  UPDATE questions SET explanation = coalesce(explanation, '') || ' ' WHERE id = v_q;
  SELECT coin_balance INTO v_c0 FROM profiles WHERE id = v_s1;
  SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'korrigiert', 'Danke!');
  RESET ROLE;
  SELECT coin_balance INTO v_c1 FROM profiles WHERE id = v_s1;
  SELECT count(*) INTO v_n FROM question_reports qr JOIN content_versions cv ON cv.id = qr.resolved_version_id
   WHERE qr.question_id = v_q AND qr.status = 'korrigiert' AND cv.change_type = 'updated';
  r := r || format('T4 %s, Melder +%s, mit Verweis=%s (closed 2, rewarded 2, +15, 2)' || E'\n', v_j, v_c1 - v_c0, v_n);

  -- T5 (PROJ-74): Auswertung läuft, „geändert“ zählt die Startversion nicht mit
  SELECT department_id INTO v_dep FROM question_reports WHERE question_id = v_q LIMIT 1;
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  SELECT count(*), count(*) FILTER (WHERE last_changed_at IS NOT NULL) INTO v_n, v_c0
    FROM question_difficulty_stats(ARRAY[v_dep], NULL, NULL, NULL);
  RESET ROLE;
  r := r || format('T5 Fragen=%s, davon mit Inhaltsänderung=%s (viele, deutlich weniger als vorher alle)' || E'\n', v_n, v_c0);

  RAISE EXCEPTION 'PROBE-ERGEBNIS%', E'\n' || r;
END
$probe$;
