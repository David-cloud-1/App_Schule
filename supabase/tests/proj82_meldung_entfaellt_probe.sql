-- PROJ-82 Probe: „Frage entfällt“ beim Abschließen (Migration 20261115_proj82_meldung_entfaellt muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_s1 uuid; v_teacher uuid; v_q uuid; v_id uuid; v_n int; v_c0 int; v_c1 int; v_j jsonb; r text := '';
BEGIN
  SELECT id INTO v_teacher FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_s1 FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT q.id INTO v_q FROM questions q WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private
    AND EXISTS (SELECT 1 FROM answer_options o WHERE o.question_id = q.id) ORDER BY q.id LIMIT 1;
  DELETE FROM exam_sessions WHERE user_id = v_s1 AND status = 'in_progress';
  DELETE FROM question_reports WHERE question_id = v_q;
  r := r || format('Vorhanden: teacher=%s s1=%s q=%s (alle true)' || E'\n', v_teacher IS NOT NULL, v_s1 IS NOT NULL, v_q IS NOT NULL);

  -- T1: Lehrkraft schließt mit „entfaellt“ → Status, keine Belohnung
  PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  v_id := report_question(v_q, 'veraltet', 'Frage nicht mehr aktuell');
  RESET ROLE; SELECT coin_balance INTO v_c0 FROM profiles WHERE id = v_s1;
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'entfaellt', 'Die Frage wurde entfernt.');
  r := r || format('T1a entfaellt geschlossen: %s (closed 1, rewarded 0)' || E'\n', v_j);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM question_reports WHERE id = v_id AND status = 'entfaellt' AND reward_coins = 0
    AND resolved_version_id IS NULL AND response_text = 'Die Frage wurde entfernt.' AND closed_at IS NOT NULL;
  r := r || format('T1b Zeile: Status, keine Münzen, keine Verlaufsverknüpfung, Rückmeldung: %s (1)' || E'\n', v_n);
  SELECT coin_balance INTO v_c1 FROM profiles WHERE id = v_s1;
  r := r || format('T1c Münzen des Melders: +%s (0)' || E'\n', v_c1 - v_c0);

  -- T2: erneut schließen ändert nichts
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'entfaellt');
  r := r || format('T2 erneut: %s (closed 0, rewarded 0)' || E'\n', v_j);

  -- T3: ungültiges Ergebnis bleibt abgelehnt
  BEGIN PERFORM close_question_reports(v_q, 'quatsch'); r := r || 'T3 FAIL: ungültiges Ergebnis erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3 ok: %s (INVALID_RESULT)' || E'\n', SQLERRM); END;

  -- T4: Azubi darf nicht schließen
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  BEGIN PERFORM close_question_reports(v_q, 'entfaellt'); r := r || 'T4 FAIL: Azubi schließt' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T4 ok, Azubi darf nicht schließen' || E'\n';
  WHEN OTHERS THEN r := r || format('T4 andere Ablehnung: %s' || E'\n', SQLERRM); END;

  -- T5: „korrigiert“ und „nicht_uebernommen“ funktionieren weiter
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  PERFORM report_question(v_q, 'tippfehler_unklar', 'unklar');
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'nicht_uebernommen', 'Frage ist korrekt.');
  r := r || format('T5 nicht_uebernommen: %s (closed 1, rewarded 0)' || E'\n', v_j);

  RAISE EXCEPTION 'PROBE-ERGEBNIS%', E'\n' || r;
END
$probe$;
